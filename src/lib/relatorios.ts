import type { ScopedDb } from "@/lib/tenant-db";
import type { Period } from "@/lib/period";

/**
 * Carregadores dos relatórios gerenciais. As telas em "relatorios" e as rotas
 * de exportação CSV usam exatamente estes dados — a tela mostra um recorte
 * (top N), o CSV leva a lista inteira.
 */

const VENDA_FINALIZADA = (range: { gte: Date; lte: Date }) => ({
  status: "FINALIZADA",
  finalizadaEm: range,
});

// ---------------------------------------------------------------------------
// Vendas
// ---------------------------------------------------------------------------

export interface RelVendas {
  pagamentos: { forma: string; valor: number; qtd: number }[];
  porOperador: { nome: string; qtd: number; total: number }[];
  maisVendidos: {
    nome: string;
    sku: string;
    qtd: number;
    receita: number;
    custo: number;
    margem: number;
  }[];
  maisServicos: { nome: string; qtd: number; receita: number }[];
}

export async function carregarRelatorioVendas(
  db: ScopedDb,
  period: Period,
): Promise<RelVendas> {
  const range = { gte: period.de, lte: period.ate };
  const vendaFinalizada = VENDA_FINALIZADA(range);

  const [itensAgg, pagamentosAgg, porOperadorAgg, servicosAgg] =
    await Promise.all([
      db.saleItem.groupBy({
        by: ["productId"],
        where: { sale: vendaFinalizada, productId: { not: null } },
        _sum: { quantidade: true, total: true },
      }),
      db.salePayment.groupBy({
        by: ["forma"],
        where: { sale: vendaFinalizada },
        _sum: { valor: true },
        _count: true,
      }),
      db.sale.groupBy({
        by: ["operadorId"],
        where: vendaFinalizada,
        _sum: { total: true },
        _count: true,
      }),
      db.serviceOrderItem.groupBy({
        by: ["serviceId"],
        where: {
          tipo: "SERVICO",
          serviceOrder: {
            status: { in: ["CONCLUIDA", "ENTREGUE"] },
            concluidaEm: range,
          },
        },
        _sum: { quantidade: true, total: true },
      }),
    ]);

  const prodIds = itensAgg.map((i) => i.productId).filter(Boolean) as string[];
  const servIds = servicosAgg.map((i) => i.serviceId).filter(Boolean) as string[];
  const opIds = porOperadorAgg
    .map((o) => o.operadorId)
    .filter(Boolean) as string[];

  const [prods, servs, ops] = await Promise.all([
    db.product.findMany({ where: { id: { in: prodIds } } }),
    db.service.findMany({ where: { id: { in: servIds } } }),
    db.user.findMany({ where: { id: { in: opIds } } }),
  ]);

  const maisVendidos = itensAgg
    .map((i) => {
      const p = prods.find((x) => x.id === i.productId);
      const qtd = i._sum.quantidade ?? 0;
      const receita = i._sum.total ?? 0;
      const custo = (p?.precoCusto ?? 0) * qtd;
      return {
        nome: p?.nome ?? "—",
        sku: p?.sku ?? "",
        qtd,
        receita,
        custo,
        margem: receita > 0 ? ((receita - custo) / receita) * 100 : 0,
      };
    })
    .sort((a, b) => b.receita - a.receita);

  const maisServicos = servicosAgg
    .map((i) => ({
      nome: servs.find((x) => x.id === i.serviceId)?.nome ?? "—",
      qtd: i._sum.quantidade ?? 0,
      receita: i._sum.total ?? 0,
    }))
    .sort((a, b) => b.receita - a.receita);

  const pagamentos = pagamentosAgg
    .map((p) => ({ forma: p.forma, valor: p._sum.valor ?? 0, qtd: p._count }))
    .sort((a, b) => b.valor - a.valor);

  const porOperador = porOperadorAgg
    .map((o) => ({
      nome: ops.find((u) => u.id === o.operadorId)?.nome ?? "—",
      qtd: o._count,
      total: o._sum.total ?? 0,
    }))
    .sort((a, b) => b.total - a.total);

  return { pagamentos, porOperador, maisVendidos, maisServicos };
}

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

type ProdutoEstoque = {
  id: string;
  sku: string;
  nome: string;
  estoque: number;
  estoqueMinimo: number;
  precoCusto: number;
  precoVenda: number;
};

export interface RelEstoque {
  dias: number;
  resumo: {
    ativos: number;
    comEstoque: number;
    valorCusto: number;
    valorVenda: number;
  };
  produtos: ProdutoEstoque[];
  abaixoMin: ProdutoEstoque[];
  semGiro: ProdutoEstoque[];
  maisSaida: { prod: ProdutoEstoque; qtd: number }[];
}

