import Link from "next/link";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ReportNav } from "@/components/ReportNav";
import { PeriodFilter } from "@/components/PeriodFilter";
import { money, num } from "@/lib/format";
import { resolvePeriod } from "@/lib/period";

export const dynamic = "force-dynamic";

const CORES: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-amber-100 text-amber-800",
  C: "bg-gray-100 text-gray-600",
};

/** Classifica já ordenado por faturamento (maior primeiro). */
function classificarAbc<T extends { total: number }>(ordenadas: T[], totalGeral: number) {
  let acumulado = 0;
  return ordenadas.map((l) => {
    // a curva sai do acumulado ANTES da peça: a primeira é sempre A
    const antes = totalGeral > 0 ? (acumulado / totalGeral) * 100 : 0;
    acumulado += l.total;
    return {
      ...l,
      pct: totalGeral > 0 ? (l.total / totalGeral) * 100 : 0,
      pctAcumulado: totalGeral > 0 ? (acumulado / totalGeral) * 100 : 0,
      curva: antes < 80 ? "A" : antes < 95 ? "B" : "C",
    };
  });
}

/**
 * Curva ABC das peças vendidas no período: A = peças que somam os primeiros
 * 80% do faturamento, B = até 95%, C = o resto. Mais as peças paradas (com
 * estoque e nenhuma venda no período) — dinheiro parado na prateleira.
 */
