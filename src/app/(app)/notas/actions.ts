"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDbAnyPermission, requireDbPermission } from "@/lib/auth";
import { nextSeq } from "@/lib/seq";
import { optStr, str } from "@/lib/format";
import { parseArrayJson, zIdOpc, zMoeda, zQtd } from "@/lib/parse-json";
import { getFiscalProvider } from "@/lib/fiscal";
import type { EmitResult, InvoiceFull } from "@/lib/fiscal/types";
import type { ScopedDb } from "@/lib/tenant-db";

const prodRowSchema = z.object({
  productId: zIdOpc,
  codigo: z.string().max(60).optional(),
  descricao: z.string().max(300),
  ncm: z.string().max(20).nullish(),
  cfop: z.string().max(10).optional(),
  unidade: z.string().max(10).optional(),
  quantidade: zQtd,
  precoUnit: zMoeda,
  desconto: zMoeda.optional(),
});
const servRowSchema = z.object({
  serviceId: zIdOpc,
  descricao: z.string().max(300),
  itemListaServico: z.string().max(20).nullish(),
  quantidade: zQtd,
  precoUnit: zMoeda,
  aliquotaIss: z.number().finite().gte(0).lte(100).optional(),
  issRetido: z.boolean().optional(),
});

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Cria uma NF-e (produtos) em RASCUNHO */
export async function createNfe(formData: FormData) {
  const { user, db } = await requireDbPermission("notas");
  const rows = parseArrayJson(str(formData.get("itens")), prodRowSchema, "itens");
  if (rows.length === 0) throw new Error("Adicione ao menos um produto.");
  const partnerId = optStr(formData.get("partnerId"));
  const natureza = str(formData.get("naturezaOperacao")) || "Venda de mercadoria";
  const emitirAgora = str(formData.get("emitir")) === "1";
  const company = await db.company.findUniqueOrThrow({ where: { id: user.companyId } });

  let valorProdutos = 0;
  let valorDesconto = 0;
  const items = rows.map((r) => {
    const bruto = round(r.quantidade * r.precoUnit);
    const desc = round(r.desconto ?? 0);
    const total = round(bruto - desc);
    valorProdutos += bruto;
    valorDesconto += desc;
    return {
      productId: r.productId ?? null,
      codigo: r.codigo ?? "SEM-COD",
      descricao: r.descricao,
      ncm: r.ncm ?? null,
      cfop: r.cfop ?? "5102",
      unidade: r.unidade ?? "UN",
      quantidade: r.quantidade,
      valorUnit: r.precoUnit,
      desconto: desc,
      valorTotal: total,
      cstIcms: "102",
      aliquotaIcms: 0,
      valorIcms: 0,
    };
  });
  const valorTotal = round(valorProdutos - valorDesconto);

  const invoice = await db.$transaction(async (tx) => {
    const numero = await nextSeq(tx, user.companyId, `nfe-serie-${company.serieNFe}`);
    return tx.invoice.create({
      data: {
        companyId: user.companyId,
        tipo: "NFE",
        numero,
        serie: company.serieNFe,
        status: "RASCUNHO",
        ambiente: company.ambienteFiscal,
        naturezaOperacao: natureza,
        partnerId,
        valorProdutos: round(valorProdutos),
        valorDesconto: round(valorDesconto),
        valorTotal,
        items: { create: items.map((it) => ({ ...it, companyId: user.companyId })) },
      },
    });
  });

  if (emitirAgora) {
    await emitInvoice(invoice.id);
  }
  revalidatePath("/notas");
  redirect(`/notas/${invoice.id}`);
}

/** Cria uma NFS-e (serviços) em RASCUNHO */
export async function createNfse(formData: FormData) {
  const { user, db } = await requireDbPermission("notas");
  const rows = parseArrayJson(str(formData.get("itens")), servRowSchema, "itens");
  if (rows.length === 0) throw new Error("Adicione ao menos um serviço.");
  const partnerId = optStr(formData.get("partnerId"));
  const emitirAgora = str(formData.get("emitir")) === "1";
  const company = await db.company.findUniqueOrThrow({ where: { id: user.companyId } });

  let valorServicos = 0;
  let valorIss = 0;
  const serviceItems = rows.map((r) => {
    const total = round(r.quantidade * r.precoUnit);
    const iss = round((total * (r.aliquotaIss ?? 0)) / 100);
    valorServicos += total;
    valorIss += iss;
    return {
      serviceId: r.serviceId ?? null,
      descricao: r.descricao,
      itemListaServico: r.itemListaServico ?? null,
      quantidade: r.quantidade,
      valorUnit: r.precoUnit,
      valorTotal: total,
      aliquotaIss: r.aliquotaIss ?? 0,
      valorIss: iss,
      issRetido: r.issRetido ?? false,
    };
  });
  const valorTotal = round(valorServicos);

  const invoice = await db.$transaction(async (tx) => {
    const numero = await nextSeq(tx, user.companyId, `nfse-serie-${company.serieNFSe}`);
    return tx.invoice.create({
      data: {
        companyId: user.companyId,
        tipo: "NFSE",
        numero,
        serie: company.serieNFSe,
        status: "RASCUNHO",
        ambiente: company.ambienteFiscal,
        naturezaOperacao: "Prestação de serviço",
        partnerId,
        valorServicos: round(valorServicos),
        valorIss: round(valorIss),
        valorTotal,
        serviceItems: {
          create: serviceItems.map((it) => ({ ...it, companyId: user.companyId })),
        },
      },
    });
  });

  if (emitirAgora) {
    await emitInvoice(invoice.id);
  }
  revalidatePath("/notas");
  redirect(`/notas/${invoice.id}`);
}

