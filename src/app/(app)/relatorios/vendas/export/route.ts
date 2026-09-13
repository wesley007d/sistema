import { requireDbPermission } from "@/lib/auth";
import { resolvePeriod } from "@/lib/period";
import { carregarRelatorioVendas } from "@/lib/relatorios";
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

  const rel = await carregarRelatorioVendas(db, period);
  const l: CsvCell[][] = [];

  l.push(["Relatório de vendas", period.label]);
  l.push([]);
  l.push(["Formas de pagamento"]);
  l.push(["Forma", "Qtd", "Valor"]);
  for (const p of rel.pagamentos) l.push([p.forma, p.qtd, r2(p.valor)]);
  l.push([]);
  l.push(["Vendas por operador"]);
  l.push(["Operador", "Qtd vendas", "Total"]);
  for (const o of rel.porOperador) l.push([o.nome, o.qtd, r2(o.total)]);
  l.push([]);
  l.push(["Produtos mais vendidos"]);
  l.push(["Produto", "SKU", "Qtd", "Receita", "Custo", "Margem %"]);
  for (const p of rel.maisVendidos)
    l.push([p.nome, p.sku, p.qtd, r2(p.receita), r2(p.custo), r1(p.margem)]);
  l.push([]);
  l.push(["Serviços mais executados (OS)"]);
  l.push(["Serviço", "Qtd", "Receita"]);
  for (const s of rel.maisServicos) l.push([s.nome, s.qtd, r2(s.receita)]);

  return csvResponse(`vendas_${period.deStr}_a_${period.ateStr}.csv`, l);
}
