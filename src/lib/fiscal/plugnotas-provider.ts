import type { Company, Invoice } from "@prisma/client";
import { onlyDigits } from "@/lib/format";
import type {
  CancelResult,
  EmitResult,
  FiscalProvider,
  InvoiceFull,
} from "./types";

/**
 * Integração com a API da PlugNotas (https://docs.plugnotas.com.br).
 * A PlugNotas cuida da assinatura digital (certificado A1), transmissão à SEFAZ
 * e às prefeituras. Para ativar:
 *   1. FISCAL_PROVIDER=plugnotas  (.env)
 *   2. PLUGNOTAS_TOKEN=<seu token>
 *   3. PLUGNOTAS_API_URL=https://api.sandbox.plugnotas.com.br  (sandbox p/ testes)
 *   4. Cadastre a empresa + certificado A1 no painel da PlugNotas.
 *
 * ── Emissão é ASSÍNCRONA ──────────────────────────────────────────────────────
 * O POST apenas enfileira a nota e devolve um `id`. A autorização vem depois.
 * Aqui fazemos alguns "polls" (consultas) logo após o envio; se ainda não houver
 * desfecho, devolvemos `PROCESSANDO` + `idExterno` e a aplicação reconsulta
 * mais tarde via `consultar()` (botão "Consultar situação" na tela da nota).
 *
 * ── Mapeamento de payload ─────────────────────────────────────────────────────
 * Os builders abaixo cobrem o caso comum (Simples Nacional, venda dentro do
 * estado). Campos que dependem da configuração tributária real da empresa/produto
 * estão marcados com TODO — validar no sandbox antes de produção.
 */
export class PlugNotasProvider implements FiscalProvider {
  readonly name = "plugnotas";

