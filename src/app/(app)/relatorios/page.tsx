import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ReportNav } from "@/components/ReportNav";
import { PeriodFilter } from "@/components/PeriodFilter";
import { money, num } from "@/lib/format";
import { resolvePeriod } from "@/lib/period";
import { montarDre } from "@/lib/dre";

export const dynamic = "force-dynamic";

export default async function RelatoriosPainelPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; preset?: string }>;
}) {
  const { db } = await requireDb();
  const sp = await searchParams;
  const period = resolvePeriod(sp);
  const qs = sp.preset
    ? `?preset=${sp.preset}`
    : sp.de || sp.ate
      ? `?de=${period.deStr}&ate=${period.ateStr}`
      : "";
  const range = { gte: period.de, lte: period.ate };

  const [vendas, os, dre, entradas, saidas, porDia] = await Promise.all([
    db.sale.aggregate({
      _sum: { total: true },
      _count: true,
      where: { status: "FINALIZADA", finalizadaEm: range },
    }),
    db.serviceOrder.aggregate({
      _sum: { total: true },
      _count: true,
      where: { status: { in: ["CONCLUIDA", "ENTREGUE"] }, concluidaEm: range },
    }),
    montarDre(db, period),
    db.cashTransaction.aggregate({
      _sum: { valor: true },
      where: { tipo: "ENTRADA", data: range },
    }),
    db.cashTransaction.aggregate({
      _sum: { valor: true },
      where: { tipo: "SAIDA", data: range },
    }),
    db.sale.findMany({
      where: { status: "FINALIZADA", finalizadaEm: range },
      select: { total: true, finalizadaEm: true },
    }),
  ]);

  const nVendas = vendas._count;
  const fatVendas = vendas._sum.total ?? 0;
  const ticket = nVendas ? fatVendas / nVendas : 0;

  // faturamento por dia
  const dias = new Map<string, number>();
  for (const v of porDia) {
    const k = (v.finalizadaEm ?? new Date()).toISOString().slice(0, 10);
    dias.set(k, (dias.get(k) ?? 0) + v.total);
  }
  const serieDias = [...dias.entries()].sort().map(([k, v]) => ({ k, v }));
  const maxDia = Math.max(1, ...serieDias.map((d) => d.v));

  const cards = [
    { label: "Faturamento (vendas)", value: money(fatVendas) },
    { label: "Vendas no período", value: num(nVendas) },
    { label: "Ticket médio", value: money(ticket) },
    { label: "OS concluídas", value: num(os._count) },
    { label: "Lucro bruto", value: money(dre.lucroBruto), accent: "text-green-700" },
    { label: "Despesas operacionais", value: money(Math.abs(dre.linhas.find((l) => l.tipo === "despesa")?.valor ?? 0)), accent: "text-red-600" },
    {
      label: "Resultado do período",
      value: money(dre.resultado),
      accent: dre.resultado >= 0 ? "text-primary" : "text-red-600",
    },
    { label: "Margem líquida", value: `${dre.margemLiquida.toFixed(1)}%` },
  ];

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Painel do período" />
      <ReportNav active="/relatorios" query={qs} />
      <PeriodFilter period={period} basePath="/relatorios" preset={sp.preset} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {c.label}
            </p>
            <p className={`mt-2 text-2xl font-bold ${c.accent ?? ""}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Caixa no período</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Entradas</span>
              <span className="text-green-700">{money(entradas._sum.valor ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Saídas</span>
              <span className="text-red-600">{money(saidas._sum.valor ?? 0)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-bold">
              <span>Resultado de caixa</span>
              <span>
                {money((entradas._sum.valor ?? 0) - (saidas._sum.valor ?? 0))}
              </span>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">
            Receita de serviços (competência): {money(dre.receitaLiquida - fatVendas)} ·
            Impostos das notas: {money(Math.abs(dre.linhas.find((l) => l.tipo === "deducao")?.valor ?? 0))}
          </p>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Faturamento por dia</h2>
          {serieDias.length === 0 ? (
            <p className="text-sm text-muted">Sem vendas no período.</p>
          ) : (
            <div className="space-y-1">
              {serieDias.map((d) => (
                <div key={d.k} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-muted">
                    {d.k.slice(8, 10)}/{d.k.slice(5, 7)}
                  </span>
                  <div className="h-4 flex-1 rounded bg-background">
                    <div
                      className="h-4 rounded bg-primary"
                      style={{ width: `${(d.v / maxDia) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right">{money(d.v)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
