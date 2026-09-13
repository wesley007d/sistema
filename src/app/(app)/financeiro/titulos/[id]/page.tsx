import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { can, requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { FinanceNav } from "@/components/FinanceNav";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { money, date, dateTime } from "@/lib/format";
import {
  baixarTitulo,
  cancelarTitulo,
  estornarBaixa,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function TituloDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, db } = await requireDb();
  const full = can(user, "financeiro");
  const { id } = await params;
  const [titulo, contas] = await Promise.all([
    db.financialEntry.findUnique({
      where: { id },
      include: {
        partner: true,
        sale: true,
        serviceOrder: true,
        settlements: { include: { account: true }, orderBy: { data: "asc" } },
      },
    }),
    db.cashAccount.findMany({ where: { ativo: true }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!titulo) notFound();
  // Caixa só acessa recebíveis de clientes.
  if (!full && titulo.tipo !== "RECEBER") redirect("/financeiro/titulos");

  const saldo = titulo.valor - titulo.valorPago;
  const aberto = titulo.status === "ABERTO" || titulo.status === "PARCIAL";
  const hojeInput = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title={titulo.descricao}
        subtitle={`${titulo.tipo === "RECEBER" ? "Conta a receber" : "Conta a pagar"} · vence ${date(titulo.vencimento)}`}
        action={
          full &&
          titulo.settlements.length === 0 &&
          titulo.status !== "CANCELADO" ? (
            <form action={cancelarTitulo.bind(null, id)}>
              <ConfirmButton message="Cancelar este título?">Cancelar título</ConfirmButton>
            </form>
          ) : undefined
        }
      />
      <FinanceNav active="/financeiro/titulos" full={full} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-1">
          <dl className="space-y-1 text-sm">
            <Row label="Valor" value={money(titulo.valor)} />
            <Row label="Pago" value={money(titulo.valorPago)} />
            <Row label="Saldo" value={money(saldo)} />
            <Row label="Status" value={titulo.status.toLowerCase()} />
            <Row label="Categoria" value={titulo.categoria ?? "—"} />
            <Row label="Parceiro" value={titulo.partner?.nome ?? "—"} />
            {titulo.sale && (
              <Row label="Origem" value={`Venda nº ${titulo.sale.numero}`} />
            )}
            {titulo.serviceOrder && (
              <Row label="Origem" value={`OS nº ${titulo.serviceOrder.numero}`} />
            )}
            {titulo.observacao && <Row label="Obs." value={titulo.observacao} />}
          </dl>
        </section>

        <div className="lg:col-span-2 space-y-6">
          {aberto && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Dar baixa</h2>
              <form
                action={baixarTitulo.bind(null, id)}
                className="flex flex-wrap items-end gap-3"
              >
                <div>
                  <label className="label">Valor</label>
                  <input
                    name="valor"
                    type="number"
                    step="0.01"
                    defaultValue={saldo.toFixed(2)}
                    className="input w-32"
                  />
                </div>
                <div>
                  <label className="label">Conta</label>
                  <select name="accountId" className="input">
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Data</label>
                  <input name="data" type="date" defaultValue={hojeInput} className="input" />
                </div>
                <div>
                  <label className="label">Forma</label>
                  <input name="formaPagamento" className="input w-36" placeholder="Pix, dinheiro…" />
                </div>
                <SubmitButton>Baixar</SubmitButton>
              </form>
            </section>
          )}

          <section className="card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="font-semibold">Histórico de baixas</h2>
            </header>
            <div className="divide-y divide-border text-sm">
              {titulo.settlements.length === 0 && (
                <p className="px-4 py-6 text-muted">Nenhuma baixa registrada.</p>
              )}
              {titulo.settlements.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="font-medium">{money(s.valor)}</span>
                    <span className="block text-xs text-muted">
                      {dateTime(s.data)} · {s.account.nome}
                      {s.formaPagamento ? ` · ${s.formaPagamento}` : ""}
                    </span>
                  </div>
                  <form action={estornarBaixa.bind(null, s.id)}>
                    <ConfirmButton
                      message="Estornar esta baixa? O movimento de caixa também será removido."
                      className="btn-danger px-2 py-1 text-xs"
                    >
                      Estornar
                    </ConfirmButton>
                  </form>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-6">
        <Link href="/financeiro/titulos" className="text-sm text-primary">
          ← voltar para títulos
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between capitalize">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
