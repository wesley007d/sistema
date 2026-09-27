import { XMLParser } from "fast-xml-parser";

export interface ParsedXmlItem {
  codigo: string | null;
  descricao: string;
  ncm: string | null;
  cfop: string | null;
  unidade: string | null;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
}

export interface ParsedDuplicata {
  numero: string | null;
  vencimento: Date | null;
  valor: number;
}

export interface ParsedXml {
  tipo: "NFE" | "NFSE" | "NFCE" | "DESCONHECIDO";
  chaveAcesso: string | null;
  numero: string | null;
  serie: string | null;
  emitenteNome: string | null;
  emitenteCnpj: string | null;
  destinatarioNome: string | null;
  destinatarioCnpj: string | null;
  dataEmissao: Date | null;
  valorTotal: number;
  items: ParsedXmlItem[];
  /** Parcelas da cobrança (<cobr><dup>) — só NF-e. */
  duplicatas: ParsedDuplicata[];
  /** Códigos tPag do grupo <pag> (01 dinheiro, 15 boleto, 17 PIX…) — só NF-e. */
  formasPagamento: string[];
}

/** Rótulos dos códigos tPag da NF-e. */
export const FORMAS_TPAG: Record<string, string> = {
  "01": "Dinheiro",
  "02": "Cheque",
  "03": "Cartão de crédito",
  "04": "Cartão de débito",
  "05": "Crédito loja",
  "15": "Boleto",
  "16": "Depósito",
  "17": "PIX",
  "18": "Transferência",
  "20": "PIX",
  "90": "Sem pagamento",
  "99": "Outros",
};

// formas que significam que o fornecedor já recebeu no ato da compra
const TPAG_A_VISTA = new Set(["01", "02", "03", "04", "16", "17", "18", "20"]);

/**
 * Sugere como lançar a compra no financeiro a partir do que a nota informa:
 * parcelas na cobrança ou boleto → a pagar; dinheiro/PIX/cartão sem parcelas →
 * já paga; nada informado → a pagar (comportamento antigo, mais seguro).
 */
