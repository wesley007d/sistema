import type { ScopedTx } from "@/lib/tenant-db";

type Tx = ScopedTx;

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Conta de caixa padrao da empresa (cria "Caixa" na primeira vez) */
export async function getDefaultCashAccount(companyId: string, tx: Tx) {
  const existente = await tx.cashAccount.findFirst({
    where: { ativo: true },
    orderBy: { createdAt: "asc" },
  });
  if (existente) return existente;
  return tx.cashAccount.create({
    data: { companyId, nome: "Caixa", tipo: "CAIXA", saldoInicial: 0 },
  });
}

/** Saldo atual de uma conta = saldo inicial + entradas - saidas */
export async function accountBalance(accountId: string, tx: Tx) {
  const acc = await tx.cashAccount.findUniqueOrThrow({ where: { id: accountId } });
  const agg = await tx.cashTransaction.groupBy({
    by: ["tipo"],
    where: { accountId },
    _sum: { valor: true },
  });
  const entrada = agg.find((a) => a.tipo === "ENTRADA")?._sum.valor ?? 0;
  const saida = agg.find((a) => a.tipo === "SAIDA")?._sum.valor ?? 0;
  return r2(acc.saldoInicial + entrada - saida);
}

/** Saldo de uma conta ate (exclusive) uma data */
export async function accountBalanceUntil(
  accountId: string,
  until: Date,
  tx: Tx,
) {
  const acc = await tx.cashAccount.findUniqueOrThrow({ where: { id: accountId } });
  const agg = await tx.cashTransaction.groupBy({
    by: ["tipo"],
    where: { accountId, data: { lt: until } },
    _sum: { valor: true },
  });
  const entrada = agg.find((a) => a.tipo === "ENTRADA")?._sum.valor ?? 0;
  const saida = agg.find((a) => a.tipo === "SAIDA")?._sum.valor ?? 0;
  return r2(acc.saldoInicial + entrada - saida);
}

/** Recalcula status/valorPago de um titulo a partir das suas baixas */
export async function recomputeEntryStatus(tx: Tx, entryId: string) {
  const entry = await tx.financialEntry.findUniqueOrThrow({
    where: { id: entryId },
    include: { settlements: true },
  });
  if (entry.status === "CANCELADO") return;
  const pago = r2(entry.settlements.reduce((s, x) => s + x.valor, 0));
  let status: string;
  if (pago <= 0.001) status = "ABERTO";
  else if (pago + 0.001 >= entry.valor) status = "PAGO";
  else status = "PARCIAL";
  await tx.financialEntry.update({
    where: { id: entryId },
    data: {
      valorPago: pago,
      status,
      pagoEm: status === "PAGO" ? new Date() : null,
    },
  });
}