export async function carregarRelatorioEstoque(
  db: ScopedDb,
  period: Period,
): Promise<RelEstoque> {
  const range = { gte: period.de, lte: period.ate };

  const [produtos, abaixoMin, saidasAgg] = await Promise.all([
    db.product.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.product.findMany({
      where: { ativo: true, estoque: { lte: db.product.fields.estoqueMinimo } },
      orderBy: { estoque: "asc" },
    }),
    db.stockMovement.groupBy({
      by: ["productId"],
      where: {
        tipo: "SAIDA",
        origem: { in: ["VENDA", "OS", "NFE"] },
        createdAt: range,
      },
      _sum: { quantidade: true },
    }),
  ]);

  const slim = (p: (typeof produtos)[number]): ProdutoEstoque => ({
    id: p.id,
    sku: p.sku,
    nome: p.nome,
    estoque: p.estoque,
    estoqueMinimo: p.estoqueMinimo,
    precoCusto: p.precoCusto,
    precoVenda: p.precoVenda,
  });

  const valorCusto = produtos.reduce((s, p) => s + p.estoque * p.precoCusto, 0);
  const valorVenda = produtos.reduce((s, p) => s + p.estoque * p.precoVenda, 0);
  const comEstoque = produtos.filter((p) => p.estoque > 0).length;

  const movMap = new Map(
    saidasAgg.map((s) => [s.productId, s._sum.quantidade ?? 0]),
  );

  const maisSaida = [...movMap.entries()]
    .map(([id, qtd]) => {
      const prod = produtos.find((p) => p.id === id);
      return prod ? { prod: slim(prod), qtd } : null;
    })
    .filter((x): x is { prod: ProdutoEstoque; qtd: number } => x !== null)
    .sort((a, b) => b.qtd - a.qtd);

  const semGiro = produtos
    .filter((p) => p.estoque > 0 && !movMap.has(p.id))
    .sort((a, b) => b.estoque * b.precoCusto - a.estoque * a.precoCusto)
    .map(slim);

  return {
    dias: period.dias,
    resumo: { ativos: produtos.length, comEstoque, valorCusto, valorVenda },
    produtos: produtos.map(slim),
    abaixoMin: abaixoMin.map(slim),
    semGiro,
    maisSaida,
  };
}

// ---------------------------------------------------------------------------
// Recebíveis e dívidas (aging)
// ---------------------------------------------------------------------------

export interface AgingBucket {
  label: string;
  min: number;
  max: number;
  valor: number;
}

function novoBuckets(): AgingBucket[] {
  return [
    { label: "Vencido", min: -Infinity, max: -1, valor: 0 },
    { label: "Vence em 0–7 dias", min: 0, max: 7, valor: 0 },
    { label: "8–30 dias", min: 8, max: 30, valor: 0 },
    { label: "31–60 dias", min: 31, max: 60, valor: 0 },
    { label: "60+ dias", min: 61, max: Infinity, valor: 0 },
  ];
}

export interface TituloAberto {
  tipo: string;
  parceiro: string;
  descricao: string;
  categoria: string;
  vencimento: Date;
  dias: number;
  valor: number;
  valorPago: number;
  saldo: number;
}

export interface RelTitulos {
  hoje: Date;
  receber: AgingBucket[];
  pagar: AgingBucket[];
  topReceber: { nome: string; valor: number }[];
  topPagar: { nome: string; valor: number }[];
  totalReceber: number;
  totalPagar: number;
  vencidoReceber: number;
  vencidoPagar: number;
  titulos: TituloAberto[];
}

export async function carregarRelatorioTitulos(
  db: ScopedDb,
): Promise<RelTitulos> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const abertos = await db.financialEntry.findMany({
    where: { status: { in: ["ABERTO", "PARCIAL"] } },
    include: { partner: true },
    orderBy: { vencimento: "asc" },
  });

  const receber = novoBuckets();
  const pagar = novoBuckets();
  const porParceiroReceber = new Map<string, { nome: string; valor: number }>();
  const porParceiroPagar = new Map<string, { nome: string; valor: number }>();
  const titulos: TituloAberto[] = [];

  for (const t of abertos) {
    const saldo = t.valor - t.valorPago;
    if (saldo <= 0.001) continue;
    const dias = Math.round((t.vencimento.getTime() - hoje.getTime()) / 864e5);

    const buckets = t.tipo === "RECEBER" ? receber : pagar;
    const b = buckets.find((x) => dias >= x.min && dias <= x.max);
    if (b) b.valor += saldo;

    const mapa = t.tipo === "RECEBER" ? porParceiroReceber : porParceiroPagar;
    const key = t.partnerId ?? "sem";
    const nome = t.partner?.nome ?? "Sem parceiro";
    const cur = mapa.get(key) ?? { nome, valor: 0 };
    cur.valor += saldo;
    mapa.set(key, cur);

    titulos.push({
      tipo: t.tipo,
      parceiro: nome,
      descricao: t.descricao,
      categoria: t.categoria ?? "",
      vencimento: t.vencimento,
      dias,
      valor: t.valor,
      valorPago: t.valorPago,
      saldo,
    });
  }

  const totalReceber = receber.reduce((s, b) => s + b.valor, 0);
  const totalPagar = pagar.reduce((s, b) => s + b.valor, 0);

  const topReceber = [...porParceiroReceber.values()].sort(
    (a, b) => b.valor - a.valor,
  );
  const topPagar = [...porParceiroPagar.values()].sort(
    (a, b) => b.valor - a.valor,
  );

  return {
    hoje,
    receber,
    pagar,
    topReceber,
    topPagar,
    totalReceber,
    totalPagar,
    vencidoReceber: receber[0].valor,
    vencidoPagar: pagar[0].valor,
    titulos,
  };
}