  private get baseUrl(): string {
    return (
      process.env.PLUGNOTAS_API_URL ?? "https://api.sandbox.plugnotas.com.br"
    ).replace(/\/+$/, "");
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": process.env.PLUGNOTAS_TOKEN ?? "",
    };
  }

  private get pollTries(): number {
    return clampInt(process.env.PLUGNOTAS_POLL_TRIES, 5, 0, 20);
  }

  private get pollIntervalMs(): number {
    return clampInt(process.env.PLUGNOTAS_POLL_INTERVALO_MS, 1500, 200, 10000);
  }

  private ensureToken(): string | null {
    if (!process.env.PLUGNOTAS_TOKEN)
      return "PLUGNOTAS_TOKEN não configurado (.env).";
    return null;
  }

  // ── NF-e / NFC-e ───────────────────────────────────────────────────────────
  async emitNfe(invoice: InvoiceFull, company: Company): Promise<EmitResult> {
    const err = this.ensureToken();
    if (err) return { status: "REJEITADA", motivoRejeicao: err };

    const kind = invoice.tipo === "NFCE" ? "nfce" : "nfe";
    const payload = mapNfePayload(invoice, company, kind === "nfce");
    return this.enviarEConsultar(kind, invoice.id, payload);
  }

  // ── NFS-e ──────────────────────────────────────────────────────────────────
  async emitNfse(invoice: InvoiceFull, company: Company): Promise<EmitResult> {
    const err = this.ensureToken();
    if (err) return { status: "REJEITADA", motivoRejeicao: err };

    const payload = mapNfsePayload(invoice, company);
    return this.enviarEConsultar("nfse", invoice.id, payload);
  }

  // ── Reconsulta de nota em PROCESSANDO ──────────────────────────────────────
  async consultar(invoice: Invoice): Promise<EmitResult> {
    const err = this.ensureToken();
    if (err) return { status: "REJEITADA", motivoRejeicao: err };

    const kind = kindOf(invoice.tipo);
    // Preferimos o id do provedor; sem ele, a PlugNotas também aceita consultar
    // pelo idIntegração que enviamos (o id da nossa Invoice).
    const ref = invoice.idExterno || invoice.id;
    return this.consultarSituacao(kind, ref);
  }

  // ── Cancelamento ──────────────────────────────────────────────────────────
  async cancel(invoice: Invoice, motivo: string): Promise<CancelResult> {
    const err = this.ensureToken();
    if (err) return { status: "REJEITADA", motivoRejeicao: err };

    const kind = kindOf(invoice.tipo);
    const ref = invoice.idExterno || invoice.chaveAcesso || invoice.id;
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/${kind}/${ref}/cancelamento`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ justificativa: motivo }),
        cache: "no-store",
      });
    } catch (e) {
      return {
        status: "REJEITADA",
        motivoRejeicao: `Falha de comunicação com a PlugNotas: ${errMsg(e)}`,
      };
    }

    const data = await safeJson(res);
    if (!res.ok) {
      return {
        status: "REJEITADA",
        motivoRejeicao: extractMessage(data) ?? `HTTP ${res.status}`,
      };
    }

    // Cancelamento também é assíncrono: confirmamos com algumas consultas.
    for (let restantes = this.pollTries; restantes > 0; restantes -= 1) {
      await sleep(this.pollIntervalMs);
      const situacao = await this.consultarSituacao(kind, ref);
      if (situacao.status === "REJEITADA")
        return { status: "REJEITADA", motivoRejeicao: situacao.motivoRejeicao };
      // `consultarSituacao` devolve AUTORIZADA quando a SEFAZ registrou o
      // evento de cancelamento (situação CANCELADO é tratada como desfecho ok).
      if (situacao.status === "AUTORIZADA")
        return { status: "CANCELADA", protocolo: situacao.protocolo };
    }
    // Pedido aceito pela PlugNotas mas ainda sem confirmação da SEFAZ.
    return { status: "CANCELADA", protocolo: extractProtocolo(data) };
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /** POST na PlugNotas + algumas consultas de acompanhamento. */
  private async enviarEConsultar(
    kind: FiscalKind,
    idIntegracao: string,
    payload: unknown,
  ): Promise<EmitResult> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/${kind}`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify([payload]),
        cache: "no-store",
      });
    } catch (e) {
      return {
        status: "REJEITADA",
        motivoRejeicao: `Falha de comunicação com a PlugNotas: ${errMsg(e)}`,
      };
    }

    const data = await safeJson(res);
    if (!res.ok) {
      return {
        status: "REJEITADA",
        motivoRejeicao: extractMessage(data) ?? `HTTP ${res.status}`,
      };
    }

    const idExterno = extractDocId(data) ?? undefined;
    // Sem id de rastreio não há como reconsultar depois — tratamos como
    // resposta imediata (algumas contas retornam o desfecho já no POST).
    const imediato = normalizeSituacao(data, kind, idExterno);
    if (imediato && imediato.status !== "PROCESSANDO") return imediato;

    if (!idExterno) {
      return imediato ?? { status: "PROCESSANDO" };
    }

    for (let restantes = this.pollTries; restantes > 0; restantes -= 1) {
      await sleep(this.pollIntervalMs);
      const r = await this.consultarSituacao(kind, idExterno);
      if (r.status !== "PROCESSANDO") return r;
    }
    return { status: "PROCESSANDO", idExterno };
  }

  /** GET /{kind}/consulta/{ref} — ref = id da PlugNotas, chave ou idIntegração. */
  private async consultarSituacao(
    kind: FiscalKind,
    ref: string,
  ): Promise<EmitResult> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/${kind}/consulta/${ref}`, {
        method: "GET",
        headers: this.headers,
        cache: "no-store",
      });
    } catch (e) {
      // Blip de rede na consulta não invalida a nota: segue em PROCESSANDO.
      return { status: "PROCESSANDO", idExterno: ref, motivoRejeicao: errMsg(e) };
    }

    const data = await safeJson(res);
    if (!res.ok) {
      // 404 logo após o envio costuma ser "ainda processando na fila".
      if (res.status === 404) return { status: "PROCESSANDO", idExterno: ref };
      return {
        status: "REJEITADA",
        motivoRejeicao: extractMessage(data) ?? `HTTP ${res.status}`,
      };
    }

    const norm = normalizeSituacao(data, kind, ref);
    return norm ?? { status: "PROCESSANDO", idExterno: ref };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalização de resposta
// ─────────────────────────────────────────────────────────────────────────────

type FiscalKind = "nfe" | "nfce" | "nfse";

function kindOf(tipo: string): FiscalKind {
  if (tipo === "NFSE") return "nfse";
  if (tipo === "NFCE") return "nfce";
  return "nfe";
}

/** A PlugNotas responde ora como objeto, ora como array de 1 documento. */
function firstDoc(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown>) ?? null;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.documents) && o.documents.length)
      return o.documents[0] as Record<string, unknown>;
    return o;
  }
  return null;
}

function extractDocId(data: unknown): string | null {
  const d = firstDoc(data);
  if (!d) return null;
  return (
    str(d.id) ??
    str(d._id) ??
    str(d.idIntegracao) ??
    str((d.documento as Record<string, unknown> | undefined)?.id) ??
    null
  );
}

function extractMessage(data: unknown): string | null {
  const d = firstDoc(data);
  if (!d) return null;
  const erros = d.error ?? d.erros ?? d.errors;
  if (Array.isArray(erros) && erros.length) {
    const e0 = erros[0] as Record<string, unknown> | string;
    if (typeof e0 === "string") return e0;
    return (
      str(e0.message) ??
      str(e0.mensagem) ??
      str(e0.descricao) ??
      JSON.stringify(e0)
    );
  }
  if (erros && typeof erros === "object") {
    const eo = erros as Record<string, unknown>;
    const msg = str(eo.message) ?? str(eo.mensagem);
    if (msg) return msg;
  }
  return (
    str(d.message) ??
    str(d.mensagem) ??
    str(d.motivo) ??
    str(d.motivoStatus) ??
    null
  );
}

function extractProtocolo(data: unknown): string | undefined {
  const d = firstDoc(data);
  if (!d) return undefined;
  const aut = (d.autorizacao ?? d.protocolo) as
    | Record<string, unknown>
    | string
    | undefined;
  if (typeof aut === "string") return aut;
  return (
    str(d.protocolo) ??
    str(aut?.protocolo) ??
    str(aut?.numeroProtocolo) ??
    str(d.numeroProtocolo) ??
    undefined
  );
}

function extractChave(d: Record<string, unknown>): string | undefined {
  const aut = d.autorizacao as Record<string, unknown> | undefined;
  return (
    str(d.chave) ??
    str(d.chaveAcesso) ??
    str(d.chaveNFe) ??
    str(aut?.chave) ??
    str(aut?.chaveAcesso) ??
    // NFS-e: o "código de verificação" faz o papel da chave
    str(d.codigoVerificacao) ??
    str((d.nfse as Record<string, unknown> | undefined)?.codigoVerificacao) ??
    undefined
  );
}

/**
 * Converte a "situação" da PlugNotas no nosso EmitResult.
 * Situações conhecidas: CONCLUIDO / AUTORIZADO (ok), REJEITADO / DENEGADO / ERRO
 * (recusa), PROCESSANDO / PENDENTE / EM_PROCESSAMENTO (aguardando),
 * CANCELADO (tratado como desfecho ok — usado pelo fluxo de cancelamento).
 */
function normalizeSituacao(
  data: unknown,
  kind: FiscalKind,
  idExterno?: string,
): EmitResult | null {
  const d = firstDoc(data);
  if (!d) return null;

  const raw =
    str(d.situacao) ??
    str(d.status) ??
    str((d.documento as Record<string, unknown> | undefined)?.status) ??
    "";
  const s = raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[\s-]+/g, "_");

  const okSet = ["CONCLUIDO", "AUTORIZADO", "AUTORIZADA", "CANCELADO", "REGISTRADO"];
  const rejSet = ["REJEITADO", "REJEITADA", "DENEGADO", "DENEGADA", "ERRO", "ERRO_AUTORIZACAO"];
  const procSet = ["PROCESSANDO", "PENDENTE", "EM_PROCESSAMENTO", "PROCESSANDO_AUTORIZACAO", "NA_FILA", "FILA"];

  if (rejSet.includes(s)) {
    return {
      status: "REJEITADA",
      motivoRejeicao: extractMessage(data) ?? `Nota ${raw.toLowerCase()}`,
      idExterno,
    };
  }

  if (okSet.includes(s)) {
    return {
      status: "AUTORIZADA",
      chaveAcesso: extractChave(d),
      protocolo: extractProtocolo(data),
      xml: pickXml(d),
      idExterno,
    };
  }

  if (procSet.includes(s) || s === "") {
    return { status: "PROCESSANDO", idExterno };
  }

  // Situação desconhecida: não arriscamos marcar autorizada/rejeitada.
  return { status: "PROCESSANDO", idExterno };
}

/**
 * A PlugNotas devolve o XML ora inline, ora como URL em `arquivos.xml`.
 * Quando vier URL, deixamos a aplicação seguir sem o XML (ele pode ser baixado
 * depois); guardar a URL já ajuda no rastreio.
 */
function pickXml(d: Record<string, unknown>): string | undefined {
  const arquivos = d.arquivos as Record<string, unknown> | undefined;
  const candidato =
    str(d.xml) ??
    str(d.xmlNota) ??
    str(arquivos?.xml) ??
    str((d.nfse as Record<string, unknown> | undefined)?.xml);
  if (!candidato) return undefined;
  const t = candidato.trim();
  if (t.startsWith("<")) return t; // XML inline
  return undefined; // URL — não é o conteúdo do XML
}

// ─────────────────────────────────────────────────────────────────────────────
// Builders de payload
// ─────────────────────────────────────────────────────────────────────────────

function ambienteOf(company: Company): "homologacao" | "producao" {
  const amb = (company.ambienteFiscal || process.env.FISCAL_AMBIENTE || "HOMOLOGACAO")
    .toString()
    .toUpperCase();
  return amb === "PRODUCAO" ? "producao" : "homologacao";
}

function endereco(p: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  codMunicipio?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
}) {
  return {
    logradouro: p.logradouro ?? "",
    numero: p.numero ?? "S/N",
    bairro: p.bairro ?? "",
    codigoCidade: onlyDigits(p.codMunicipio ?? "") || undefined,
    descricaoCidade: p.municipio ?? "",
    estado: p.uf ?? "",
    cep: onlyDigits(p.cep ?? ""),
    pais: "Brasil",
  };
}

/**
 * Payload NF-e / NFC-e. Referência: https://docs.plugnotas.com.br/#nfe
 * TODO(sandbox): revisar `tributos` conforme regime da empresa e a tributação
 * cadastrada em cada produto (hoje assume Simples Nacional, CSOSN 102 / CST PIS
 * e COFINS 07). Para CRT 3 (regime normal) a PlugNotas espera ICMS com `cst`,
 * base de cálculo e alíquota.
 */
function mapNfePayload(
  invoice: InvoiceFull,
  company: Company,
  nfce: boolean,
) {
  const simples = company.crt !== 3;

  const itens = invoice.items.map((it, i) => {
    const icms = simples
      ? { origem: "0", csosn: it.cstIcms ?? "102" }
      : {
          origem: "0",
          cst: it.cstIcms ?? "00",
          // TODO(sandbox): base/alíquota reais quando houver ICMS destacado
          baseCalculo: it.valorTotal,
          aliquota: it.aliquotaIcms ?? 0,
          valor: it.valorIcms ?? 0,
        };
    return {
      numeroItem: i + 1,
      codigo: it.codigo,
      descricao: it.descricao,
      ncm: onlyDigits(it.ncm ?? "") || "00000000",
      cfop: it.cfop,
      unidadeComercial: it.unidade,
      quantidadeComercial: it.quantidade,
      valorUnitarioComercial: it.valorUnit,
      valorBruto: round2(it.quantidade * it.valorUnit),
      unidadeTributavel: it.unidade,
      quantidadeTributavel: it.quantidade,
      valorUnitarioTributavel: it.valorUnit,
      valorDesconto: it.desconto ?? 0,
      tributos: {
        icms,
        pis: { cst: "07" },
        cofins: { cst: "07" },
      },
    };
  });

  const destinatario = invoice.partner
    ? {
        cpfCnpj: onlyDigits(invoice.partner.cpfCnpj ?? "") || undefined,
        nomeRazaoSocial: invoice.partner.nome,
        inscricaoEstadual: onlyDigits(invoice.partner.rgIe ?? "") || undefined,
        email: invoice.partner.email ?? undefined,
        indicadorInscricaoEstadual: Number(invoice.partner.indicadorIe ?? "9"),
        endereco: endereco(invoice.partner),
      }
    : undefined;

  return {
    idIntegracao: invoice.id,
    serie: invoice.serie,
    numero: invoice.numero,
    ambiente: ambienteOf(company),
    natureza: invoice.naturezaOperacao,
    tipoOperacao: "1", // saída
    finalidade: "1", // normal
    consumidorFinal: "1",
    presencaComprador: "1", // operação presencial (balcão)
    emitente: { cpfCnpj: onlyDigits(company.cnpj) },
    destinatario,
    itens,
    // TODO(sandbox): mapear as formas de pagamento reais da venda vinculada
    // (invoice.saleId → SalePayment). 01=dinheiro, 03=cartão crédito,
    // 04=cartão débito, 17=PIX, 99=outros.
    pagamentos: [
      { aVista: true, meio: nfce ? "01" : "99", valor: invoice.valorTotal },
    ],
    informacoesComplementares:
      ambienteOf(company) === "homologacao"
        ? "EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
        : undefined,
  };
}

/**
 * Payload NFS-e. Referência: https://docs.plugnotas.com.br/#nfse
 * TODO(sandbox): `servico.codigo` / `codigoTributacao` e os campos de `iss`
 * variam por município — ajustar conforme o cadastro do serviço e a prefeitura
 * da empresa.
 */
function mapNfsePayload(invoice: InvoiceFull, company: Company) {
  const servico = invoice.serviceItems.map((s) => ({
    codigo: onlyDigits(s.itemListaServico ?? "") || undefined,
    codigoTributacao: onlyDigits(s.itemListaServico ?? "") || undefined,
    discriminacao: s.descricao,
    quantidade: s.quantidade,
    valorUnitario: s.valorUnit,
    iss: {
      // 1=exigível — TODO(sandbox): revisar por município
      exigibilidade: 1,
      retido: s.issRetido,
    },
    valor: {
      servico: s.valorTotal,
      aliquota: s.aliquotaIss ?? 0,
      iss: s.valorIss ?? 0,
      issRetido: s.issRetido,
      descontoIncondicionado: 0,
      deducoes: 0,
    },
  }));

  return {
    idIntegracao: invoice.id,
    ambiente: ambienteOf(company),
    prestador: {
      cpfCnpj: onlyDigits(company.cnpj),
      inscricaoMunicipal: onlyDigits(company.im ?? "") || undefined,
    },
    tomador: invoice.partner
      ? {
          cpfCnpj: onlyDigits(invoice.partner.cpfCnpj ?? "") || undefined,
          razaoSocial: invoice.partner.nome,
          email: invoice.partner.email ?? undefined,
          endereco: endereco(invoice.partner),
        }
      : undefined,
    servico,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clampInt(
  raw: string | undefined,
  def: number,
  min: number,
  max: number,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function str(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
