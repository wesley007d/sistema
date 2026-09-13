import Link from "next/link";
import { requireDbPermission } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { money, dateTime } from "@/lib/format";
import { LIMITE_DESCONTO_VENDEDOR } from "@/lib/aprovacao";
import { AprovacaoDescontoForm } from "./AprovacaoDescontoForm";

export const dynamic = "force-dynamic";

function motivoDe(obs: string | null) {
  return (obs ?? "").split("\n").filter(Boolean).pop() ?? null;
}

export default async function AprovacoesPage() {
  const { db } = await requireDbPermission("vendas");
  const vendas = await db.sale.findMany({
    where: { status: { in: ["AGUARDANDO_APROVACAO", "APROVACAO_NEGADA"] } },
    include: { partner: true, operador: true, items: true },
    orderBy: { numero: "desc" },
    take: 200,
  });

  const pendentes = vendas.filter((v) => v.status === "AGUARDANDO_APROVACAO");

  return (
    <div>
      <PageHeader
        title="Aprovações de desconto"
        subtitle={`Vendas do balcão com desconto acima de ${LIMITE_DESCONTO_VENDEDOR}%. ${pendentes.length} aguardando.`}
      />

      <div className="card divide-y divide-border">
        {vendas.length === 0 && (
          <p className="p-4 text-sm text-muted">
            Nenhuma venda aguardando aprovação de desconto.
          </p>
        )}
        {vendas.map((v) => {
          const negada = v.status === "APROVACAO_NEGADA";
          const pct =
            v.subtotal > 0 ? (v.desconto / v.subtotal) * 100 : 0;
          return (
            <div
              key={v.id}
              className={`flex flex-wrap items-start gap-4 p-4 ${
                negada ? "opacity-70" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/vendas/${v.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  Venda nº {v.numero}
                </Link>
                <span
                  className={`badge ml-2 ${
                    negada
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {negada ? "desconto negado" : "aguardando aprovação"}
                </span>
                <p className="mt-0.5 text-xs text-muted">
                  Vendedor: {v.operador?.nome ?? "—"} ·{" "}
                  {v.partner?.nome ?? "Consumidor"} · {dateTime(v.createdAt)} ·{" "}
                  {v.items.length} item(ns)
                </p>
                <p className="mt-1 text-sm">
                  Subtotal <b>{money(v.subtotal)}</b> · desconto{" "}
                  <b className="text-red-600">
                    {money(v.desconto)} ({pct.toFixed(1)}%)
                  </b>{" "}
                  · total <b>{money(v.total)}</b>
                </p>
                {negada && motivoDe(v.observacao) && (
                  <p className="mt-1 text-xs text-red-600">
                    {motivoDe(v.observacao)}
                  </p>
                )}
              </div>

              {!negada && <AprovacaoDescontoForm id={v.id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
