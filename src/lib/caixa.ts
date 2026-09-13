import type { ScopedDb } from "@/lib/tenant-db";
import { getDefaultCashAccount } from "@/lib/finance";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Sessão de caixa aberta no momento (ou null). */
export async function getOpenCashSession(db: ScopedDb) {
  return db.cashRegisterSession.findFirst({
    where: { status: "ABERTO" },
    include: { operador: true, account: true },
    orderBy: { abertoEm: "desc" },
  });
}

export interface CaixaResumo {
  abertura: number;
  entradas: number;
  saidas: number;
  esperado: number;
}

/**
 * Resumo do que deve haver na gaveta: fundo de abertura + entradas do caixa
 * (vendas à vista, suprimentos) − saídas (sangrias, despesas) desde a abertura.
 */
export async function resumoSessaoCaixa(
  db: ScopedDb,
  session: {
    accountId: string;
    valorAbertura: number;
    abertoEm: Date;
    fechadoEm: Date | null;
  },
): Promise<CaixaResumo> {
  const ate = session.fechadoEm ?? new Date();
  const agg = await db.cashTransaction.groupBy({
    by: ["tipo"],
    where: {
      accountId: session.accountId,
      data: { gte: session.abertoEm, lte: ate },
    },
    _sum: { valor: true },
  });
  const entradas = r2(agg.find((a) => a.tipo === "ENTRADA")?._sum.valor ?? 0);
  const saidas = r2(agg.find((a) => a.tipo === "SAIDA")?._sum.valor ?? 0);
  const esperado = r2(session.valorAbertura + entradas - saidas);
  return { abertura: r2(session.valorAbertura), entradas, saidas, esperado };
}

export { getDefaultCashAccount };
