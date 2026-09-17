"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  can,
  requireDbAnyPermission,
  requireDbPermission,
} from "@/lib/auth";
import { bool, optStr, parseNumber, str } from "@/lib/format";
import { recomputeEntryStatus } from "@/lib/finance";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** `financeiro` completo OU `financeiro_caixa` (fluxo + recebíveis). */
const FIN_OU_CAIXA = ["financeiro", "financeiro_caixa"];

// ---------- titulos ----------

export async function criarTitulo(formData: FormData) {
  const { user, db } = await requireDbAnyPermission(FIN_OU_CAIXA);
  // Sem `financeiro` completo só é possível lançar recebível.
  const tipo = !can(user, "financeiro")
    ? "RECEBER"
    : str(formData.get("tipo")) === "PAGAR"
      ? "PAGAR"
      : "RECEBER";
  const descricao = str(formData.get("descricao"));
  const valor = parseNumber(formData.get("valor"));
  const venc = str(formData.get("vencimento"));
  if (!descricao || valor <= 0 || !venc)
    throw new Error("Preencha descrição, valor e vencimento.");

  const parcelas = Math.max(1, Math.min(60, Number(str(formData.get("parcelas")) || "1")));
  const base = new Date(venc);
  const valorParcela = r2(valor / parcelas);

  await db.$transaction(async (tx) => {
    for (let i = 0; i < parcelas; i++) {
      const d = new Date(base);
      d.setMonth(d.getMonth() + i);
      await tx.financialEntry.create({
        data: {
          companyId: user.companyId,
          tipo,
          status: "ABERTO",
          descricao:
            parcelas > 1 ? `${descricao} (${i + 1}/${parcelas})` : descricao,
          categoria: optStr(formData.get("categoria")),
          partnerId: optStr(formData.get("partnerId")),
          valor:
            i === parcelas - 1
              ? r2(valor - valorParcela * (parcelas - 1))
              : valorParcela,
          vencimento: d,
          observacao: optStr(formData.get("observacao")),
        },
      });
    }
  });

  revalidatePath("/financeiro");
  revalidatePath("/financeiro/titulos");
  redirect("/financeiro/titulos");
}

export async function baixarTitulo(entryId: string, formData: FormData) {
  const { user, db } = await requireDbAnyPermission(FIN_OU_CAIXA);
  const valor = parseNumber(formData.get("valor"));
  const accountId = str(formData.get("accountId"));
  const dataStr = str(formData.get("data"));
  const forma = optStr(formData.get("formaPagamento"));
  if (valor <= 0) throw new Error("Informe um valor maior que zero.");
  if (!accountId) throw new Error("Selecione a conta.");

  await db.$transaction(async (tx) => {
    const entry = await tx.financialEntry.findUniqueOrThrow({
      where: { id: entryId },
      include: { settlements: true },
    });
    if (!can(user, "financeiro") && entry.tipo !== "RECEBER")
      throw new Error("Sem permissão para movimentar títulos a pagar.");
    if (entry.status === "CANCELADO")
      throw new Error("Título cancelado não pode ser baixado.");
    const pago = entry.settlements.reduce((s, x) => s + x.valor, 0);
    const saldo = r2(entry.valor - pago);
    if (valor > saldo + 0.001)
      throw new Error(`Valor acima do saldo devedor (${saldo.toFixed(2)}).`);

    const data = dataStr ? new Date(dataStr) : new Date();
    const settlement = await tx.settlement.create({
      data: {
        companyId: user.companyId,
        entryId,
        accountId,
        valor: r2(valor),
        data,
        formaPagamento: forma,
        observacao: optStr(formData.get("observacao")),
      },
    });
    await tx.cashTransaction.create({
      data: {
        companyId: user.companyId,
        accountId,
        data,
        tipo: entry.tipo === "RECEBER" ? "ENTRADA" : "SAIDA",
        valor: r2(valor),
        categoria: entry.categoria ?? (entry.tipo === "RECEBER" ? "Recebimentos" : "Pagamentos"),
        descricao: `Baixa: ${entry.descricao}`,
        origem: "BAIXA_TITULO",
        settlementId: settlement.id,
      },
    });
    await recomputeEntryStatus(tx, entryId);
  });

  revalidatePath("/financeiro");
  revalidatePath("/financeiro/titulos");
  revalidatePath(`/financeiro/titulos/${entryId}`);
  revalidatePath("/financeiro/caixa");
}

export async function estornarBaixa(settlementId: string) {
  const { user, db } = await requireDbAnyPermission(FIN_OU_CAIXA);
  await db.$transaction(async (tx) => {
    const st = await tx.settlement.findUniqueOrThrow({
      where: { id: settlementId },
      include: { entry: true },
    });
    if (!can(user, "financeiro") && st.entry.tipo !== "RECEBER")
      throw new Error("Sem permissão para estornar títulos a pagar.");
    await tx.cashTransaction.deleteMany({ where: { settlementId } });
    await tx.settlement.delete({ where: { id: settlementId } });
    await recomputeEntryStatus(tx, st.entryId);
  });
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/titulos");
  revalidatePath("/financeiro/caixa");
}

