"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nextSeq } from "@/lib/seq";
import { optStr, parseNumber, str } from "@/lib/format";
import { parseArrayJson, zIdOpc, zMoeda, zQtd } from "@/lib/parse-json";
import { calcPagamento } from "@/lib/pagamento";
import {
  can,
  requireDbAdmin,
  requireDbAnyPermission,
  requireDbPermission,
} from "@/lib/auth";

/** vendedor (pdv) OU operador de caixa (vendas). */
const PDV_OU_CAIXA = ["vendas", "pdv"];
import { getDefaultCashAccount } from "@/lib/finance";
import { emitInvoice } from "@/app/(app)/notas/actions";
import {
  conferirAdmin,
  LIMITE_DESCONTO_VENDEDOR,
  pctDesconto,
} from "@/lib/aprovacao";
import type { ScopedDb } from "@/lib/tenant-db";

const cartRowSchema = z.object({
  tipo: z.enum(["PECA", "SERVICO"]).optional(),
  productId: zIdOpc,
  serviceId: zIdOpc,
  mecanico: z.string().max(120).nullish(),
  descricao: z.string().max(300),
  quantidade: zQtd,
  precoUnit: zMoeda,
  desconto: zMoeda.optional(),
});
const payRowSchema = z.object({
  forma: z.string().max(20),
  valor: zMoeda,
});
type CartRow = z.infer<typeof cartRowSchema>;
type PayRow = z.infer<typeof payRowSchema>;

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  DEBITO: "Cartão débito",
  CREDITO: "Cartão crédito",
  CREDIARIO: "Crediário",
};

interface ItemFinal {
  tipo: "PECA" | "SERVICO";
  productId: string | null;
  serviceId: string | null;
  mecanico: string | null;
  descricao: string;
  quantidade: number;
  precoUnit: number;
  desconto: number;
  total: number;
}

/**
 * Serviço vindo do catálogo tem nome fixo: sobrescreve a descrição enviada pelo
 * cliente com o `nome` cadastrado (mão de obra avulsa — sem serviceId — mantém o
 * texto digitado). Serviço inexistente vira avulso.
 */
async function travarNomeServicos(db: ScopedDb, itens: CartRow[]) {
  const ids = itens
    .filter((r) => r.tipo === "SERVICO" && r.serviceId)
    .map((r) => r.serviceId as string);
  if (ids.length === 0) return;
  const servs = await db.service.findMany({
    where: { id: { in: ids } },
    select: { id: true, nome: true },
  });
  for (const r of itens) {
    if (r.tipo !== "SERVICO" || !r.serviceId) continue;
    const s = servs.find((x) => x.id === r.serviceId);
    if (s) r.descricao = s.nome;
    else r.serviceId = null;
  }
}

/** Normaliza uma linha do carrinho (peça ou serviço/mão de obra). */
function normalizarItem(r: CartRow): ItemFinal {
  const tipo: "PECA" | "SERVICO" = r.tipo === "SERVICO" ? "SERVICO" : "PECA";
  const total = round(r.quantidade * r.precoUnit - (r.desconto ?? 0));
  return {
    tipo,
    productId: tipo === "PECA" ? (r.productId || null) : null,
    serviceId: tipo === "SERVICO" ? (r.serviceId || null) : null,
    mecanico: tipo === "SERVICO" ? (r.mecanico?.trim() || null) : null,
    descricao: r.descricao,
    quantidade: r.quantidade,
    precoUnit: r.precoUnit,
    desconto: round(r.desconto ?? 0),
    total,
  };
}

