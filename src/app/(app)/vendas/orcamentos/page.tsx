import Link from "next/link";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmButton } from "@/components/ConfirmButton";
import { money, dateTime } from "@/lib/format";
import { DescartarOrcamentoForm } from "../DescartarOrcamentoForm";
import { enviarOrcamentoAoCaixa, excluirOrcamento } from "../actions";

export const dynamic = "force-dynamic";

function motivoDe(obs: string | null) {
  return (obs ?? "").split("\n").filter(Boolean).pop() ?? null;
}

export default async function OrcamentosPage() {
  const { user, db } = await requireDb();
  const ehAdmin = user.role === "ADMIN";
  const orcamentos = await db.sale.findMany({
    where: { status: { in: ["ORCAMENTO", "ORCAMENTO_CANCELADO"] } },
    include: { partner: true, operador: true },
    orderBy: { numero: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle="Orçamentos em aberto e descartados (ficam salvos)."
        action={{ href: "/vendas/pdv", label: "+ Novo no PDV" }}
      />

      <div className="card divide-y divide-border">
        {orcamentos.length === 0 && (
          <p className="p-4 text-sm text-muted">
            Nenhum orçamento.{" "}
            <Link href="/vendas/pdv" className="text-primary">
              Montar um no PDV
            </Link>
          </p>
        )}
        {orcamentos.map((o) => {
          const descartado = o.status === "ORCAMENTO_CANCELADO";
          return (
            <div
              key={o.id}
              className={`flex flex-wrap items-start gap-4 p-4 ${
                descartado ? "opacity-70" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/vendas/${o.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  Orçamento nº {o.numero}
                </Link>
                <span
                  className={`badge ml-2 ${
                    descartado
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {descartado ? "descartado" : "em aberto"}
                </span>
                <p className="mt-0.5 text-xs text-muted">
                  {o.partner?.nome ?? "Consumidor"} ·{" "}
                  {o.operador?.nome ?? "—"} · {dateTime(o.createdAt)} ·{" "}
                  <b className="text-foreground">{money(o.total)}</b>
                </p>
                {descartado && motivoDe(o.observacao) && (
                  <p className="mt-1 text-xs text-red-600">
                    {motivoDe(o.observacao)}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!descartado && (
                  <>
                    <a
                      href={`/vendas/${o.id}/cupom`}
                      target="_blank"
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      Imprimir
                    </a>
                    <form action={enviarOrcamentoAoCaixa.bind(null, o.id)}>
                      <button
                        type="submit"
                        className="btn-primary px-2 py-1 text-xs"
                      >
                        Enviar ao caixa
                      </button>
                    </form>
                    <DescartarOrcamentoForm id={o.id} />
                  </>
                )}
                {descartado && ehAdmin && (
                  <form action={excluirOrcamento.bind(null, o.id)}>
                    <ConfirmButton
                      message="Apagar este orçamento DE VEZ do sistema?"
                      className="btn-danger px-2 py-1 text-xs"
                    >
                      Apagar de vez
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