export async function cancelarTitulo(entryId: string) {
  const { user, db } = await requireDbAnyPermission(FIN_OU_CAIXA);
  const entry = await db.financialEntry.findUniqueOrThrow({
    where: { id: entryId },
    include: { settlements: true },
  });
  if (!can(user, "financeiro") && entry.tipo !== "RECEBER")
    throw new Error("Sem permissão para cancelar títulos a pagar.");
  if (entry.settlements.length > 0)
    throw new Error("Estorne as baixas antes de cancelar o título.");
  await db.financialEntry.update({
    where: { id: entryId },
    data: { status: "CANCELADO" },
  });
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/titulos");
}

// ---------- caixa ----------

export async function criarMovimentoCaixa(formData: FormData) {
  const { user, db } = await requireDbAnyPermission(FIN_OU_CAIXA);
  const accountId = str(formData.get("accountId"));
  const tipo = str(formData.get("tipo")) === "SAIDA" ? "SAIDA" : "ENTRADA";
  const valor = parseNumber(formData.get("valor"));
  const descricao = str(formData.get("descricao"));
  const dataStr = str(formData.get("data"));
  if (!accountId || valor <= 0 || !descricao)
    throw new Error("Preencha conta, valor e descrição.");

  await db.cashTransaction.create({
    data: {
      companyId: user.companyId,
      accountId,
      tipo,
      valor: r2(valor),
      descricao,
      categoria: optStr(formData.get("categoria")),
      forma: optStr(formData.get("forma")),
      data: dataStr ? new Date(dataStr) : new Date(),
      origem: "MANUAL",
    },
  });
  revalidatePath("/financeiro/caixa");
  revalidatePath("/financeiro");
}

export async function transferir(formData: FormData) {
  const { user, db } = await requireDbAnyPermission(FIN_OU_CAIXA);
  const origemId = str(formData.get("origemId"));
  const destinoId = str(formData.get("destinoId"));
  const valor = parseNumber(formData.get("valor"));
  if (!origemId || !destinoId || origemId === destinoId)
    throw new Error("Escolha contas de origem e destino diferentes.");
  if (valor <= 0) throw new Error("Informe um valor.");
  const data = str(formData.get("data")) ? new Date(str(formData.get("data"))) : new Date();

  await db.$transaction([
    db.cashTransaction.create({
      data: { companyId: user.companyId, accountId: origemId, tipo: "SAIDA", valor: r2(valor), descricao: "Transferência entre contas", categoria: "Transferência", data, origem: "TRANSFERENCIA" },
    }),
    db.cashTransaction.create({
      data: { companyId: user.companyId, accountId: destinoId, tipo: "ENTRADA", valor: r2(valor), descricao: "Transferência entre contas", categoria: "Transferência", data, origem: "TRANSFERENCIA" },
    }),
  ]);
  revalidatePath("/financeiro/caixa");
  revalidatePath("/financeiro");
}

export async function excluirMovimento(id: string, formData: FormData) {
  const { user, db } = await requireDbAnyPermission(FIN_OU_CAIXA);
  const motivo = str(formData.get("motivo")).trim();
  if (motivo.length < 5)
    throw new Error("Informe o motivo do cancelamento (mínimo 5 caracteres).");
  const mov = await db.cashTransaction.findUniqueOrThrow({ where: { id } });
  if (mov.origem === "BAIXA_TITULO")
    throw new Error("Estorne a baixa do título em vez de cancelar o movimento.");
  if (mov.cancelado) throw new Error("Este movimento já está cancelado.");
  // Nao apaga: fica registrado como cancelado, com o motivo e quem cancelou,
  // e sai do calculo de saldo/relatorios. Estamos lidando com dinheiro.
  await db.cashTransaction.update({
    where: { id },
    data: {
      cancelado: true,
      canceladoMotivo: motivo,
      canceladoEm: new Date(),
      canceladoPor: `${user.nome} (${user.email})`,
    },
  });
  revalidatePath("/financeiro/caixa");
  revalidatePath("/financeiro");
}

// ---------- contas ----------

export async function criarConta(formData: FormData) {
  const { user, db } = await requireDbPermission("financeiro");
  const nome = str(formData.get("nome"));
  if (!nome) throw new Error("Informe o nome da conta.");
  await db.cashAccount.create({
    data: {
      companyId: user.companyId,
      nome,
      tipo: str(formData.get("tipo")) === "BANCO" ? "BANCO" : "CAIXA",
      saldoInicial: parseNumber(formData.get("saldoInicial")),
    },
  });
  revalidatePath("/financeiro/contas");
  revalidatePath("/financeiro/caixa");
}

export async function atualizarConta(id: string, formData: FormData) {
  const { db } = await requireDbPermission("financeiro");
  await db.cashAccount.update({
    where: { id },
    data: {
      nome: str(formData.get("nome")),
      tipo: str(formData.get("tipo")) === "BANCO" ? "BANCO" : "CAIXA",
      saldoInicial: parseNumber(formData.get("saldoInicial")),
      ativo: bool(formData.get("ativo")),
    },
  });
  revalidatePath("/financeiro/contas");
  revalidatePath("/financeiro/caixa");
}

export async function excluirConta(id: string) {
  const { db } = await requireDbPermission("financeiro");
  const movs = await db.cashTransaction.count({ where: { accountId: id } });
  if (movs > 0)
    throw new Error("Conta com movimentos não pode ser excluída (inative-a).");
  await db.cashAccount.delete({ where: { id } });
  revalidatePath("/financeiro/contas");
}