/** Transmite a nota ao provedor fiscal e atualiza o status */
export async function emitInvoice(id: string) {
  // Emitir também faz parte do fluxo de venda (checkbox "emitir NF-e" no PDV),
  // por isso aceita quem tem `vendas` além de `notas`.
  const { user, db } = await requireDbAnyPermission(["notas", "vendas"]);
  const invoice = (await db.invoice.findUniqueOrThrow({
    where: { id },
    include: { partner: true, items: true, serviceItems: true },
  })) as InvoiceFull;

  if (invoice.status === "AUTORIZADA") return;

  const company = await db.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const provider = getFiscalProvider();

  await db.invoice.update({ where: { id }, data: { status: "PROCESSANDO" } });

  const result =
    invoice.tipo === "NFSE"
      ? await provider.emitNfse(invoice, company)
      : await provider.emitNfe(invoice, company);

  await tratarResultadoEmissao(db, user, invoice, company, result);

  revalidatePath(`/notas/${id}`);
  revalidatePath("/notas");
  revalidatePath("/");
}

/**
 * Reconsulta uma nota que ficou em PROCESSANDO (emissão assíncrona da PlugNotas).
 * Chamada pelo botão "Consultar situação" na tela da nota.
 */
export async function consultarInvoice(id: string) {
  const { user, db } = await requireDbAnyPermission(["notas", "vendas"]);
  const invoice = (await db.invoice.findUniqueOrThrow({
    where: { id },
    include: { partner: true, items: true, serviceItems: true },
  })) as InvoiceFull;

  if (invoice.status !== "PROCESSANDO") {
    revalidatePath(`/notas/${id}`);
    return;
  }

  const provider = getFiscalProvider();
  if (!provider.consultar)
    throw new Error(
      "O provedor fiscal atual não suporta consulta de situação. Reenvie a nota.",
    );

  const company = await db.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const result = await provider.consultar(invoice);

  await tratarResultadoEmissao(db, user, invoice, company, result);

  revalidatePath(`/notas/${id}`);
  revalidatePath("/notas");
  revalidatePath("/");
}

/** Aplica o desfecho da emissão (autorizada / rejeitada / ainda processando). */
async function tratarResultadoEmissao(
  db: ScopedDb,
  user: { companyId: string },
  invoice: InvoiceFull,
  company: { razaoSocial: string; cnpj: string },
  result: EmitResult,
) {
  const id = invoice.id;

  if (result.status === "REJEITADA") {
    await db.invoice.update({
      where: { id },
      data: {
        status: "REJEITADA",
        motivoRejeicao: result.motivoRejeicao ?? "Rejeitada",
        idExterno: result.idExterno ?? undefined,
      },
    });
    return;
  }

  if (result.status === "PROCESSANDO") {
    await db.invoice.update({
      where: { id },
      data: {
        status: "PROCESSANDO",
        idExterno: result.idExterno ?? undefined,
        protocolo: result.protocolo ?? undefined,
      },
    });
    return;
  }

  await aplicarAutorizacao(db, user, invoice, company, result);
}