export default async function CurvaAbcPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; preset?: string; curva?: string }>;
}) {
  const { db } = await requireDb();
  const sp = await searchParams;
  const period = resolvePeriod(sp);
  const qs = sp.preset
    ? `?preset=${sp.preset}`
    : sp.de || sp.ate
      ? `?de=${period.deStr}&ate=${period.ateStr}`
      : "";
  const filtro = ["A", "B", "C"].includes(sp.curva ?? "") ? sp.curva! : null;

  const grupos = await db.saleItem.groupBy({
    by: ["productId"],
    where: {
      tipo: "PECA",
      productId: { not: null },
      sale: { status: "FINALIZADA", finalizadaEm: { gte: period.de, lte: period.ate } },
    },
    _sum: { quantidade: true, total: true },
  });
  const ids = grupos.map((g) => g.productId as string);
  const campos = {
    id: true,
    sku: true,
    nome: true,
    marca: true,
    unidade: true,
    precoCusto: true,
    estoque: true,
  } as const;
  const [produtos, parados] = await Promise.all([
    db.product.findMany({ where: { id: { in: ids } }, select: campos }),
    db.product.findMany({
      where: { ativo: true, estoque: { gt: 0 }, id: { notIn: ids } },
      select: campos,
    }),
  ]);
  const porId = new Map(produtos.map((p) => [p.id, p]));

  const ordenadas = grupos
    .map((g) => {
      const p = porId.get(g.productId as string);
      const qtd = g._sum.quantidade ?? 0;
      const total = g._sum.total ?? 0;
      return {
        id: g.productId as string,
        sku: p?.sku ?? "",
        nome: p?.nome ?? "Produto excluído",
        marca: p?.marca ?? null,
        unidade: p?.unidade ?? "UN",
        estoque: p?.estoque ?? 0,
        qtd,
        total,
        // custo atual do cadastro (o custo da época da venda não fica gravado)
        lucro: total - qtd * (p?.precoCusto ?? 0),
      };
    })
    .sort((a, b) => b.total - a.total);

  const totalGeral = ordenadas.reduce((s, l) => s + l.total, 0);
  const linhas = classificarAbc(ordenadas, totalGeral);

  const resumo = (["A", "B", "C"] as const).map((c) => {
    const ls = linhas.filter((l) => l.curva === c);
    const fat = ls.reduce((s, l) => s + l.total, 0);
    return { curva: c, pecas: ls.length, fat, pct: totalGeral > 0 ? (fat / totalGeral) * 100 : 0 };
  });
  const visiveis = filtro ? linhas.filter((l) => l.curva === filtro) : linhas;

  const valorParado = parados.reduce((s, p) => s + p.estoque * p.precoCusto, 0);
  const paradosOrdenados = [...parados].sort(
    (a, b) => b.estoque * b.precoCusto - a.estoque * a.precoCusto,
  );

  const linkCurva = (c: string | null) => {
    const base = new URLSearchParams(qs.replace(/^\?/, ""));
    if (c) base.set("curva", c);
    const s = base.toString();
    return `/relatorios/curva-abc${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Curva ABC — quais peças mais faturam, para nunca faltarem no estoque"
      />
      <ReportNav active="/relatorios/curva-abc" query={qs} />
      <PeriodFilter period={period} basePath="/relatorios/curva-abc" preset={sp.preset} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {resumo.map((r) => (
          <Link
            key={r.curva}
            href={linkCurva(filtro === r.curva ? null : r.curva)}
            className={`card p-4 transition hover:shadow-md ${filtro === r.curva ? "ring-2 ring-primary" : ""}`}
          >
            <span className={`badge ${CORES[r.curva]}`}>Curva {r.curva}</span>
            <p className="mt-2 text-2xl font-bold">{num(r.pecas)} peça(s)</p>
            <p className="text-sm text-muted">
              {money(r.fat)} · {r.pct.toFixed(1)}% do faturamento
            </p>
          </Link>
        ))}
      </div>

      <section className="card overflow-x-auto">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold">
            Peças vendidas no período{filtro ? ` — só curva ${filtro}` : ""}
          </h2>
          {filtro && (
            <Link href={linkCurva(null)} className="text-sm text-primary">
              mostrar todas
            </Link>
          )}
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th w-14">Curva</th>
              <th className="th">Peça</th>
              <th className="th text-right">Qtd</th>
              <th className="th text-right">Faturamento</th>
              <th className="th text-right">% do total</th>
              <th className="th text-right">% acumulado</th>
              <th className="th text-right">Lucro estimado</th>
              <th className="th text-right">Estoque atual</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={8}>
                  Nenhuma peça vendida neste período.
                </td>
              </tr>
            )}
            {visiveis.map((l) => {
              const faltando = l.curva === "A" && l.estoque <= 0;
              return (
                <tr key={l.id}>
                  <td className="td">
                    <span className={`badge ${CORES[l.curva]}`}>{l.curva}</span>
                  </td>
                  <td className="td">
                    <Link href={`/produtos/${l.id}`} className="hover:text-primary">
                      {l.nome}
                    </Link>
                    <span className="block text-xs text-muted">
                      {l.sku}
                      {l.marca ? ` · ${l.marca}` : ""}
                    </span>
                  </td>
                  <td className="td text-right">
                    {num(l.qtd)} {l.unidade}
                  </td>
                  <td className="td text-right font-medium">{money(l.total)}</td>
                  <td className="td text-right">{l.pct.toFixed(1)}%</td>
                  <td className="td text-right text-muted">{l.pctAcumulado.toFixed(1)}%</td>
                  <td
                    className={`td text-right ${l.lucro < 0 ? "text-red-600" : "text-green-700"}`}
                  >
                    {money(l.lucro)}
                  </td>
                  <td
                    className={`td text-right ${faltando ? "font-semibold text-red-600" : ""}`}
                    title={faltando ? "Peça curva A sem estoque — repor!" : undefined}
                  >
                    {num(l.estoque)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {linhas.length > 0 && !filtro && (
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <td className="td" colSpan={3}>
                  Total
                </td>
                <td className="td text-right">{money(totalGeral)}</td>
                <td className="td" colSpan={2}></td>
                <td className="td text-right">
                  {money(linhas.reduce((s, l) => s + l.lucro, 0))}
                </td>
                <td className="td"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>
      <p className="mt-2 text-xs text-muted">
        <b>A</b>: as peças que somam os primeiros 80% do faturamento — não podem faltar ·{" "}
        <b>B</b>: até 95% · <b>C</b>: o restante, de baixo giro. Estoque em vermelho = peça A
        zerada. Lucro estimado pelo custo atual do cadastro.
      </p>

      <section className="card mt-6 overflow-x-auto">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Peças paradas no período</h2>
          <p className="text-xs text-muted">
            {num(parados.length)} peça(s) com estoque e nenhuma venda neste período —{" "}
            {money(valorParado)} parados na prateleira (pelo custo).
          </p>
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Peça</th>
              <th className="th text-right">Estoque</th>
              <th className="th text-right">Custo unit.</th>
              <th className="th text-right">Valor parado</th>
            </tr>
          </thead>
          <tbody>
            {paradosOrdenados.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={4}>
                  Nenhuma peça parada — tudo que tem estoque vendeu no período.
                </td>
              </tr>
            )}
            {paradosOrdenados.slice(0, 50).map((p) => (
              <tr key={p.id}>
                <td className="td">
                  <Link href={`/produtos/${p.id}`} className="hover:text-primary">
                    {p.nome}
                  </Link>
                  <span className="block text-xs text-muted">
                    {p.sku}
                    {p.marca ? ` · ${p.marca}` : ""}
                  </span>
                </td>
                <td className="td text-right">
                  {num(p.estoque)} {p.unidade}
                </td>
                <td className="td text-right">{money(p.precoCusto)}</td>
                <td className="td text-right font-medium">
                  {money(p.estoque * p.precoCusto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {paradosOrdenados.length > 50 && (
          <p className="px-4 py-2 text-xs text-muted">
            Mostrando as 50 de maior valor parado, de {num(paradosOrdenados.length)}.
          </p>
        )}
      </section>
    </div>
  );
}
