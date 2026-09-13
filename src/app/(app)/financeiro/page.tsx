import Link from "next/link";
import { redirect } from "next/navigation";
import { can, requireDb } from "@/lib/auth";
import type { ScopedDb } from "@/lib/tenant-db";
import { PageHeader } from "@/components/PageHeader";
import { FinanceNav } from "@/components/FinanceNav";
import { money, date } from "@/lib/format";
import { accountBalance, getDefaultCashAccount } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function FinanceiroPainelPage() {
  const { user, db } = await requireDb();
  // Painel é só para quem tem `financeiro` completo; caixa vai direto ao fluxo.
  if (!can(user, "financeiro")) redirect("/financeiro/caixa");
  await getDefaultCashAccount(user.companyId, db); // garante que exista pelo menos uma conta

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em30 = new Date(hoje);
  em30.setDate(em30.getDate() + 30);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const contas = await db.cashAccount.findMany({
    where: { ativo: true },
    orderBy: { createdAt: "asc" },
  });
  const saldos = await Promise.all(
    contas.map(async (c) => ({ conta: c, saldo: await accountBalance(c.id, db) })),
  );
  const saldoTotal = saldos.reduce((s, x) => s + x.saldo, 0);

  const abertos = { in: ["ABERTO", "PARCIAL"] };
  const [receberAberto, receberVencido, pagarAberto, pagarVencido, proximos, movHoje] =
    await Promise.all([
      sumSaldo(db, "RECEBER", { status: abertos }),
      sumSaldo(db, "RECEBER", { status: abertos, vencimento: { lt: amanha } }),
      sumSaldo(db, "PAGAR", { status: abertos }),
      sumSaldo(db, "PAGAR", { status: abertos, vencimento: { lt: amanha } }),
      db.financialEntry.findMany({
        where: { status: abertos, vencimento: { lte: em30 } },
        include: { partner: true },
        orderBy: { vencimento: "asc" },
        take: 12,
      }),
      db.cashTransaction.groupBy({
        by: ["tipo"],
        where: { data: { gte: hoje } },
        _sum: { valor: true },
      }),
    ]);

  const entradasHoje = movHoje.find((m) => m.tipo === "ENTRADA")?._sum.valor ?? 0;
  const saidasHoje = movHoje.find((m) => m.tipo === "SAIDA")?._sum.valor ?? 0;

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Painel" />
      <FinanceNav active="/financeiro" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Saldo em contas" value={money(saldoTotal)} accent="text-primary" />
        <Card
          title="A receber (aberto)"
          value={money(receberAberto)}
          sub={receberVencido > 0 ? `${money(receberVencido)} vencido` : undefined}
          accent="text-green-700"
        />
        <Card
          title="A pagar (aberto)"
          value={money(pagarAberto)}
          sub={pagarVencido > 0 ? `${money(pagarVencido)} vencido` : undefined}
          accent="text-red-600"
        />
        <Card
          title="Saldo previsto"
          value={money(saldoTotal + receberAberto - pagarAberto)}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card title="Entradas hoje" value={money(entradasHoje)} accent="text-green-700" />
        <Card title="Saídas hoje" value={money(saidasHoje)} accent="text-red-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold">Contas</h2>
            <Link href="/financeiro/contas" className="text-sm text-primary">
              gerenciar
            </Link>
          </header>
          <div className="divide-y divide-border">
            {saldos.map(({ conta, saldo }) => (
              <div key={conta.id} className="flex justify-between px-4 py-3">
                <span>
                  {conta.nome}{" "}
                  <span className="text-xs text-muted">
                    {conta.tipo.toLowerCase()}
                  </span>
                </span>
                <span
                  className={`font-medium ${saldo < 0 ? "text-red-600" : ""}`}
                >
                  {money(saldo)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold">Próximos vencimentos (30 dias)</h2>
            <Link href="/financeiro/titulos" className="text-sm text-primary">
              ver títulos
            </Link>
          </header>
          <div className="divide-y divide-border text-sm">
            {proximos.length === 0 && (
              <p className="px-4 py-6 text-muted">Nada a vencer nos próximos 30 dias.</p>
            )}
            {proximos.map((t) => {
              const saldo = t.valor - t.valorPago;
              const vencido = t.vencimento < amanha;
              return (
                <Link
                  key={t.id}
                  href={`/financeiro/titulos/${t.id}`}
                  className="flex items-center justify-between px-4 py-2 hover:bg-background"
                >
                  <span>
                    <span
                      className={`badge mr-2 ${
                        t.tipo === "RECEBER"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {t.tipo === "RECEBER" ? "receber" : "pagar"}
                    </span>
                    {t.descricao}
                    <span className="block text-xs text-muted">
                      {t.partner?.nome ? `${t.partner.nome} · ` : ""}
                      vence {date(t.vencimento)}
                      {vencido ? " (vencido)" : ""}
                    </span>
                  </span>
                  <span className="font-medium">{money(saldo)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

async function sumSaldo(
  db: ScopedDb,
  tipo: string,
  where: Record<string, unknown>,
): Promise<number> {
  const rows = await db.financialEntry.findMany({
    where: { tipo, ...where },
    select: { valor: true, valorPago: true },
  });
  return rows.reduce((s, r) => s + (r.valor - r.valorPago), 0);
}

function Card({
  title,
  value,
  sub,
  accent = "",
}: {
  title: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {title}
      </p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-red-600">{sub}</p>}
    </div>
  );
}
