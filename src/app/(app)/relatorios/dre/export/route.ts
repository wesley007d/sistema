import { requireDbPermission } from "@/lib/auth";
import { resolvePeriod } from "@/lib/period";
import { montarDre } from "@/lib/dre";
import { csvResponse, r1, r2, type CsvCell } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { db } = await requireDbPermission("relatorios");
  const u = new URL(req.url);
  const period = resolvePeriod({
    de: u.searchParams.get("de") ?? undefined,
    ate: u.searchParams.get("ate") ?? undefined,
    preset: u.searchParams.get("preset") ?? undefined,
  });

  const dre = await montarDre(db, period);
  const l: CsvCell[][] = [];

  l.push(["DRE — regime de competência", period.label]);
  l.push([]);
  l.push(["Linha", "Valor"]);
  for (const linha of dre.linhas) {
    l.push([linha.label, r2(linha.valor)]);
    for (const d of linha.detalhe ?? []) l.push([`   ${d.label}`, r2(d.valor)]);
  }
  l.push([]);
  l.push(["Margem bruta %", r1(dre.margemBruta)]);
  l.push(["Margem líquida %", r1(dre.margemLiquida)]);

  return csvResponse(`dre_${period.deStr}_a_${period.ateStr}.csv`, l);
}
