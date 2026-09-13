import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { money, dateTime } from "@/lib/format";
import { formatChave } from "@/lib/fiscal/chave";
import { StatusBadge } from "../StatusBadge";
import { consultarInvoice, deleteDraft, emitInvoice } from "../actions";
import { CancelarNotaForm } from "./CancelarNotaForm";

export const dynamic = "force-dynamic";

export default async function NotaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireDb();
  const { id } = await params;
  const nf = await db.invoice.findUnique({
    where: { id },
    include: { partner: true, items: true, serviceItems: true },
  });
  if (!nf) notFound();

  const podeEmitir = nf.status === "RASCUNHO" || nf.status === "REJEITADA";
  const podeCancelar = nf.status === "AUTORIZADA";
  const emProcessamento = nf.status === "PROCESSANDO";

  return (
    <div>
      <PageHeader
        title={`${nf.tipo} nº ${nf.numero} / série ${nf.serie}`}
        subtitle={nf.naturezaOperacao}
        action={
          <div className="flex flex-wrap gap-2">
            {nf.xml && (
              <a href={`/notas/${nf.id}/xml`} className="btn-ghost">
                Baixar XML
              </a>
            )}
            {nf.status === "AUTORIZADA" && (
              <a
                href={`/notas/${nf.id}/imprimir`}
                target="_blank"
                className="btn-ghost"
              >
                Imprimir
              </a>
            )}
            {podeEmitir && (
              <form action={emitInvoice.bind(null, id)}>
                <SubmitButton>Transmitir / Emitir</SubmitButton>
              </form>
            )}
            {emProcessamento && (
              <form action={consultarInvoice.bind(null, id)}>
                <SubmitButton>Consultar situação</SubmitButton>
              </form>
            )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={nf.status} />
        {nf.chaveAcesso && (
          <span className="font-mono text-xs text-muted">
            Chave: {formatChave(nf.chaveAcesso)}
          </span>
        )}
        {nf.protocolo && (
          <span className="text-xs text-muted">Protocolo: {nf.protocolo}</span>
        )}
        {nf.emitidaEm && (
          <span className="text-xs text-muted">
            Emitida em {dateTime(nf.emitidaEm)}
          </span>
        )}
      </div>

      {emProcessamento && (
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Nota enviada ao provedor fiscal e aguardando autorização da SEFAZ /
          prefeitura. Use <b>“Consultar situação”</b> para atualizar — pode levar
          de alguns segundos a alguns minutos.
        </div>
      )}

      {nf.status === "REJEITADA" && nf.motivoRejeicao && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <b>Rejeitada:</b> {nf.motivoRejeicao}
        </div>
      )}
      {nf.status === "CANCELADA" && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <b>Cancelada</b> em {dateTime(nf.canceladaEm)}. Motivo:{" "}
          {nf.motivoCancelamento}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Itens</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="th">Descrição</th>
                  <th className="th text-right">Qtd</th>
                  <th className="th text-right">Vlr unit.</th>
                  <th className="th text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {nf.items.map((it) => (
                  <tr key={it.id}>
                    <td className="td">
                      {it.descricao}
                      <span className="block text-xs text-muted">
                        {it.codigo} · NCM {it.ncm ?? "-"} · CFOP {it.cfop}
                      </span>
                    </td>
                    <td className="td text-right">{it.quantidade}</td>
                    <td className="td text-right">{money(it.valorUnit)}</td>
                    <td className="td text-right font-medium">
                      {money(it.valorTotal)}
                    </td>
                  </tr>
                ))}
                {nf.serviceItems.map((it) => (
                  <tr key={it.id}>
                    <td className="td">
                      {it.descricao}
                      <span className="block text-xs text-muted">
                        LC {it.itemListaServico ?? "-"} · ISS {it.aliquotaIss}%
                        {it.issRetido ? " (retido)" : ""}
                      </span>
                    </td>
                    <td className="td text-right">{it.quantidade}</td>
                    <td className="td text-right">{money(it.valorUnit)}</td>
                    <td className="td text-right font-medium">
                      {money(it.valorTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Resumo</h2>
            <dl className="space-y-1 text-sm">
              <Row label="Destinatário" value={nf.partner?.nome ?? "Consumidor"} />
              <Row label="Produtos" value={money(nf.valorProdutos)} />
              <Row label="Serviços" value={money(nf.valorServicos)} />
              <Row label="Desconto" value={money(nf.valorDesconto)} />
              <Row label="ICMS" value={money(nf.valorIcms)} />
              <Row label="ISS" value={money(nf.valorIss)} />
              <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
                <span>Total</span>
                <span>{money(nf.valorTotal)}</span>
              </div>
            </dl>
          </section>

          {podeCancelar && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Cancelar nota</h2>
              <CancelarNotaForm id={id} />
            </section>
          )}

          {podeEmitir && (
            <form action={deleteDraft.bind(null, id)}>
              <ConfirmButton message="Excluir este rascunho?" className="btn-danger w-full">
                Excluir rascunho
              </ConfirmButton>
            </form>
          )}
        </aside>
      </div>

      <div className="mt-6">
        <Link href="/notas" className="text-sm text-primary">
          ← voltar para notas
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