/** Gera uma NF-e rascunho (sem baixar estoque de novo) a partir de uma venda. */
async function emitirNfeDaVenda(
  db: ScopedDb,
  companyId: string,
  opts: {
    saleId: string;
    partnerId: string | null;
    itens: ItemFinal[];
    valorProdutos: number;
    valorDesconto: number;
    valorTotal: number;
  },
) {
  // NF-e só cobre peças — serviços/mão de obra ficam de fora.
  const itensPeca = opts.itens.filter(
    (i): i is ItemFinal & { productId: string } => !!i.productId,
  );
  if (itensPeca.length === 0) return;
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId } });
  const prods = await db.product.findMany({
    where: { id: { in: itensPeca.map((i) => i.productId) } },
  });
  const nf = await db.$transaction(async (tx) => {
    const numero = await nextSeq(tx, companyId, `nfe-serie-${company.serieNFe}`);
    return tx.invoice.create({
      data: {
        companyId,
        tipo: "NFE",
        numero,
        serie: company.serieNFe,
        status: "RASCUNHO",
        ambiente: company.ambienteFiscal,
        naturezaOperacao: "Venda de mercadoria",
        partnerId: opts.partnerId,
        saleId: opts.saleId,
        baixaEstoque: false,
        valorProdutos: opts.valorProdutos,
        valorDesconto: opts.valorDesconto,
        valorTotal: opts.valorTotal,
        items: {
          create: itensPeca.map((it) => {
            const p = prods.find((x) => x.id === it.productId);
            return {
              companyId,
              productId: it.productId,
              codigo: p?.sku ?? "SEM-COD",
              descricao: it.descricao,
              ncm: p?.ncm ?? null,
              cfop: p?.cfopVenda ?? "5102",
              unidade: p?.unidade ?? "UN",
              quantidade: it.quantidade,
              valorUnit: it.precoUnit,
              desconto: it.desconto,
              valorTotal: it.total,
              cstIcms: p?.icmsCst ?? "102",
              aliquotaIcms: 0,
              valorIcms: 0,
            };
          }),
        },
      },
    });
  });
  await emitInvoice(nf.id);
}

export async function finalizarVenda(formData: FormData) {
  // Fechar a venda com pagamento é do operador de caixa (não do vendedor).
  const { user, db } = await requireDbPermission("vendas");
  const itens = parseArrayJson(str(formData.get("itens")), cartRowSchema, "itens");
  const pagamentos = parseArrayJson(
    str(formData.get("pagamentos")),
    payRowSchema,
    "pagamentos",
  );
  if (itens.length === 0) throw new Error("Adicione ao menos uma peça ou serviço.");
  await travarNomeServicos(db, itens);
  if (itens.some((r) => r.tipo === "SERVICO" && !r.descricao?.trim()))
    throw new Error("Descreva a mão de obra de cada linha de serviço.");

  const partnerId = optStr(formData.get("partnerId"));
  const descontoGeral = parseNumber(formData.get("descontoGeral"));
  const acrescimo = parseNumber(formData.get("acrescimo"));
  const observacao = optStr(formData.get("observacao"));
  const emitirNfe = str(formData.get("emitirNfe")) === "1";

  let subtotal = 0;
  const itemData: ItemFinal[] = itens.map((r) => {
    const it = normalizarItem(r);
    subtotal += it.total;
    return it;
  });
  subtotal = round(subtotal);
  const total = round(subtotal - descontoGeral + acrescimo);

  const pagos = pagamentos.filter((p) => p.valor > 0);
  const { pago: totalPago, troco, recebidoAgora } = calcPagamento(total, pagos);

  if (totalPago + 0.001 < total) {
    throw new Error(
      `Pagamento insuficiente: total ${total.toFixed(2)}, informado ${totalPago.toFixed(2)}.`,
    );
  }
  const formaResumo =
    pagos.map((p) => FORMA_LABEL[p.forma] ?? p.forma).join(", ") || null;

  const sale = await db.$transaction(async (tx) => {
    const numero = await nextSeq(tx, user.companyId, "venda");
    const s = await tx.sale.create({
      data: {
        companyId: user.companyId,
        numero,
        partnerId,
        operadorId: user.id,
        status: "FINALIZADA",
        subtotal,
        desconto: round(descontoGeral),
        acrescimo: round(acrescimo),
        total,
        troco,
        formaPagamento: formaResumo,
        observacao,
        finalizadaEm: new Date(),
        items: { create: itemData.map((it) => ({ ...it, companyId: user.companyId })) },
        payments: {
          create: pagos.map((p) => ({ companyId: user.companyId, forma: p.forma, valor: round(p.valor) })),
        },
      },
    });

    // baixa de estoque (serviços/mão de obra não mexem no estoque)
    for (const it of itemData) {
      if (it.tipo === "SERVICO" || !it.productId) continue;
      const prod = await tx.product.findUnique({ where: { id: it.productId } });
      if (!prod) continue;
      const saldo = prod.estoque - it.quantidade;
      await tx.product.update({ where: { id: prod.id }, data: { estoque: saldo } });
      await tx.stockMovement.create({
        data: {
          companyId: user.companyId,
          productId: prod.id,
          tipo: "SAIDA",
          quantidade: it.quantidade,
          custoUnit: prod.precoCusto,
          saldoApos: saldo,
          origem: "VENDA",
          origemId: s.id,
          observacao: `Venda nº ${numero}`,
        },
      });
    }

    // financeiro
    const parteRecebida = Math.min(recebidoAgora, total);
    const entry = await tx.financialEntry.create({
      data: {
        companyId: user.companyId,
        tipo: "RECEBER",
        status:
          parteRecebida + 0.001 >= total
            ? "PAGO"
            : parteRecebida > 0.001
              ? "PARCIAL"
              : "ABERTO",
        descricao: `Venda nº ${numero}`,
        categoria: "Vendas",
        partnerId,
        saleId: s.id,
        valor: total,
        valorPago: round(parteRecebida),
        vencimento: new Date(),
        pagoEm: parteRecebida + 0.001 >= total ? new Date() : null,
        formaPagamento: formaResumo,
      },
    });

    // registra a entrada no caixa (parte recebida à vista)
    if (parteRecebida > 0.001) {
      const conta = await getDefaultCashAccount(user.companyId, tx);
      const settlement = await tx.settlement.create({
        data: {
          companyId: user.companyId,
          entryId: entry.id,
          accountId: conta.id,
          valor: round(parteRecebida),
          formaPagamento: formaResumo,
        },
      });
      await tx.cashTransaction.create({
        data: {
          companyId: user.companyId,
          accountId: conta.id,
          tipo: "ENTRADA",
          valor: round(parteRecebida),
          categoria: "Vendas",
          descricao: `Venda nº ${numero}`,
          origem: "BAIXA_TITULO",
          settlementId: settlement.id,
        },
      });
    }

    return s;
  });

  if (emitirNfe) {
    const totalPecas = round(
      itemData
        .filter((it) => it.tipo === "PECA" && it.productId)
        .reduce((s, it) => s + it.total, 0),
    );
    await emitirNfeDaVenda(db, user.companyId, {
      saleId: sale.id,
      partnerId,
      itens: itemData,
      valorProdutos: totalPecas,
      valorDesconto: 0,
      valorTotal: totalPecas,
    });
  }

  revalidatePath("/vendas");
  revalidatePath("/");
  redirect(`/vendas/${sale.id}`);
}

