import { requireDbPermission } from "@/lib/auth";
import { resolvePeriod } from "@/lib/period";
import { carregarRelatorioEstoque } from "@/lib/relatorios";
import { csvResponse, r2, type CsvCell } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { db } = await requireDbPermission("relatorios");
  const u = new URL(req.url);
  const period = resolvePeriod({
    de: u.searchParams.get("de") ?? undefined,
    ate: u.searchParams.get("ate") ?? undefined,
    preset: u.searchParams.get("preset") ?? undefined,
  });

  const rel = await carregarRelatorioEstoque(db, period);
  const l: CsvCell[][] = [];

  l.push(["Relatório de estoque", `período de giro: ${period.label}`]);
  l.push([]);
  l.push(["Resumo"]);
  l.push(["Itens ativos", rel.resumo.ativos]);
  l.push(["Com estoque", rel.resumo.comEstoque]);
  l.push(["Valor a custo", r2(rel.resumo.valorCusto)]);
  l.push(["Valor a preço de venda", r2(rel.resumo.valorVenda)]);
  l.push([]);
  l.push(["Posição de estoque (itens ativos)"]);
  l.push([
    "SKU",
    "Produto",
    "Estoque",
    "Mínimo",
    "Custo unit.",
    "Venda unit.",
    "Valor em custo",
    "Valor em venda",
  ]);
  for (const p of rel.produtos)
    l.push([
      p.sku,
      p.nome,
      p.estoque,
      p.estoqueMinimo,
      r2(p.precoCusto),
      r2(p.precoVenda),
      r2(p.estoque * p.precoCusto),
      r2(p.estoque * p.precoVenda),
    ]);
  l.push([]);
  l.push(["Abaixo do mínimo"]);
  l.push(["SKU", "Produto", "Estoque", "Mínimo"]);
  for (const p of rel.abaixoMin)
    l.push([p.sku, p.nome, p.estoque, p.estoqueMinimo]);
  l.push([]);
  l.push(["Sem giro no período"]);
  l.push(["SKU", "Produto", "Estoque", "Valor em custo"]);
  for (const p of rel.semGiro)
    l.push([p.sku, p.nome, p.estoque, r2(p.estoque * p.precoCusto)]);
  l.push([]);
  l.push(["Mais movimentados (saídas no período)"]);
  l.push(["SKU", "Produto", "Saídas", "Estoque atual", "Cobertura (dias)"]);
  for (const { prod, qtd } of rel.maisSaida) {
    const porDia = qtd / rel.dias;
    const cobertura = porDia > 0 ? prod.estoque / porDia : null;
    l.push([
      prod.sku,
      prod.nome,
      qtd,
      prod.estoque,
      cobertura === null ? "" : Math.round(cobertura),
    ]);
  }

  return csvResponse(`estoque_${period.deStr}_a_${period.ateStr}.csv`, l);
}
