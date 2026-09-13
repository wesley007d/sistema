import Link from "next/link";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ReportNav } from "@/components/ReportNav";
import { PeriodFilter } from "@/components/PeriodFilter";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { money, num } from "@/lib/format";
import { resolvePeriod } from "@/lib/period";
import { carregarRelatorioEstoque } from "@/lib/relatorios";

export const dynamic = "force-dynamic";

export default async function RelatorioEstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; preset?: string }>;
}) {
  const sp = await searchParams;
  const period = resolvePeriod(sp);
  const qs = sp.preset
    ? `?preset=${sp.preset}`
    : sp.de || sp.ate
      ? `?de=${period.deStr}&ate=${period.ateStr}`
      : "";
  const { db } = await requireDb();

  const { resumo, abaixoMin, semGiro, maisSaida, dias } =
    await carregarRelatorioEstoque(db, period);

  return (
    <div>
      <PageHeader
        title="Relatório de estoque"
        subtitle="Posição atual e giro no período"
        action={
          <div className="flex gap-2">
            <ExportPdfButton href={`/relatorios/estoque/imprimir${qs}`} />
            <ExportCsvButton href={`/relatorios/estoque/export${qs}`} />
          </div>
        }
      />
      <ReportNav active="/relatorios/estoque" query={qs} />
      <PeriodFilter period={period} basePath="/relatorios/estoque" preset={sp.preset} />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card title="Itens ativos" value={num(resumo.ativos)} />
        <Card title="Com estoque" value={num(resumo.comEstoque)} />
        <Card title="Valor a custo" value={money(resumo.valorCusto)} />
        <Card title="Valor a preço de venda" value={money(resumo.valorVenda)} accent="text-primary" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold">Abaixo do mínimo ({abaixoMin.length})</h2>
            <Link href="/produtos" className="text-sm text-primary">
              produtos
            </Link>
          </header>
          <div className="max-h-96 divide-y divide-border overflow-auto text-sm">
            {abaixoMin.length === 0 && (
              <p className="px-4 py-6 text-muted">Tudo acima do mínimo. 👍</p>
            )}
            {abaixoMin.map((p) => (
              <div key={p.id} className="flex justify-between px-4 py-2">
                <span>
                  {p.nome}{" "}
                  <span className="font-mono text-xs text-muted">{p.sku}</span>
                </span>
                <span className="text-red-600">
                  {num(p.estoque)} / mín {num(p.estoqueMinimo)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <header className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Sem giro no período</h2>
          </header>
          <div className="max-h-96 divide-y divide-border overflow-auto text-sm">
            {semGiro.length === 0 && (
              <p className="px-4 py-6 text-muted">Todos os itens tiveram saída.</p>
            )}
            {semGiro.slice(0, 15).map((p) => (
              <div key={p.id} className="flex justify-between px-4 py-2">
                <span>
                  {p.nome}{" "}
                  <span className="font-mono text-xs text-muted">{p.sku}</span>
                </span>
                <span className="text-muted">
                  {num(p.estoque)} un · {money(p.estoque * p.precoCusto)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card mt-6 overflow-x-auto">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Mais movimentados (saídas no período)</h2>
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Produto</th>
              <th className="th text-right">Saídas</th>
              <th className="th text-right">Estoque atual</th>
              <th className="th text-right">Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {maisSaida.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={4}>
                  Sem saídas no período.
                </td>
              </tr>
            )}
            {maisSaida.slice(0, 15).map(({ prod, qtd }) => {
              const porDia = qtd / dias;
              const cobertura = porDia > 0 ? prod.estoque / porDia : Infinity;
              return (
                <tr key={prod.id} className="border-t border-border">
                  <td className="td">
                    {prod.nome}{" "}
                    <span className="font-mono text-xs text-muted">{prod.sku}</span>
                  </td>
                  <td className="td text-right font-medium">{num(qtd)}</td>
                  <td className="td text-right">{num(prod.estoque)}</td>
                  <td
                    className={`td text-right ${
                      cobertura < 7 ? "text-red-600" : "text-muted"
                    }`}
                  >
                    {Number.isFinite(cobertura) ? `${cobertura.toFixed(0)} dias` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Card({
  title,
  value,
  accent = "",
}: {
  title: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <p className={`mt-2 text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
