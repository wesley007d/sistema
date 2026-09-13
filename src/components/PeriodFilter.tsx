import Link from "next/link";
import type { Period } from "@/lib/period";

/** Filtro de período: presets rápidos + intervalo manual (GET form). */
export function PeriodFilter({
  period,
  basePath,
  preset,
}: {
  period: Period;
  basePath: string;
  preset?: string;
}) {
  const presets = [
    { key: "hoje", label: "Hoje" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
    { key: "mes", label: "Mês atual" },
    { key: "ano", label: "Ano" },
  ];
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => {
          const active =
            (p.key === "mes" && !preset) || preset === p.key;
          return (
            <Link
              key={p.key}
              href={
                p.key === "mes" ? basePath : `${basePath}?preset=${p.key}`
              }
              className={`badge border ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
      <form method="get" action={basePath} className="flex items-end gap-2">
        <div>
          <label className="label">De</label>
          <input type="date" name="de" defaultValue={period.deStr} className="input" />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" name="ate" defaultValue={period.ateStr} className="input" />
        </div>
        <button type="submit" className="btn-ghost">
          Aplicar
        </button>
      </form>
      <span className="text-xs text-muted">Período: {period.label}</span>
    </div>
  );
}