/**
 * Cria a venda em rascunho: `ABERTA` (vai pro caixa receber) ou `ORCAMENTO`
 * (só uma cotação — NÃO entra na fila do caixa até ser enviada). Sem pagamento
 * e sem baixa de estoque. Devolve o id.
 */
async function criarVendaRascunho(
  formData: FormData,
  status: "ABERTA" | "ORCAMENTO",
): Promise<string> {
  const { user, db } = await requireDbAnyPermission(PDV_OU_CAIXA);
  const itens = parseArrayJson(str(formData.get("itens")), cartRowSchema, "itens");
  if (itens.length === 0) throw new Error("Adicione ao menos uma peça ou serviço.");
  await travarNomeServicos(db, itens);
  if (itens.some((r) => r.tipo === "SERVICO" && !r.descricao?.trim()))
    throw new Error("Descreva a mão de obra de cada linha de serviço.");

  // Vendedor (sem permissão `vendas`) não pode baixar preço nem dar desconto
  // por item — trava o preço no valor de tabela. Só vale para peças (serviço
  // avulso não tem preço de tabela).
  const soVendedor = !can(user, "vendas");
  if (soVendedor) {
    const idsPeca = itens
      .filter((r) => r.tipo !== "SERVICO" && r.productId)
      .map((r) => r.productId as string);
    const prods = idsPeca.length
      ? await db.product.findMany({
          where: { id: { in: idsPeca } },
          select: { id: true, precoVenda: true },
        })
      : [];
    for (const r of itens) {
      if (r.tipo === "SERVICO") continue;
      const p = prods.find((x) => x.id === r.productId);
      if (p && r.precoUnit < p.precoVenda) r.precoUnit = p.precoVenda;
      r.desconto = 0;
    }
  }

  const pagamentos = JSON.parse(
    str(formData.get("pagamentos")) || "[]",
  ) as PayRow[];
  const pagosHint = pagamentos.filter((p) => p.valor > 0);
  const formaResumo =
    pagosHint.map((p) => FORMA_LABEL[p.forma] ?? p.forma).join(", ") || null;

  const partnerId = optStr(formData.get("partnerId"));
  const descontoGeral = parseNumber(formData.get("descontoGeral"));
  const acrescimo = parseNumber(formData.get("acrescimo"));
  const observacao = optStr(formData.get("observacao"));

  let subtotal = 0;
  let brutoItens = 0;
  const itemData: ItemFinal[] = itens.map((r) => {
    const it = normalizarItem(r);
    subtotal += it.total;
    brutoItens += it.quantidade * it.precoUnit;
    return it;
  });
  subtotal = round(subtotal);
  brutoItens = round(brutoItens);
  const total = round(subtotal - descontoGeral + acrescimo);

  // --- Desconto do vendedor acima do limite exige autorização ---
  // Considera o desconto por item + o desconto geral, sobre o bruto dos itens.
  const descontoItens = round(itemData.reduce((s, it) => s + it.desconto, 0));
  const descontoTotalValor = round(descontoItens + Math.max(0, descontoGeral));
  const pct = pctDesconto(brutoItens, descontoTotalValor);

  let statusFinal: string = status;
  let aprovadaPor: string | null = null;
  let aprovadaEm: Date | null = null;

  if (soVendedor && pct > LIMITE_DESCONTO_VENDEDOR + 0.001) {
    const adminEmail = str(formData.get("adminEmail"));
    const adminSenha = str(formData.get("adminSenha"));
    if (adminEmail || adminSenha) {
      const admin = await conferirAdmin(user.companyId, adminEmail, adminSenha);
      if (!admin)
        throw new Error(
          "E-mail ou senha do administrador não conferem. Corrija ou deixe em branco para enviar à aprovação.",
        );
      aprovadaPor = `${admin.nome} (${admin.email})`;
      aprovadaEm = new Date();
    } else {
      // Sem gerente para liberar: vai para a fila de aprovação do admin.
      statusFinal = "AGUARDANDO_APROVACAO";
    }
  }

  const sale = await db.$transaction(async (tx) => {
    const numero = await nextSeq(tx, user.companyId, "venda");
    return tx.sale.create({
      data: {
        companyId: user.companyId,
        numero,
        partnerId,
        operadorId: user.id,
        status: statusFinal,
        aprovadaPor,
        aprovadaEm,
        subtotal,
        desconto: round(descontoGeral),
        acrescimo: round(acrescimo),
        total,
        formaPagamento: formaResumo,
        observacao,
        items: { create: itemData.map((it) => ({ ...it, companyId: user.companyId })) },
        payments: pagosHint.length
          ? {
              create: pagosHint.map((p) => ({
                companyId: user.companyId,
                forma: p.forma,
                valor: round(p.valor),
              })),
            }
          : undefined,
      },
    });
  });

  revalidatePath("/vendas");
  revalidatePath("/");
  return sale.id;
}

