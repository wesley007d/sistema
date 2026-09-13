import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ReportNav } from "@/components/ReportNav";
import { PeriodFilter } from "@/components/PeriodFilter";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { money, num } from "@/lib/format";
import { resolvePeriod } from "@/lib/period";
import { carregarRelatorioVendas } from "@/lib/relatorios";

export const dynamic = "force-dynamic";

export default async function RelatorioVendasPage({
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

  const { pagamentos, porOperador, maisVendidos, maisServicos } =
    await carregarRelatorioVendas(db, period);

  const topVendidos = maisVendidos.slice(0, 15);
  const topServicos = maisServicos.slice(0, 10);
  const totalPag = pagamentos.reduce((s, p) => s + p.valor, 0) || 1;

  return (
    <div>
      <PageHeader
        title="Relatório de vendas"
        subtitle="Produtos, pagamentos e operadores"
        action={
          <div className="flex gap-2">
            <ExportPdfButton href={`/relatorios/vendas/imprimir${qs}`} />
            <ExportCsvButton href={`/relatorios/vendas/export${qs}`} />
          </div>
        }
      />
      <ReportNav active="/relatorios/vendas" query={qs} />
      <PeriodFilter period={period} basePath="/relatorios/vendas" preset={sp.preset} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <header className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Formas de pagamento</h2>
          </header>
          <div className="divide-y divide-border text-sm">
            {pagamentos.length === 0 && (
              <p className="px-4 py-6 text-muted">Sem pagamentos no período.</p>
            )}
            {pagamentos.map((p) => (
              <div key={p.forma} className="px-4 py-2">
                <div className="flex justify-between">
                  <span className="capitalize">{p.forma.toLowerCase()}</span>
                  <span className="font-medium">{money(p.valor)}</span>
                </div>
                <div className="mt-1 h-2 rounded bg-background">
                  <div
                    className="h-2 rounded bg-primary"
                    style={{ width: `${(p.valor / totalPag) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <header className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Vendas por operador</h2>
          </header>
          <table className="w-full text-sm">
            <tbody>
              {porOperador.length === 0 && (
                <tr>
                  <td className="td text-muted">Sem vendas no período.</td>
                </tr>
              )}
              {porOperador.map((o) => (
                <tr key={o.nome} className="border-t border-border">
                  <td className="td">{o.nome}</td>
                  <td className="td text-right text-muted">{num(o.qtd)} vendas</td>
                  <td className="td text-right font-medium">{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card mt-6 overflow-x-auto">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Produtos mais vendidos</h2>
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Produto</th>
              <th className="th text-right">Qtd</th>
              <th className="th text-right">Receita</th>
              <th className="th text-right">Custo</th>
              <th className="th text-right">Margem</th>
            </tr>
          </thead>
          <tbody>
            {topVendidos.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={5}>
                  Sem vendas no período.
                </td>
              </tr>
            )}
            {topVendidos.map((p) => (
              <tr key={p.sku} className="border-t border-border">
                <td className="td">
                  {p.nome}{" "}
                  <span className="font-mono text-xs text-muted">{p.sku}</span>
                </td>
                <td className="td text-right">{num(p.qtd)}</td>
                <td className="td text-right font-medium">{money(p.receita)}</td>
                <td className="td text-right text-muted">{money(p.custo)}</td>
                <td
                  className={`td text-right ${
                    p.margem < 15 ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {p.margem.toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {topServicos.length > 0 && (
        <section className="card mt-6">
          <header className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Serviços mais executados (OS)</h2>
          </header>
          <table className="w-full text-sm">
            <tbody>
              {topServicos.map((s) => (
                <tr key={s.nome} className="border-t border-border">
                  <td className="td">{s.nome}</td>
                  <td className="td text-right text-muted">{num(s.qtd)}x</td>
                  <td className="td text-right font-medium">{money(s.receita)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