/** Efeitos colaterais de uma nota AUTORIZADA (idempotente). */
async function aplicarAutorizacao(
  db: ScopedDb,
  user: { companyId: string },
  invoice: InvoiceFull,
  company: { razaoSocial: string; cnpj: string },
  result: EmitResult,
) {
  const id = invoice.id;

  await db.$transaction(async (tx) => {
    const atual = await tx.invoice.findUniqueOrThrow({ where: { id } });
    if (atual.status === "AUTORIZADA") return; // já aplicado
    await tx.invoice.update({
      where: { id },
      data: {
        status: "AUTORIZADA",
        chaveAcesso: result.chaveAcesso ?? null,
        protocolo: result.protocolo ?? null,
        xml: result.xml ?? null,
        motivoRejeicao: null,
        emitidaEm: new Date(),
      },
    });

    // Registra o XML gerado
    if (result.xml) {
      await tx.xmlDocument.create({
        data: {
          companyId: user.companyId,
          direcao: "SAIDA",
          tipo: invoice.tipo,
          chaveAcesso: result.chaveAcesso ?? null,
          numero: String(invoice.numero),
          serie: String(invoice.serie),
          emitenteNome: company.razaoSocial,
          emitenteCnpj: company.cnpj,
          destinatarioNome: invoice.partner?.nome ?? null,
          destinatarioCnpj: invoice.partner?.cpfCnpj ?? null,
          dataEmissao: new Date(),
          valorTotal: invoice.valorTotal,
          status: "LANCADO",
          conteudo: result.xml,
          invoiceId: invoice.id,
        },
      });
    }

    // Baixa de estoque para NF-e de produto (pulada quando a OS já controla o estoque)
    if (invoice.tipo === "NFE" && invoice.baixaEstoque) {
      for (const it of invoice.items) {
        if (!it.productId) continue;
        const p = await tx.product.findUnique({ where: { id: it.productId } });
        if (!p) continue;
        const saldo = p.estoque - it.quantidade;
        await tx.product.update({ where: { id: p.id }, data: { estoque: saldo } });
        await tx.stockMovement.create({
          data: {
            companyId: user.companyId,
            productId: p.id,
            tipo: "SAIDA",
            quantidade: it.quantidade,
            custoUnit: p.precoCusto,
            saldoApos: saldo,
            origem: "NFE",
            origemId: invoice.id,
            observacao: `NF-e ${invoice.numero}`,
          },
        });
      }
    }

    // Conta a receber
    await tx.financialEntry.create({
      data: {
        companyId: user.companyId,
        tipo: "RECEBER",
        status: "ABERTO",
        descricao: `${invoice.tipo} nº ${invoice.numero}`,
        categoria: invoice.tipo === "NFSE" ? "Serviços" : "Vendas",
        partnerId: invoice.partnerId,
        valor: invoice.valorTotal,
        vencimento: new Date(),
      },
    });
  });
}

/** Cancela uma nota autorizada e estorna estoque/financeiro */
export async function cancelInvoice(id: string, formData: FormData) {
  const { user, db } = await requireDbPermission("notas");
  const motivo = str(formData.get("motivo")) || "Cancelamento solicitado pelo emitente";
  if (motivo.length < 15)
    throw new Error("A justificativa deve ter ao menos 15 caracteres.");

  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id },
    include: { items: true },
  });
  if (invoice.status !== "AUTORIZADA")
    throw new Error("Somente notas autorizadas podem ser canceladas.");

  const provider = getFiscalProvider();
  const result = await provider.cancel(invoice, motivo);
  if (result.status === "REJEITADA")
    throw new Error(result.motivoRejeicao ?? "Cancelamento rejeitado.");

  await db.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id },
      data: {
        status: "CANCELADA",
        motivoCancelamento: motivo,
        canceladaEm: new Date(),
      },
    });
    // estorna estoque (apenas se esta nota baixou estoque)
    if (invoice.tipo === "NFE" && invoice.baixaEstoque) {
      for (const it of invoice.items) {
        if (!it.productId) continue;
        const p = await tx.product.findUnique({ where: { id: it.productId } });
        if (!p) continue;
        const saldo = p.estoque + it.quantidade;
        await tx.product.update({ where: { id: p.id }, data: { estoque: saldo } });
        await tx.stockMovement.create({
          data: {
            companyId: user.companyId,
            productId: p.id,
            tipo: "ENTRADA",
            quantidade: it.quantidade,
            custoUnit: p.precoCusto,
            saldoApos: saldo,
            origem: "DEVOLUCAO",
            origemId: invoice.id,
            observacao: `Cancelamento NF nº ${invoice.numero}`,
          },
        });
      }
    }
    await tx.financialEntry.updateMany({
      where: { descricao: `${invoice.tipo} nº ${invoice.numero}`, status: "ABERTO" },
      data: { status: "CANCELADO" },
    });
    await tx.xmlDocument.updateMany({
      where: { invoiceId: id },
      data: { status: "IGNORADO" },
    });
  });

  revalidatePath(`/notas/${id}`);
  revalidatePath("/notas");
}

export async function deleteDraft(id: string) {
  const { db } = await requireDbPermission("notas");
  const invoice = await db.invoice.findUniqueOrThrow({ where: { id } });
  if (invoice.status !== "RASCUNHO" && invoice.status !== "REJEITADA")
    throw new Error("Só é possível excluir rascunhos ou notas rejeitadas.");
  await db.invoice.delete({ where: { id } });
  revalidatePath("/notas");
  redirect("/notas");
}