/** Guarda a venda montada para o caixa receber (status ABERTA). */
export async function salvarPreVenda(formData: FormData) {
  const id = await criarVendaRascunho(formData, "ABERTA");
  redirect(`/vendas/${id}`);
}

/**
 * Salva um ORÇAMENTO: só uma cotação para o cliente. Não vai pro caixa até o
 * vendedor/caixa clicar em "Enviar ao caixa".
 */
export async function salvarOrcamento(formData: FormData) {
  const id = await criarVendaRascunho(formData, "ORCAMENTO");
  redirect(`/vendas/${id}`);
}

/** Converte um orçamento em pré-venda (aí sim entra na fila do caixa). */
export async function enviarOrcamentoAoCaixa(id: string) {
  const { db } = await requireDbAnyPermission(PDV_OU_CAIXA);
  const sale = await db.sale.findUniqueOrThrow({ where: { id } });
  if (sale.status !== "ORCAMENTO")
    throw new Error("Este registro não é um orçamento.");
  await db.sale.update({ where: { id }, data: { status: "ABERTA" } });
  revalidatePath("/vendas");
  revalidatePath("/caixa");
  revalidatePath("/");
  redirect(`/vendas/${id}`);
}

/**
 * Descarta um orçamento — exige um motivo e **mantém o registro salvo**
 * (status `ORCAMENTO_CANCELADO`). Não apaga do banco.
 */
