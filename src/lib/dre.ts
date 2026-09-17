import type { ScopedDb } from "@/lib/tenant-db";
import type { Period } from "@/lib/period";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Classifica uma categoria de saída de caixa num grupo do DRE */
export function grupoDespesa(categoria: string | null | undefined): string {
  const c = (categoria ?? "").toLowerCase();
  if (/transfer/.test(c)) return "IGNORAR";
  if (/compra|mercadoria|estoque|fornecedor|cmv/.test(c)) return "IGNORAR"; // compra de estoque vira CMV
  if (/imposto|tribut|simples|\bdas\b|icms|iss|pis|cofins/.test(c)) return "Impostos e taxas";
  if (/sal[aá]rio|folha|pr[oó].?labore|comiss|f[ée]rias|f?gts|inss|vale|benef[ií]cio/.test(c))
    return "Pessoal";
  if (/aluguel|energia|luz|[aá]gua|condom|iptu|internet|telefone|ocupa/.test(c))
    return "Ocupação e utilidades";
  if (/marketing|propaganda|an[uú]ncio|publicidade/.test(c)) return "Marketing";
  if (/manuten|equipamento|ferramenta|ve[ií]culo|combust/.test(c)) return "Manutenção e equipamentos";
  if (/banc|tarifa|juro|taxa|cart[aã]o|financ/.test(c)) return "Despesas financeiras";
  return "Despesas administrativas";
}

export interface DreLine {
  label: string;
  valor: number;
  tipo: "receita" | "deducao" | "custo" | "despesa" | "subtotal" | "resultado";
  detalhe?: { label: string; valor: number }[];
}

export interface Dre {
  linhas: DreLine[];
  receitaBruta: number;
  receitaLiquida: number;
  lucroBruto: number;
  resultado: number;
  margemBruta: number;
  margemLiquida: number;
}

/** Monta o DRE gerencial (regime de competência) do período. */
export async function montarDre(db: ScopedDb, p: Period): Promise<Dre> {
  const range = { gte: p.de, lte: p.ate };

  const [vendas, osConcluidas, notasAutorizadas, cmvMov, saidasCaixa] =
    await Promise.all([
      db.sale.aggregate({
        _sum: { total: true },
        _count: true,
        where: { status: "FINALIZADA", finalizadaEm: range },
      }),
      db.serviceOrder.findMany({
        where: { status: { in: ["CONCLUIDA", "ENTREGUE"] }, concluidaEm: range },
        select: { totalServicos: true, totalPecas: true },
      }),
      db.invoice.findMany({
        where: { status: "AUTORIZADA", emitidaEm: range },
        select: { valorIcms: true, valorIss: true },
      }),
      db.stockMovement.findMany({
        where: {
          tipo: "SAIDA",
          origem: { in: ["VENDA", "OS"] },
          createdAt: range,
        },
        select: { quantidade: true, custoUnit: true },
      }),
      db.cashTransaction.findMany({
        where: { tipo: "SAIDA", data: range, cancelado: false },
        select: { valor: true, categoria: true },
      }),
    ]);

  const receitaVendas = r2(vendas._sum.total ?? 0);
  const receitaServicos = r2(
    osConcluidas.reduce((s, o) => s + o.totalServicos, 0),
  );
  // peças de OS entram como "vendas" (mercadoria)
  const receitaPecasOs = r2(osConcluidas.reduce((s, o) => s + o.totalPecas, 0));
  const receitaBruta = r2(receitaVendas + receitaPecasOs + receitaServicos);

  const impostos = r2(
    notasAutorizadas.reduce((s, n) => s + n.valorIcms + n.valorIss, 0),
  );
  const receitaLiquida = r2(receitaBruta - impostos);

  const cmv = r2(cmvMov.reduce((s, m) => s + m.quantidade * m.custoUnit, 0));
  const lucroBruto = r2(receitaLiquida - cmv);

  const gruposMap = new Map<string, number>();
  for (const t of saidasCaixa) {
    const g = grupoDespesa(t.categoria);
    if (g === "IGNORAR") continue;
    gruposMap.set(g, r2((gruposMap.get(g) ?? 0) + t.valor));
  }
  // Impostos pagos em caixa entram junto das deduções? Mantemos como despesa separada
  // já classificada em "Impostos e taxas" para não duplicar com os impostos das notas.
  const despesasDetalhe = [...gruposMap.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
  const despesasTotal = r2(despesasDetalhe.reduce((s, d) => s + d.valor, 0));

  const resultado = r2(lucroBruto - despesasTotal);

  const linhas: DreLine[] = [
    {
      label: "Receita bruta",
      valor: receitaBruta,
      tipo: "receita",
      detalhe: [
        { label: "Vendas de mercadorias (PDV)", valor: receitaVendas },
        { label: "Peças em ordens de serviço", valor: receitaPecasOs },
        { label: "Serviços prestados", valor: receitaServicos },
      ],
    },
    { label: "(−) Impostos sobre vendas (notas)", valor: -impostos, tipo: "deducao" },
    { label: "= Receita líquida", valor: receitaLiquida, tipo: "subtotal" },
    { label: "(−) CMV — custo das peças vendidas", valor: -cmv, tipo: "custo" },
    { label: "= Lucro bruto", valor: lucroBruto, tipo: "subtotal" },
    {
      label: "(−) Despesas operacionais",
      valor: -despesasTotal,
      tipo: "despesa",
      detalhe: despesasDetalhe.map((d) => ({ label: d.label, valor: -d.valor })),
    },
    { label: "= Resultado do período", valor: resultado, tipo: "resultado" },
  ];

  return {
    linhas,
    receitaBruta,
    receitaLiquida,
    lucroBruto,
    resultado,
    margemBruta: receitaBruta ? (lucroBruto / receitaBruta) * 100 : 0,
    margemLiquida: receitaBruta ? (resultado / receitaBruta) * 100 : 0,
  };
}
