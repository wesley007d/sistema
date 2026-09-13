import { Fragment } from "react";
import { requireDb } from "@/lib/auth";
import { resolvePeriod } from "@/lib/period";
import { montarDre } from "@/lib/dre";
import { money } from "@/lib/format";
import { ReportPrintLayout } from "@/components/ReportPrintLayout";

export const dynamic = "force-dynamic";

export default async function ImprimirDrePage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; preset?: string }>;
}) {
  const { user, db } = await requireDb();
  const sp = await searchParams;
  const period = resolvePeriod(sp);
  const [dre, company] = await Promise.all([
    montarDre(db, period),
    db.company.findUnique({ where: { id: user.companyId } }),
  ]);

  return (
    <ReportPrintLayout
      empresa={company}
      titulo="DRE"
      subtitulo={`Regime de competência · ${period.label}`}
    >
      <table className="w-full border-collapse border border-black">
        <tbody>
          {dre.linhas.map((l, i) => {
            const forte =
              l.tipo === "subtotal" || l.tipo === "resultado" || l.tipo === "receita";
            return (
              <Fragment key={i}>
                <tr className={l.tipo === "resultado" ? "bg-gray-100" : ""}>
                  <td className={`border border-black p-1 ${forte ? "font-bold" : ""}`}>
                    {l.label}
                  </td>
                  <td
                    className={`border border-black p-1 text-right ${
                      forte ? "font-bold" : ""
                    }`}
                  >
                    {money(l.valor)}
                  </td>
                </tr>
                {l.detalhe?.map((d, j) => (
                  <tr key={`${i}-${j}`}>
                    <td className="border border-black p-1 pl-6 text-xs">{d.label}</td>
                    <td className="border border-black p-1 text-right text-xs">
                      {money(d.valor)}
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex gap-8">
        <p>
          Margem bruta: <b>{dre.margemBruta.toFixed(1)}%</b>
        </p>
        <p>
          Margem líquida: <b>{dre.margemLiquida.toFixed(1)}%</b>
        </p>
      </div>
    </ReportPrintLayout>
  );
}