export async function cancelarOrcamento(id: string, formData: FormData) {
  const { user, db } = await requireDbAnyPermission(PDV_OU_CAIXA);
  const motivo = str(formData.get("motivo")).trim();
  if (motivo.length < 5)
    throw new Error("Informe o motivo do descarte (mín. 5 caracteres).");
  const sale = await db.sale.findUniqueOrThrow({ where: { id } });
  if (sale.status !== "ORCAMENTO")
    throw new Error("Só orçamentos em aberto podem ser descartados.");
  const carimbo = `Descartado por ${user.nome}: ${motivo}`;
  await db.sale.update({
    where: { id },
    data: {
      status: "ORCAMENTO_CANCELADO",
      observacao: sale.observacao ? `${sale.observacao}\n${carimbo}` : carimbo,
    },
  });
  revalidatePath("/vendas");
  revalidatePath("/vendas/orcamentos");
  redirect(`/vendas/${id}`);
}

/** Apaga o orçamento do banco de vez — só o administrador geral. */
export async function excluirOrcamento(id: string) {
  const { db } = await requireDbAdmin();
  const sale = await db.sale.findUniqueOrThrow({ where: { id } });
  if (sale.status !== "ORCAMENTO" && sale.status !== "ORCAMENTO_CANCELADO")
    throw new Error("Só orçamentos podem ser apagados por aqui.");
  await db.sale.delete({ where: { id } });
  revalidatePath("/vendas");
  revalidatePath("/vendas/orcamentos");
  redirect("/vendas/orcamentos");
}

/**
 * Admin/gerente aprova uma venda parada por desconto acima do limite. Ela volta
 * para o fluxo normal (status `ABERTA`) e segue para o caixa.
 */
export async function aprovarDescontoVenda(id: string) {
  const { user, db } = await requireDbPermission("vendas");
  const sale = await db.sale.findUniqueOrThrow({ where: { id } });
  if (sale.status !== "AGUARDANDO_APROVACAO")
    throw new Error("Esta venda não está aguardando aprovação.");
  await db.sale.update({
    where: { id },
    data: {
      status: "ABERTA",
      aprovadaPor: `${user.nome} (${user.email})`,
      aprovadaEm: new Date(),
    },
  });
  revalidatePath("/vendas");
  revalidatePath("/vendas/aprovacoes");
  revalidatePath("/caixa");
  revalidatePath("/");
  redirect(`/vendas/${id}`);
}

/** Admin/gerente nega o desconto: a venda fica registrada como `APROVACAO_NEGADA`. */
export async function negarDescontoVenda(id: string, formData: FormData) {
  const { user, db } = await requireDbPermission("vendas");
  const motivo = str(formData.get("motivo")).trim();
  if (motivo.length < 5)
    throw new Error("Informe o motivo da recusa (mín. 5 caracteres).");
  const sale = await db.sale.findUniqueOrThrow({ where: { id } });
  if (sale.status !== "AGUARDANDO_APROVACAO")
    throw new Error("Esta venda não está aguardando aprovação.");
  const carimbo = `Desconto recusado por ${user.nome}: ${motivo}`;
  await db.sale.update({
    where: { id },
    data: {
      status: "APROVACAO_NEGADA",
      observacao: sale.observacao ? `${sale.observacao}\n${carimbo}` : carimbo,
    },
  });
  revalidatePath("/vendas");
  revalidatePath("/vendas/aprovacoes");
  redirect(`/vendas/${id}`);
}