export function sugestaoPagamento(p: Pick<ParsedXml, "duplicatas" | "formasPagamento">): "PAGO" | "PRAZO" {
  if (p.duplicatas.length > 0) return "PRAZO";
  if (p.formasPagamento.some((f) => f === "05" || f === "15")) return "PRAZO";
  if (p.formasPagamento.some((f) => TPAG_A_VISTA.has(f))) return "PAGO";
  return "PRAZO";
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function n(v: unknown): number {
  const x = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

function s(v: unknown): string | null {
  const x = v == null ? "" : String(v).trim();
  return x === "" ? null : x;
}

/** Faz o parse de um XML de NF-e (modelo 55) ou NFС-e (65). */
export function parseNfeXml(xml: string): ParsedXml {
  const root = parser.parse(xml);

  // nfeProc > NFe > infNFe   |   NFe > infNFe   |   procNFe...
  const infNFe =
    root?.nfeProc?.NFe?.infNFe ??
    root?.NFe?.infNFe ??
    root?.nfeProc?.NFe?.[0]?.infNFe;

  if (infNFe) {
    const ide = infNFe.ide ?? {};
    const emit = infNFe.emit ?? {};
    const dest = infNFe.dest ?? {};
    const total = infNFe.total?.ICMSTot ?? {};
    const chave =
      s(infNFe["@_Id"])?.replace(/^NFe/, "") ??
      s(root?.nfeProc?.protNFe?.infProt?.chNFe);

    const items: ParsedXmlItem[] = asArray(infNFe.det).map((d: Record<string, unknown>) => {
      const prod = (d.prod ?? {}) as Record<string, unknown>;
      return {
        codigo: s(prod.cProd),
        descricao: String(prod.xProd ?? "Item"),
        ncm: s(prod.NCM),
        cfop: s(prod.CFOP),
        unidade: s(prod.uCom),
        quantidade: n(prod.qCom),
        valorUnit: n(prod.vUnCom),
        valorTotal: n(prod.vProd),
      };
    });

    const duplicatas: ParsedDuplicata[] = asArray(infNFe.cobr?.dup)
      .map((d: Record<string, unknown>) => ({
        numero: s(d.nDup),
        vencimento: parseDate(d.dVenc ? `${String(d.dVenc)}T12:00:00` : null),
        valor: n(d.vDup),
      }))
      .filter((d) => d.valor > 0);
    // NF-e 4.0: <pag><detPag><tPag>; versões antigas: <pag><tPag>
    const formasPagamento = asArray(infNFe.pag)
      .flatMap((pg: Record<string, unknown>) =>
        pg.detPag ? asArray(pg.detPag as Record<string, unknown>[]) : [pg],
      )
      .map((dp: Record<string, unknown>) => s(dp.tPag))
      .filter((t): t is string => t !== null);

    return {
      tipo: String(ide.mod ?? "55") === "65" ? "NFCE" : "NFE",
      chaveAcesso: chave ?? null,
      numero: s(ide.nNF),
      serie: s(ide.serie),
      emitenteNome: s(emit.xNome),
      emitenteCnpj: s(emit.CNPJ ?? emit.CPF),
      destinatarioNome: s(dest.xNome),
      destinatarioCnpj: s(dest.CNPJ ?? dest.CPF),
      dataEmissao: parseDate(ide.dhEmi ?? ide.dEmi),
      valorTotal: n(total.vNF),
      items,
      duplicatas,
      formasPagamento,
    };
  }

  // NFS-e (padrao ABRASF, variacoes por municipio)
  const nfse =
    root?.CompNfse?.Nfse?.InfNfse ??
    root?.ConsultarNfseResposta?.ListaNfse?.CompNfse?.Nfse?.InfNfse ??
    root?.Nfse?.InfNfse;

  if (nfse) {
    const prest = nfse.PrestadorServico ?? {};
    const tom = nfse.TomadorServico ?? {};
    const servicos = asArray(nfse.ListaServicos?.Servico ?? nfse.Servico);
    const valores = nfse.ValoresNfse ?? nfse.Servico?.Valores ?? {};
    return {
      tipo: "NFSE",
      chaveAcesso: s(nfse.CodigoVerificacao),
      numero: s(nfse.Numero),
      serie: null,
      emitenteNome: s(prest.RazaoSocial),
      emitenteCnpj: s(prest.IdentificacaoPrestador?.Cnpj),
      destinatarioNome: s(tom.RazaoSocial),
      destinatarioCnpj: s(
        tom.IdentificacaoTomador?.CpfCnpj?.Cnpj ??
          tom.IdentificacaoTomador?.CpfCnpj?.Cpf ??
          tom.IdentificacaoTomador?.CpfCnpj,
      ),
      dataEmissao: parseDate(nfse.DataEmissao),
      valorTotal: n(valores.ValorLiquidoNfse ?? valores.ValorServicos),
      items: servicos.map((sv: Record<string, unknown>) => ({
        codigo: s(sv.ItemListaServico),
        descricao: String(sv.Discriminacao ?? "Servico"),
        ncm: null,
        cfop: null,
        unidade: "UN",
        quantidade: n(sv.Quantidade) || 1,
        valorUnit: n(sv.ValorUnitario) || n(sv.ValorServico),
        valorTotal: n(sv.ValorServico),
      })),
      duplicatas: [],
      formasPagamento: [],
    };
  }

  return {
    tipo: "DESCONHECIDO",
    chaveAcesso: null,
    numero: null,
    serie: null,
    emitenteNome: null,
    emitenteCnpj: null,
    destinatarioNome: null,
    destinatarioCnpj: null,
    dataEmissao: null,
    valorTotal: 0,
    items: [],
    duplicatas: [],
    formasPagamento: [],
  };
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}
