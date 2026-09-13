import { Fragment } from "react";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ReportNav } from "@/components/ReportNav";
import { PeriodFilter } from "@/components/PeriodFilter";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { money } from "@/lib/format";
import { resolvePeriod } from "@/lib/period";
import { montarDre } from "@/lib/dre";

export const dynamic = "force-dynamic";

export default async function DrePage({
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
  const dre = await montarDre(db, period);

  return (
    <div>
      <PageHeader
        title="DRE"
        subtitle="Demonstrativo de Resultado — regime de competência"
        action={
          <div className="flex gap-2">
            <ExportPdfButton href={`/relatorios/dre/imprimir${qs}`} />
            <ExportCsvButton href={`/relatorios/dre/export${qs}`} />
          </div>
        }
      />
      <ReportNav active="/relatorios/dre" query={qs} />
      <PeriodFilter period={period} basePath="/relatorios/dre" preset={sp.preset} />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {dre.linhas.map((l, i) => {
              const forte =
                l.tipo === "subtotal" || l.tipo === "resultado" || l.tipo === "receita";
              return (
                <Fragment key={i}>
                  <tr
                    className={`border-t border-border ${
                      l.tipo === "resultado"
                        ? "bg-primary/5"
                        : l.tipo === "subtotal"
                          ? "bg-background"
                          : ""
                    }`}
                  >
                    <td className={`td ${forte ? "font-semibold" : ""}`}>
                      {l.label}
                    </td>
                    <td
                      className={`td text-right tabular-nums ${
                        forte ? "font-semibold" : ""
                      } ${l.valor < 0 ? "text-red-600" : ""}`}
                    >
                      {money(l.valor)}
                    </td>
                  </tr>
                  {l.detalhe?.map((d, j) => (
                    <tr key={`${i}-${j}`} className="text-xs text-muted">
                      <td className="td py-1 pl-8">{d.label}</td>
                      <td className="td py-1 text-right tabular-nums">
                        {money(d.valor)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs uppercase text-muted">Margem bruta</p>
          <p className="mt-1 text-2xl font-bold">{dre.margemBruta.toFixed(1)}%</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-muted">Margem líquida</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              dre.resultado < 0 ? "text-red-600" : "text-primary"
            }`}
          >
            {dre.margemLiquida.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border bg-surface p-4 text-xs text-muted">
        <p className="mb-1 font-medium text-foreground">Como o DRE é calculado</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <b>Receita</b>: vendas finalizadas no PDV + peças e serviços de OS
            concluídas no período.
          </li>
          <li>
            <b>Impostos</b>: ICMS + ISS das notas fiscais autorizadas no período.
          </li>
          <li>
            <b>CMV</b>: custo real das peças que saíram do estoque por venda ou OS
            (quantidade × preço de custo).
          </li>
          <li>
            <b>Despesas operacionais</b>: saídas de caixa do período, agrupadas por
            categoria. Compras de estoque e transferências entre contas não entram
            (viram CMV quando os itens são vendidos).
          </li>
        </ul>
      </div>
    </div>
  );
}