/** Caixa puxa uma pré-venda (status ABERTA) pelo número, lança o pagamento e finaliza. */
export async function receberVenda(
  saleId: string,
  redirectTo: string | null,
  formData: FormData,
) {
  // Receber pré-venda é do operador de caixa.
  const { user, db } = await requireDbPermission("vendas");
  const pagamentos = parseArrayJson(
    str(formData.get("pagamentos")),
    payRowSchema,
    "pagamentos",
  );
  const descontoGeral = parseNumber(formData.get("descontoGeral"));
  const acrescimo = parseNumber(formData.get("acrescimo"));
  const observacao = optStr(formData.get("observacao"));
  const emitirNfe = str(formData.get("emitirNfe")) === "1";
  const partnerIdForm = optStr(formData.get("partnerId"));

  const sale = await db.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: { items: true },
  });
  if (sale.status !== "ABERTA")
    throw new Error("Esta venda não está aguardando o caixa.");
  if (sale.items.length === 0) throw new Error("Venda sem itens.");

  const partnerId = partnerIdForm ?? sale.partnerId;
  const subtotal = round(sale.items.reduce((s, it) => s + it.total, 0));
  const total = round(subtotal - descontoGeral + acrescimo);

  const pagos = pagamentos.filter((p) => p.valor > 0);
  const { pago: totalPago, troco, recebidoAgora } = calcPagamento(total, pagos);
  if (totalPago + 0.001 < total) {
    throw new Error(
      `Pagamento insuficiente: total ${total.toFixed(2)}, informado ${totalPago.toFixed(2)}.`,
    );
  }
  const formaResumo =
    pagos.map((p) => FORMA_LABEL[p.forma] ?? p.forma).join(", ") || null;

  await db.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: saleId },
      data: {
        status: "FINALIZADA",
        partnerId,
        subtotal,
        desconto: round(descontoGeral),
        acrescimo: round(acrescimo),
        total,
        troco,
        formaPagamento: formaResumo,
        observacao: observacao ?? sale.observacao,
        finalizadaEm: new Date(),
        payments: {
          deleteMany: {},
          create: pagos.map((p) => ({ companyId: user.companyId, forma: p.forma, valor: round(p.valor) })),
        },
      },
    });

    for (const it of sale.items) {
      if (it.tipo === "SERVICO" || !it.productId) continue;
      const prod = await tx.product.findUnique({ where: { id: it.productId } });
      if (!prod) continue;
      const saldo = prod.estoque - it.quantidade;
      await tx.product.update({ where: { id: prod.id }, data: { estoque: saldo } });
      await tx.stockMovement.create({
        data: {
          companyId: user.companyId,
          productId: prod.id,
          tipo: "SAIDA",
          quantidade: it.quantidade,
          custoUnit: prod.precoCusto,
          saldoApos: saldo,
          origem: "VENDA",
          origemId: saleId,
          observacao: `Venda nº ${sale.numero}`,
        },
      });
    }

    const parteRecebida = Math.min(recebidoAgora, total);
    const entry = await tx.financialEntry.create({
      data: {
        companyId: user.companyId,
        tipo: "RECEBER",
        status:
          parteRecebida + 0.001 >= total
            ? "PAGO"
            : parteRecebida > 0.001
              ? "PARCIAL"
              : "ABERTO",
        descricao: `Venda nº ${sale.numero}`,
        categoria: "Vendas",
        partnerId,
        saleId,
        valor: total,
        valorPago: round(parteRecebida),
        vencimento: new Date(),
        pagoEm: parteRecebida + 0.001 >= total ? new Date() : null,
        formaPagamento: formaResumo,
      },
    });

    if (parteRecebida > 0.001) {
      const conta = await getDefaultCashAccount(user.companyId, tx);
      const settlement = await tx.settlement.create({
        data: {
          companyId: user.companyId,
          entryId: entry.id,
          accountId: conta.id,
          valor: round(parteRecebida),
          formaPagamento: formaResumo,
        },
      });
      await tx.cashTransaction.create({
        data: {
          companyId: user.companyId,
          accountId: conta.id,
          tipo: "ENTRADA",
          valor: round(parteRecebida),
          categoria: "Vendas",
          descricao: `Venda nº ${sale.numero}`,
          origem: "BAIXA_TITULO",
          settlementId: settlement.id,
        },
      });
    }
  });

  if (emitirNfe) {
    const itensNf: ItemFinal[] = sale.items.map((it) => ({
      tipo: it.tipo === "SERVICO" ? "SERVICO" : "PECA",
      productId: it.productId,
      serviceId: it.serviceId,
      mecanico: it.mecanico,
      descricao: it.descricao,
      quantidade: it.quantidade,
      precoUnit: it.precoUnit,
      desconto: it.desconto,
      total: it.total,
    }));
    const totalPecas = round(
      itensNf
        .filter((it) => it.tipo === "PECA" && it.productId)
        .reduce((s, it) => s + it.total, 0),
    );
    await emitirNfeDaVenda(db, user.companyId, {
      saleId,
      partnerId,
      itens: itensNf,
      valorProdutos: totalPecas,
      valorDesconto: 0,
      valorTotal: totalPecas,
    });
  }

  revalidatePath("/vendas");
  revalidatePath("/caixa");
  revalidatePath("/");
  redirect(redirectTo ?? `/vendas/${saleId}`);
}

