import { requireDbPermission } from "@/lib/auth";
import { carregarRelatorioTitulos } from "@/lib/relatorios";
import { csvResponse, dataBR, hojeISO, r2, type CsvCell } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const { db } = await requireDbPermission("relatorios");
  const rel = await carregarRelatorioTitulos(db);
  const l: CsvCell[][] = [];

  l.push(["Recebíveis e dívidas", `posição em ${dataBR(rel.hoje)}`]);
  l.push([]);
  l.push(["Resumo"]);
  l.push(["Total a receber", r2(rel.totalReceber)]);
  l.push(["Receber vencido", r2(rel.vencidoReceber)]);
  l.push(["Total a pagar", r2(rel.totalPagar)]);
  l.push(["Pagar vencido", r2(rel.vencidoPagar)]);
  l.push([]);
  l.push(["Contas a receber (aging)"]);
  l.push(["Faixa", "Valor"]);
  for (const b of rel.receber) l.push([b.label, r2(b.valor)]);
  l.push([]);
  l.push(["Contas a pagar (aging)"]);
  l.push(["Faixa", "Valor"]);
  for (const b of rel.pagar) l.push([b.label, r2(b.valor)]);
  l.push([]);
  l.push(["Maiores devedores (clientes)"]);
  l.push(["Parceiro", "Saldo"]);
  for (const p of rel.topReceber) l.push([p.nome, r2(p.valor)]);
  l.push([]);
  l.push(["Maiores credores (fornecedores)"]);
  l.push(["Parceiro", "Saldo"]);
  for (const p of rel.topPagar) l.push([p.nome, r2(p.valor)]);
  l.push([]);
  l.push(["Títulos em aberto"]);
  l.push([
    "Tipo",
    "Parceiro",
    "Descrição",
    "Categoria",
    "Vencimento",
    "Dias p/ vencer",
    "Valor",
    "Valor pago",
    "Saldo",
  ]);
  for (const t of rel.titulos)
    l.push([
      t.tipo,
      t.parceiro,
      t.descricao,
      t.categoria,
      dataBR(t.vencimento),
      t.dias,
      r2(t.valor),
      r2(t.valorPago),
      r2(t.saldo),
    ]);

  return csvResponse(`recebiveis_e_dividas_${hojeISO()}.csv`, l);
}
