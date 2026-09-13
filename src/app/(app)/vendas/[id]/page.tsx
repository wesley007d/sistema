import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmButton } from "@/components/ConfirmButton";
import { money, dateTime } from "@/lib/format";
import { StatusBadge } from "../../notas/StatusBadge";
import { DescartarOrcamentoForm } from "../DescartarOrcamentoForm";
import { DescartarPreVendaForm } from "../DescartarPreVendaForm";
import { AprovacaoDescontoForm } from "../aprovacoes/AprovacaoDescontoForm";
import {
  cancelarVenda,
  enviarOrcamentoAoCaixa,
  excluirOrcamento,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function VendaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, db } = await requireDb();
  const { id } = await params;
  const venda = await db.sale.findUnique({
    where: { id },
    include: {
      partner: true,
      operador: true,
      items: { include: { product: { select: { imagemUrl: true } } } },
      payments: true,
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!venda) notFound();

  const ehOrcamento = venda.status === "ORCAMENTO";
  const orcDescartado = venda.status === "ORCAMENTO_CANCELADO";
  const aguardandoAprov = venda.status === "AGUARDANDO_APROVACAO";
  const aprovNegada = venda.status === "APROVACAO_NEGADA";
  const preVendaAberta = venda.status === "ABERTA";
  const cancelada = venda.status === "CANCELADA";
  const ehAdmin = user.role === "ADMIN";
  const ultimaObs =
    (venda.observacao ?? "").split("\n").filter(Boolean).pop() ?? null;
  const podeAprovar = can(user, "vendas");
  const pctDesc = venda.subtotal > 0 ? (venda.desconto / venda.subtotal) * 100 : 0;
  const motivoDescarte = orcDescartado
    ? (venda.observacao ?? "").split("\n").filter(Boolean).pop() ?? null
    : null;

  return (
    <div>
      <PageHeader
        title={`${ehOrcamento || orcDescartado ? "Orçamento" : "Venda"} nº ${venda.numero}`}
        subtitle={`${venda.partner?.nome ?? "Consumidor"} · ${dateTime(
          venda.finalizadaEm ?? venda.createdAt,
        )}`}
        action={
          <div className="flex flex-wrap gap-2">
            {aguardandoAprov && podeAprovar && <AprovacaoDescontoForm id={id} />}
            {ehOrcamento && (
              <>
                <a
                  href={`/vendas/${venda.id}/cupom`}
                  target="_blank"
                  className="btn-ghost"
                >
                  Imprimir
                </a>
                <form action={enviarOrcamentoAoCaixa.bind(null, id)}>
                  <button type="submit" className="btn-primary">
                    Enviar ao caixa
                  </button>
                </form>
              </>
            )}
            {orcDescartado && ehAdmin && (
              <form action={excluirOrcamento.bind(null, id)}>
                <ConfirmButton message="Apagar este orçamento DE VEZ do sistema? Não dá para desfazer.">
                  Apagar de vez
                </ConfirmButton>
              </form>
            )}
            {venda.status === "ABERTA" && (
              <Link
                href={`/caixa?venda=${venda.numero}`}
                className="btn-primary"
              >
                Receber no caixa
              </Link>
            )}
            {venda.status !== "ABERTA" && !ehOrcamento && (
              <a
                href={`/vendas/${venda.id}/cupom`}
                target="_blank"
                className="btn-ghost"
              >
                Cupom
              </a>
            )}
            {venda.status === "FINALIZADA" &&
              !venda.invoices.some((n) => n.status !== "CANCELADA") && (
                <form action={cancelarVenda.bind(null, id)}>
                  <ConfirmButton message="Cancelar esta venda? O estoque será estornado.">
                    Cancelar venda
                  </ConfirmButton>
                </form>
              )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span
          className={`badge ${
            venda.status === "FINALIZADA"
              ? "bg-green-100 text-green-700"
              : venda.status === "ABERTA"
                ? "bg-amber-100 text-amber-700"
                : aguardandoAprov
                  ? "bg-orange-100 text-orange-700"
                  : ehOrcamento
                    ? "bg-blue-100 text-blue-700"
                    : "bg-red-100 text-red-700"
          }`}
        >
          {venda.status === "ABERTA"
            ? "aguardando caixa"
            : aguardandoAprov
              ? "aguardando aprovação de desconto"
              : aprovNegada
                ? "desconto negado"
                : ehOrcamento
                  ? "orçamento"
                  : orcDescartado
                    ? "orçamento descartado"
                    : venda.status.toLowerCase()}
        </span>
        {venda.operador && (
          <span className="text-xs text-muted">Operador: {venda.operador.nome}</span>
        )}
      </div>

      {orcDescartado && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <b>Orçamento descartado.</b>
          {motivoDescarte ? ` ${motivoDescarte}` : ""} O registro fica salvo;
          {ehAdmin
            ? " use “Apagar de vez” para removê-lo do sistema."
            : " só o administrador pode apagá-lo definitivamente."}
        </div>
      )}

      {aguardandoAprov && (
        <div className="mb-6 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <b>Desconto de {pctDesc.toFixed(1)}% acima do limite.</b> Esta venda não
          vai para o caixa enquanto um responsável não aprovar o desconto
          {podeAprovar ? " (use os botões acima)." : "."}
        </div>
      )}

      {aprovNegada && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <b>Desconto recusado.</b>{" "}
          {(venda.observacao ?? "").split("\n").filter(Boolean).pop()} O registro
          fica salvo. Refaça a venda no PDV com um desconto dentro do limite.
        </div>
      )}

      {venda.aprovadaPor && !aguardandoAprov && (
        <div className="mb-6 rounded-md border border-border bg-surface-2 px-4 py-2 text-xs text-muted">
          Desconto de {pctDesc.toFixed(1)}% autorizado por{" "}
          <b className="text-foreground">{venda.aprovadaPor}</b>
          {venda.aprovadaEm ? ` em ${dateTime(venda.aprovadaEm)}` : ""}.
        </div>
      )}

      {ehOrcamento && (
        <section className="card mb-6 p-4">
          <DescartarOrcamentoForm id={id} />
        </section>
      )}

      {preVendaAberta && (
        <section className="card mb-6 p-4">
          <DescartarPreVendaForm id={id} />
        </section>
      )}

      {cancelada && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <b>Venda cancelada.</b>
          {ultimaObs ? ` ${ultimaObs}` : ""} O registro fica salvo para
          conferência.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Itens</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Produto</th>
                <th className="th text-right">Qtd</th>
                <th className="th text-right">Preço</th>
                <th className="th text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {venda.items.map((it) => (
                <tr key={it.id}>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      {it.product?.imagemUrl && (
                        <a
                          href={it.product.imagemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver foto do produto"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={it.product.imagemUrl}
                            alt=""
                            className="size-8 shrink-0 rounded object-cover"
                          />
                        </a>
                      )}
                      <span>
                        {it.descricao}
                        {it.tipo === "SERVICO" && (
                          <span className="ml-2 text-xs text-primary">
                            🔧 serviço
                          </span>
                        )}
                        {it.mecanico && (
                          <span className="block text-xs text-muted">
                            Mecânico: {it.mecanico}
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="td text-right">{it.quantidade}</td>
                  <td className="td text-right">{money(it.precoUnit)}</td>
                  <td className="td text-right font-medium">{money(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="space-y-6">
          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-semibold">Resumo</h2>
            <Row label="Subtotal" value={money(venda.subtotal)} />
            <Row label="Desconto" value={`- ${money(venda.desconto)}`} />
            <Row label="Acréscimo" value={money(venda.acrescimo)} />
            <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
              <span>Total</span>
              <span>{money(venda.total)}</span>
            </div>
            {venda.troco > 0 && (
              <Row label="Troco" value={money(venda.troco)} />
            )}
          </section>

          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-semibold">Pagamentos</h2>
            {venda.payments.map((p) => (
              <Row key={p.id} label={p.forma.toLowerCase()} value={money(p.valor)} />
            ))}
            {venda.payments.length === 0 && (
              <p className="text-muted">—</p>
            )}
          </section>

          {venda.invoices.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Notas</h2>
              <div className="space-y-2 text-sm">
                {venda.invoices.map((n) => (
                  <Link
                    key={n.id}
                    href={`/notas/${n.id}`}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-background"
                  >
                    <span>
                      {n.tipo} nº {n.numero}
                    </span>
                    <StatusBadge status={n.status} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      <div className="mt-6">
        <Link href="/vendas" className="text-sm text-primary">
          ← voltar para vendas
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between capitalize">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