/**
 * Descarta uma pré-venda que ainda não passou pelo caixa. Estamos lidando com
 * dinheiro: **exige um motivo** e **mantém o registro** (status `CANCELADA`,
 * com o carimbo de quem descartou e por quê na observação). Não apaga do banco.
 */
export async function cancelarPreVenda(id: string, formData: FormData) {
  const { user, db } = await requireDbAnyPermission(PDV_OU_CAIXA);
  const motivo = str(formData.get("motivo")).trim();
  if (motivo.length < 5)
    throw new Error("Informe o motivo do descarte (mín. 5 caracteres).");
  const sale = await db.sale.findUniqueOrThrow({ where: { id } });
  if (sale.status !== "ABERTA")
    throw new Error("Só é possível descartar vendas que ainda não passaram pelo caixa.");
  const carimbo = `Descartada por ${user.nome}: ${motivo}`;
  await db.sale.update({
    where: { id },
    data: {
      status: "CANCELADA",
      observacao: sale.observacao ? `${sale.observacao}\n${carimbo}` : carimbo,
    },
  });
  revalidatePath("/vendas");
  revalidatePath("/caixa");
  redirect(`/vendas/${id}`);
}

export async function cancelarVenda(id: string, formData: FormData) {
  const { user, db } = await requireDbPermission("vendas");
  const motivo = str(formData.get("motivo")) || "Cancelamento de venda";
  const sale = await db.sale.findUniqueOrThrow({
    where: { id },
    include: { items: true, invoices: true },
  });
  if (sale.status !== "FINALIZADA")
    throw new Error("Só é possível cancelar vendas finalizadas.");
  const notaAtiva = sale.invoices.find((n) => n.status !== "CANCELADA");
  if (notaAtiva)
    throw new Error("Cancele a nota fiscal desta venda antes de cancelar a venda.");

  await db.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id },
      data: { status: "CANCELADA", observacao: `${sale.observacao ?? ""}\nCancelada: ${motivo}`.trim() },
    });
    for (const it of sale.items) {
      if (it.tipo === "SERVICO" || !it.productId) continue;
      const prod = await tx.product.findUnique({ where: { id: it.productId } });
      if (!prod) continue;
      const saldo = prod.estoque + it.quantidade;
      await tx.product.update({ where: { id: prod.id }, data: { estoque: saldo } });
      await tx.stockMovement.create({
        data: {
          companyId: user.companyId,
          productId: prod.id,
          tipo: "ENTRADA",
          quantidade: it.quantidade,
          custoUnit: prod.precoCusto,
          saldoApos: saldo,
          origem: "DEVOLUCAO",
          origemId: sale.id,
          observacao: `Cancelamento venda nº ${sale.numero}`,
        },
      });
    }
    // remove baixas/movimentos de caixa e cancela os títulos da venda
    const entries = await tx.financialEntry.findMany({ where: { saleId: id } });
    for (const e of entries) {
      const setts = await tx.settlement.findMany({ where: { entryId: e.id } });
      for (const st of setts) {
        await tx.cashTransaction.deleteMany({ where: { settlementId: st.id } });
      }
      await tx.settlement.deleteMany({ where: { entryId: e.id } });
    }
    await tx.financialEntry.updateMany({
      where: { saleId: id, status: { not: "CANCELADO" } },
      data: { status: "CANCELADO", valorPago: 0, pagoEm: null },
    });
  });

  revalidatePath("/vendas");
  revalidatePath(`/vendas/${id}`);
  revalidatePath("/financeiro");
}
