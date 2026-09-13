import Link from "next/link";
import { can, requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { money, dateTime } from "@/lib/format";
import { enviarOrcamentoAoCaixa } from "./actions";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, string> = {
  FINALIZADA: "bg-green-100 text-green-700",
  ABERTA: "bg-amber-100 text-amber-700",
  ORCAMENTO: "bg-blue-100 text-blue-700",
  ORCAMENTO_CANCELADO: "bg-red-100 text-red-700",
  CANCELADA: "bg-red-100 text-red-700",
  AGUARDANDO_APROVACAO: "bg-orange-100 text-orange-700",
  APROVACAO_NEGADA: "bg-red-100 text-red-700",
};

const statusLabel: Record<string, string> = {
  FINALIZADA: "finalizada",
  ABERTA: "aguardando caixa",
  ORCAMENTO: "orçamento",
  ORCAMENTO_CANCELADO: "orçamento descartado",
  CANCELADA: "cancelada",
  AGUARDANDO_APROVACAO: "aguardando aprovação",
  APROVACAO_NEGADA: "desconto negado",
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mes?: string; operador?: string }>;
}) {
  const { user, db } = await requireDb();
  const { status, mes, operador } = await searchParams;

  // Vendedor (só `pdv`, sem `vendas`) enxerga apenas as próprias vendas.
  const ehVendedor = !can(user, "vendas");
  const operadorFiltro = ehVendedor ? user.id : operador || null;

  // Período: sem `mes` = hoje; com `mes=YYYY-MM` = aquele mês inteiro.
  const agora = new Date();
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? "");
  let de: Date;
  let ate: Date;
  let periodoLabel: string;
  if (m) {
    const ano = Number(m[1]);
    const mi = Number(m[2]) - 1;
    de = new Date(ano, mi, 1, 0, 0, 0, 0);
    ate = new Date(ano, mi + 1, 0, 23, 59, 59, 999);
    periodoLabel = `${MESES[mi]}/${ano}`;
  } else {
    de = new Date(agora);
    de.setHours(0, 0, 0, 0);
    ate = new Date(agora);
    ate.setHours(23, 59, 59, 999);
    periodoLabel = "hoje";
  }

  const whereBase = {
    createdAt: { gte: de, lte: ate },
    ...(operadorFiltro ? { operadorId: operadorFiltro } : {}),
  };

  const [vendas, resumo, vendedores] = await Promise.all([
    db.sale.findMany({
      where: { ...whereBase, ...(status ? { status } : {}) },
      include: { partner: true, operador: true },
      orderBy: { numero: "desc" },
      take: 500,
    }),
    db.sale.aggregate({
      _sum: { total: true },
      _count: true,
      where: { ...whereBase, status: "FINALIZADA" },
    }),
    ehVendedor
      ? Promise.resolve([])
      : db.user.findMany({
          where: { sales: { some: {} } },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        }),
  ]);

  // opções de mês: "Hoje" + últimos 6 meses
  const opcoesMes = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { val, label: `${MESES[d.getMonth()].slice(0, 3)}/${String(d.getFullYear()).slice(2)}` };
  });

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const cur = { status, mes, operador, ...patch };
    for (const [k, v] of Object.entries(cur)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/vendas?${s}` : "/vendas";
  };

  return (
    <div>
      <PageHeader
        title={ehVendedor ? "Minhas vendas" : "Vendas"}
        subtitle={`${vendas.length} venda(s) · ${periodoLabel}`}
        action={{ href: "/vendas/pdv", label: "+ Nova venda (PDV)" }}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs uppercase text-muted">
            Vendas finalizadas ({periodoLabel})
          </p>
          <p className="mt-1 text-2xl font-bold">{resumo._count}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-muted">
            Faturamento ({periodoLabel})
          </p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {money(resumo._sum.total ?? 0)}
          </p>
        </div>
      </div>

      {/* Período: hoje ou por mês */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase text-muted">Período</span>
        <Link
          href={qs({ mes: undefined })}
          className={`badge border ${
            !m
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-surface text-muted"
          }`}
        >
          Hoje
        </Link>
        {opcoesMes.map((o) => (
          <Link
            key={o.val}
            href={qs({ mes: o.val })}
            className={`badge border ${
              mes === o.val
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>

      {/* Filtro por vendedor (só gerente/admin) */}
      {!ehVendedor && vendedores.length > 0 && (
        <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {mes && <input type="hidden" name="mes" value={mes} />}
          <span className="text-xs font-medium uppercase text-muted">Vendedor</span>
          <select
            name="operador"
            defaultValue={operador ?? ""}
            className="input w-56 py-1 text-sm"
          >
            <option value="">Todos</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-ghost px-3 py-1 text-xs">
            Filtrar
          </button>
          {operador && (
            <Link href={qs({ operador: undefined })} className="text-xs text-primary">
              limpar
            </Link>
          )}
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { label: "Todas", value: "" },
          { label: "Orçamentos", value: "ORCAMENTO" },
          { label: "Aguardando caixa", value: "ABERTA" },
          { label: "Aguardando aprovação", value: "AGUARDANDO_APROVACAO" },
          { label: "Finalizadas", value: "FINALIZADA" },
          { label: "Canceladas", value: "CANCELADA" },
        ].map((f) => (
          <Link
            key={f.value}
            href={qs({ status: f.value || undefined })}
            className={`badge border ${
              (status ?? "") === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Nº</th>
              <th className="th">Data</th>
              <th className="th">Cliente</th>
              {!ehVendedor && <th className="th">Vendedor</th>}
              <th className="th">Pagamento</th>
              <th className="th text-right">Total</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {vendas.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={ehVendedor ? 6 : 7}>
                  Nenhuma venda em {periodoLabel}.{" "}
                  <Link href="/vendas/pdv" className="text-primary">
                    Abrir o PDV
                  </Link>
                </td>
              </tr>
            )}
            {vendas.map((v) => (
              <tr key={v.id} className="hover:bg-background">
                <td className="td">
                  <Link
                    href={`/vendas/${v.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {v.numero}
                  </Link>
                </td>
                <td className="td text-muted">{dateTime(v.finalizadaEm ?? v.createdAt)}</td>
                <td className="td">{v.partner?.nome ?? "Consumidor"}</td>
                {!ehVendedor && (
                  <td className="td text-muted">{v.operador?.nome ?? "—"}</td>
                )}
                <td className="td text-muted">{v.formaPagamento ?? "—"}</td>
                <td className="td text-right font-medium">{money(v.total)}</td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${statusBadge[v.status] ?? ""}`}>
                      {statusLabel[v.status] ?? v.status.toLowerCase()}
                    </span>
                    {v.status === "ABERTA" && (
                      <Link
                        href={`/caixa?venda=${v.numero}`}
                        className="btn-primary px-2 py-1 text-xs"
                      >
                        Receber no caixa
                      </Link>
                    )}
                    {v.status === "ORCAMENTO" && (
                      <form action={enviarOrcamentoAoCaixa.bind(null, v.id)}>
                        <button
                          type="submit"
                          className="btn-primary px-2 py-1 text-xs"
                        >
                          Enviar ao caixa
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {vendas.length === 500 && (
        <p className="mt-2 text-xs text-muted">
          Mostrando as 500 mais recentes do período. Filtre por mês para ver o resto.
        </p>
      )}
    </div>
  );
}
