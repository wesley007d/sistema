import Link from "next/link";
import { redirect } from "next/navigation";
import { money, num, dateTime, date } from "@/lib/format";
import { can, requireDb } from "@/lib/auth";
import type { ScopedDb } from "@/lib/tenant-db";
import { resolvePeriod } from "@/lib/period";
import { montarDre } from "@/lib/dre";
import { StatusBadge } from "./notas/StatusBadge";
import { OSStatusBadge } from "./ordens-servico/OSStatusBadge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, db } = await requireDb();
  // Vendedor (só PDV): a "tela de início" dele é o PDV.
  if (can(user, "pdv") && !can(user, "vendas")) redirect("/vendas/pdv");
  const verFin = !!user && can(user, "financeiro");
  // Faturamento (mês + gráfico) é indicador gerencial: só o admin geral vê.
  const verFaturamento = user.role === "ADMIN";
  const verVendas = !!user && can(user, "vendas");
  const verOS = !!user && can(user, "ordens_servico");
  const verNotas = !!user && can(user, "notas");
  const verProdutos = !!user && can(user, "produtos");
  const verXml = !!user && can(user, "xml");

  const now = new Date();
  const inicioDia = new Date(now); inicioDia.setHours(0, 0, 0, 0);
  const fimDia = new Date(now); fimDia.setHours(23, 59, 59, 999);
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const amanha = new Date(inicioDia); amanha.setDate(amanha.getDate() + 1);
  const em30 = new Date(inicioDia); em30.setDate(em30.getDate() + 30);
  const d14 = new Date(inicioDia); d14.setDate(d14.getDate() - 13);
  const mesPeriod = resolvePeriod({});

  const [
    vendasHoje, vendasMes, osMes, dre, contasAgg, caixaAgg,
    notasPendentes, osAbertas, recebVencido, pagarVencido,
    semEstoque, abaixoMin, xmlPendente,
    recebimentos30, pagamentos30, venceHoje,
    serie14Vendas, serie14OS, vendasRecentes, ultimasNotas, osRecentes, estoqueBaixo,
  ] = await Promise.all([
    db.sale.aggregate({ _sum: { total: true }, _count: true, where: { status: "FINALIZADA", finalizadaEm: { gte: inicioDia } } }),
    db.sale.aggregate({ _sum: { total: true }, _count: true, where: { status: "FINALIZADA", finalizadaEm: { gte: inicioMes } } }),
    db.serviceOrder.aggregate({ _sum: { total: true }, _count: true, where: { status: { in: ["CONCLUIDA", "ENTREGUE"] }, concluidaEm: { gte: inicioMes } } }),
    montarDre(db, mesPeriod),
    db.cashAccount.aggregate({ _sum: { saldoInicial: true }, where: { ativo: true } }),
    db.cashTransaction.groupBy({ by: ["tipo"], _sum: { valor: true } }),
    db.invoice.count({ where: { status: { in: ["RASCUNHO", "REJEITADA"] } } }),
    db.serviceOrder.count({ where: { status: { in: ["ORCAMENTO", "APROVADA", "EM_EXECUCAO"] } } }),
    sumSaldo(db, "RECEBER", { status: { in: ["ABERTO", "PARCIAL"] }, vencimento: { lt: amanha } }),
    sumSaldo(db, "PAGAR", { status: { in: ["ABERTO", "PARCIAL"] }, vencimento: { lt: amanha } }),
    db.product.count({ where: { ativo: true, estoque: { lte: 0 } } }),
    db.product.count({ where: { ativo: true, estoque: { lte: db.product.fields.estoqueMinimo } } }),
    db.xmlDocument.count({ where: { direcao: "ENTRADA", status: "IMPORTADO" } }),
    sumSaldo(db, "RECEBER", { status: { in: ["ABERTO", "PARCIAL"] }, vencimento: { lte: em30 } }),
    sumSaldo(db, "PAGAR", { status: { in: ["ABERTO", "PARCIAL"] }, vencimento: { lte: em30 } }),
    db.financialEntry.findMany({ where: { status: { in: ["ABERTO", "PARCIAL"] }, vencimento: { gte: inicioDia, lte: fimDia } }, include: { partner: true }, orderBy: { tipo: "asc" } }),
    db.sale.findMany({ where: { status: "FINALIZADA", finalizadaEm: { gte: d14 } }, select: { total: true, finalizadaEm: true } }),
    db.serviceOrder.findMany({ where: { status: { in: ["CONCLUIDA", "ENTREGUE"] }, concluidaEm: { gte: d14 } }, select: { total: true, concluidaEm: true } }),
    db.sale.findMany({ take: 5, orderBy: { numero: "desc" }, include: { partner: true } }),
    db.invoice.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { partner: true } }),
    db.serviceOrder.findMany({ take: 5, orderBy: { numero: "desc" }, include: { partner: true, vehicle: true } }),
    db.product.findMany({ where: { ativo: true, estoque: { lte: db.product.fields.estoqueMinimo } }, orderBy: { estoque: "asc" }, take: 6 }),
  ]);

  const saldoCaixa =
    (contasAgg._sum.saldoInicial ?? 0) +
    (caixaAgg.find((c) => c.tipo === "ENTRADA")?._sum.valor ?? 0) -
    (caixaAgg.find((c) => c.tipo === "SAIDA")?._sum.valor ?? 0);
  const fatMes = (vendasMes._sum.total ?? 0) + (osMes._sum.total ?? 0);

  // série 14 dias
  const dias: { k: string; vendas: number; os: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(d14); d.setDate(d.getDate() + i);
    dias.push({ k: d.toISOString().slice(0, 10), vendas: 0, os: 0 });
  }
  const idx = new Map(dias.map((d, i) => [d.k, i]));
  for (const v of serie14Vendas) {
    const i = idx.get((v.finalizadaEm ?? now).toISOString().slice(0, 10));
    if (i != null) dias[i].vendas += v.total;
  }
  for (const o of serie14OS) {
    const i = idx.get((o.concluidaEm ?? now).toISOString().slice(0, 10));
    if (i != null) dias[i].os += o.total;
  }
  const maxDia = Math.max(1, ...dias.map((d) => d.vendas + d.os));

  const alertas = [
    verNotas && notasPendentes > 0 && { txt: `${notasPendentes} nota(s) em rascunho ou rejeitada(s)`, href: "/notas" },
    verOS && osAbertas > 0 && { txt: `${osAbertas} OS em aberto (orçamento / execução)`, href: "/ordens-servico" },
    verFin && recebVencido > 0 && { txt: `${money(recebVencido)} a receber vencido`, href: "/financeiro/titulos?f=vencidos" },
    verFin && pagarVencido > 0 && { txt: `${money(pagarVencido)} a pagar vencido`, href: "/financeiro/titulos?f=vencidos" },
    verProdutos && semEstoque > 0 && { txt: `${semEstoque} produto(s) sem estoque`, href: "/produtos" },
    verProdutos && abaixoMin > semEstoque && { txt: `${abaixoMin} produto(s) no/abaixo do mínimo`, href: "/produtos" },
    verXml && xmlPendente > 0 && { txt: `${xmlPendente} XML de entrada não lançado`, href: "/xml" },
  ].filter(Boolean) as { txt: string; href: string }[];

  const acoes = [
    verVendas && { href: "/vendas/pdv", label: "Nova venda (PDV)" },
    verOS && { href: "/ordens-servico/nova", label: "Nova OS" },
    verNotas && { href: "/notas/nova-nfe", label: "Emitir NF-e" },
    verXml && { href: "/xml", label: "Importar XML" },
    verProdutos && { href: "/produtos/novo", label: "Novo produto" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Olá, {user?.nome?.split(" ")[0] ?? "bem-vindo"} 👋
          </h1>
          <p className="text-muted">
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>
        {acoes.length > 0 && (
          <div className="hidden flex-wrap gap-2 sm:flex">
            {acoes.slice(0, 3).map((a) => (
              <Link key={a.href} href={a.href} className="btn-ghost">
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {verVendas && (
          <Kpi
            title="Vendas hoje"
            main={money(vendasHoje._sum.total ?? 0)}
            sub={`${num(vendasHoje._count)} venda(s)`}
            href="/vendas"
          />
        )}
        {verFaturamento && (
          <Kpi
            title="Faturamento do mês"
            main={money(fatMes)}
            sub={`vendas + serviços`}
            href="/relatorios/vendas"
          />
        )}
        {verFin && (
          <Kpi
            title="Resultado do mês"
            main={money(dre.resultado)}
            sub={`margem ${dre.margemLiquida.toFixed(1)}%`}
            accent={dre.resultado >= 0 ? "text-green-700" : "text-red-600"}
            href="/relatorios/dre"
          />
        )}
        {verFin && (
          <Kpi
            title="Saldo em caixa"
            main={money(saldoCaixa)}
            sub="todas as contas"
            accent={saldoCaixa < 0 ? "text-red-600" : "text-primary"}
            href="/financeiro/caixa"
          />
        )}
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-800">Pendências</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {alertas.map((a, i) => (
              <li key={i}>
                <Link href={a.href} className="text-sm text-amber-900 hover:underline">
                  → {a.txt}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          {verFaturamento && (
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Faturamento — últimos 14 dias</h2>
              <span className="text-xs text-muted">
                <i className="mr-1 inline-block size-2 rounded-sm bg-primary align-middle" />
                vendas
                <i className="mx-1 ml-3 inline-block size-2 rounded-sm bg-teal-500 align-middle" />
                serviços
              </span>
            </div>
            <div className="flex h-40 items-end gap-1">
              {dias.map((d) => (
                <div key={d.k} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 flex-col justify-end">
                    <div
                      className="w-full rounded-t-sm bg-teal-500"
                      style={{ height: `${(d.os / maxDia) * 100}%` }}
                      title={`Serviços ${money(d.os)}`}
                    />
                    <div
                      className="w-full bg-primary"
                      style={{ height: `${(d.vendas / maxDia) * 100}%` }}
                      title={`Vendas ${money(d.vendas)}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted">{d.k.slice(8, 10)}</span>
                </div>
              ))}
            </div>
          </section>
          )}

          {verVendas && (
            <ListaCard
              titulo="Vendas recentes"
              verMais="/vendas"
              vazio="Nenhuma venda ainda."
              linhas={vendasRecentes.map((v) => ({
                href: `/vendas/${v.id}`,
                a: `Venda nº ${v.numero}`,
                b: `${v.partner?.nome ?? "Consumidor"} · ${dateTime(v.finalizadaEm ?? v.createdAt)}`,
                c: money(v.total),
                extra: (
                  <span className={`badge ${v.status === "FINALIZADA" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {v.status.toLowerCase()}
                  </span>
                ),
              }))}
            />
          )}

          {verOS && (
            <ListaCard
              titulo="Ordens de serviço recentes"
              verMais="/ordens-servico"
              vazio="Nenhuma OS ainda."
              linhas={osRecentes.map((o) => ({
                href: `/ordens-servico/${o.id}`,
                a: `OS nº ${o.numero}`,
                b: `${o.partner?.nome ?? "—"}${o.vehicle ? ` · ${[o.vehicle.marca, o.vehicle.modelo].filter(Boolean).join(" ")}` : ""}`,
                c: money(o.total),
                extra: <OSStatusBadge status={o.status} />,
              }))}
            />
          )}
        </div>

        {/* coluna lateral */}
        <div className="space-y-6">
          {verFin && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Previsão 30 dias</h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">A receber</span>
                  <span className="text-green-700">{money(recebimentos30)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">A pagar</span>
                  <span className="text-red-600">{money(pagamentos30)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 font-bold">
                  <span>Saldo projetado</span>
                  <span>{money(saldoCaixa + recebimentos30 - pagamentos30)}</span>
                </div>
              </dl>
              {venceHoje.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-1 text-xs font-medium text-muted">Vence hoje</p>
                  {venceHoje.map((t) => (
                    <Link
                      key={t.id}
                      href={`/financeiro/titulos/${t.id}`}
                      className="flex justify-between py-0.5 text-sm hover:underline"
                    >
                      <span className={t.tipo === "PAGAR" ? "text-red-600" : ""}>
                        {t.tipo === "RECEBER" ? "↓" : "↑"} {t.descricao}
                      </span>
                      <span>{money(t.valor - t.valorPago)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {verNotas && (
            <ListaCard
              titulo="Últimas notas"
              verMais="/notas"
              vazio="Nenhuma nota emitida."
              linhas={ultimasNotas.map((n) => ({
                href: `/notas/${n.id}`,
                a: `${n.tipo} nº ${n.numero}`,
                b: `${n.partner?.nome ?? "Consumidor"} · ${date(n.createdAt)}`,
                c: money(n.valorTotal),
                extra: <StatusBadge status={n.status} />,
              }))}
            />
          )}

          {verProdutos && (
            <section className="card">
              <header className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="font-semibold">Estoque baixo</h2>
                <Link href="/produtos" className="text-sm text-primary">ver</Link>
              </header>
              <div className="divide-y divide-border text-sm">
                {estoqueBaixo.length === 0 && (
                  <p className="px-4 py-6 text-muted">Tudo acima do mínimo. 👍</p>
                )}
                {estoqueBaixo.map((p) => (
                  <div key={p.id} className="flex justify-between px-4 py-2">
                    <span>{p.nome}</span>
                    <span className="font-medium text-red-600">
                      {num(p.estoque)}<span className="text-muted"> / {num(p.estoqueMinimo)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

async function sumSaldo(db: ScopedDb, tipo: string, where: Record<string, unknown>): Promise<number> {
  const rows = await db.financialEntry.findMany({
    where: { tipo, ...where },
    select: { valor: true, valorPago: true },
  });
  return rows.reduce((s, r) => s + (r.valor - r.valorPago), 0);
}

function Kpi({
  title, main, sub, accent = "", href,
}: {
  title: string; main: string; sub?: string; accent?: string; href?: string;
}) {
  const inner = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${accent}`}>{main}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="card p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      {inner}
    </Link>
  ) : (
    <div className="card p-4">{inner}</div>
  );
}

function ListaCard({
  titulo, verMais, vazio, linhas,
}: {
  titulo: string;
  verMais: string;
  vazio: string;
  linhas: { href: string; a: string; b: string; c: string; extra?: React.ReactNode }[];
}) {
  return (
    <section className="card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">{titulo}</h2>
        <Link href={verMais} className="text-sm text-primary">ver todos</Link>
      </header>
      <div className="divide-y divide-border">
        {linhas.length === 0 && <p className="px-4 py-6 text-sm text-muted">{vazio}</p>}
        {linhas.map((l, i) => (
          <Link key={i} href={l.href} className="flex items-center justify-between px-4 py-3 hover:bg-background">
            <div className="min-w-0">
              <p className="truncate font-medium">{l.a}</p>
              <p className="truncate text-xs text-muted">{l.b}</p>
            </div>
            <div className="ml-3 shrink-0 text-right">
              <p className="font-semibold">{l.c}</p>
              {l.extra}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
