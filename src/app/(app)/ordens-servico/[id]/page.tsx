import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { money, dateTime } from "@/lib/format";
import { OSStatusBadge, OS_FLUXO } from "../OSStatusBadge";
import { StatusBadge } from "../../notas/StatusBadge";
import { OSEditor } from "./OSEditor";
import { CancelarOSForm } from "./CancelarOSForm";
import {
  deleteServiceOrder,
  faturarOS,
  saveServiceOrder,
  setOSCliente,
  setOSStatus,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function OSDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireDb();
  const { id } = await params;
  const [os, clientes, produtos, servicos] = await Promise.all([
    db.serviceOrder.findUnique({
      where: { id },
      include: {
        partner: true,
        vehicle: true,
        items: true,
        invoices: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.partner.findMany({
      where: { ativo: true, tipo: { in: ["CLIENTE", "AMBOS"] } },
      orderBy: { nome: "asc" },
    }),
    db.product.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.service.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);
  if (!os) notFound();

  const vehicles = os.partnerId
    ? await db.vehicle.findMany({ where: { partnerId: os.partnerId } })
    : [];

  const proximas = OS_FLUXO[os.status] ?? [];
  const podeCancelar = os.status !== "ENTREGUE" && os.status !== "CANCELADA";
  const ultimaObs =
    (os.observacao ?? "").split("\n").filter(Boolean).pop() ?? null;
  const temServicos = os.items.some((i) => i.tipo === "SERVICO");
  const temPecas = os.items.some((i) => i.tipo === "PECA");
  const jaFaturouNfse = os.invoices.some(
    (n) => n.tipo === "NFSE" && n.status !== "CANCELADA",
  );
  const jaFaturouNfe = os.invoices.some(
    (n) => n.tipo === "NFE" && n.status !== "CANCELADA",
  );
  const podeFaturar =
    ["CONCLUIDA", "ENTREGUE"].includes(os.status) &&
    ((temServicos && !jaFaturouNfse) || (temPecas && !jaFaturouNfe));

  return (
    <div>
      <PageHeader
        title={`OS nº ${os.numero}`}
        subtitle={
          os.partner
            ? `${os.partner.nome}${
                os.vehicle
                  ? ` · ${[os.vehicle.marca, os.vehicle.modelo, os.vehicle.placa]
                      .filter(Boolean)
                      .join(" ")}`
                  : ""
              }`
            : "Sem cliente definido"
        }
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/ordens-servico/${os.id}/imprimir`}
              target="_blank"
              className="btn-ghost"
            >
              Imprimir
            </a>
            {proximas.map((t) => (
              <form key={t.to} action={setOSStatus.bind(null, id, t.to)}>
                <SubmitButton
                  className={t.to === "CANCELADA" ? "btn-danger" : "btn-primary"}
                >
                  {t.label}
                </SubmitButton>
              </form>
            ))}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <OSStatusBadge status={os.status} />
        <span className="text-xs text-muted">Aberta em {dateTime(os.createdAt)}</span>
        {os.concluidaEm && (
          <span className="text-xs text-muted">
            Concluída em {dateTime(os.concluidaEm)}
          </span>
        )}
        {os.pecasBaixadas && (
          <span className="badge bg-amber-100 text-amber-700">
            peças baixadas do estoque
          </span>
        )}
      </div>

      {os.status === "CANCELADA" && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <b>OS cancelada.</b>
          {ultimaObs ? ` ${ultimaObs}` : ""} O registro fica salvo para
          conferência.
        </div>
      )}

      {podeCancelar && (
        <section className="card mb-6 p-4">
          <CancelarOSForm id={id} />
        </section>
      )}

      {os.status === "ORCAMENTO" && (
        <section className="card mb-6 p-4">
          <form
            action={setOSCliente.bind(null, id)}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-64 flex-1">
              <label className="label">Cliente da OS</label>
              <select
                name="partnerId"
                className="input"
                defaultValue={os.partnerId ?? ""}
              >
                <option value="">— nenhum —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton className="btn-ghost">Definir cliente</SubmitButton>
            <Link href="/parceiros/novo" className="text-xs text-primary">
              cadastrar cliente
            </Link>
          </form>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <OSEditor
            action={saveServiceOrder.bind(null, id)}
            os={{
              status: os.status,
              tecnico: os.tecnico,
              descricaoProblema: os.descricaoProblema,
              diagnostico: os.diagnostico,
              kmEntrada: os.kmEntrada,
              previsaoEntrega: os.previsaoEntrega
                ? os.previsaoEntrega.toISOString()
                : null,
              observacao: os.observacao,
              desconto: os.desconto,
              vehicleId: os.vehicleId,
              temCliente: !!os.partnerId,
              items: os.items.map((i) => ({
                tipo: i.tipo,
                productId: i.productId,
                serviceId: i.serviceId,
                descricao: i.descricao,
                quantidade: i.quantidade,
                precoUnit: i.precoUnit,
                desconto: i.desconto,
              })),
            }}
            vehicles={vehicles.map((v) => ({
              id: v.id,
              label: [v.marca, v.modelo, v.placa ? `(${v.placa})` : "", v.ano]
                .filter(Boolean)
                .join(" "),
            }))}
            produtos={produtos.map((p) => ({
              id: p.id,
              sku: p.sku,
              nome: p.nome,
              precoVenda: p.precoVenda,
              estoque: p.estoque,
              unidade: p.unidade,
            }))}
            servicos={servicos.map((s) => ({
              id: s.id,
              codigo: s.codigo,
              nome: s.nome,
              preco: s.preco,
            }))}
          />
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Resumo</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Peças</span>
                <span>{money(os.totalPecas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Serviços</span>
                <span>{money(os.totalServicos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Desconto</span>
                <span>- {money(os.desconto)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
                <span>Total</span>
                <span>{money(os.total)}</span>
              </div>
            </dl>
          </section>

          {["CONCLUIDA", "ENTREGUE"].includes(os.status) && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Faturar</h2>
              {podeFaturar ? (
                <form action={faturarOS.bind(null, id)} className="space-y-2 text-sm">
                  {temServicos && !jaFaturouNfse && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="gerarNfse" value="1" defaultChecked />
                      Gerar NFS-e (serviços)
                    </label>
                  )}
                  {temPecas && !jaFaturouNfe && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="gerarNfe" value="1" defaultChecked />
                      Gerar NF-e (peças)
                    </label>
                  )}
                  <SubmitButton className="btn-primary w-full">
                    Gerar nota(s)
                  </SubmitButton>
                  <p className="text-xs text-muted">
                    As notas são criadas como rascunho e vinculadas à OS. Emita na
                    tela da nota.
                  </p>
                </form>
              ) : (
                <p className="text-sm text-muted">Nada a faturar no momento.</p>
              )}
            </section>
          )}

          {os.invoices.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Notas da OS</h2>
              <div className="space-y-2 text-sm">
                {os.invoices.map((n) => (
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

          {["ORCAMENTO", "CANCELADA"].includes(os.status) &&
            os.invoices.length === 0 && (
              <form action={deleteServiceOrder.bind(null, id)}>
                <ConfirmButton message="Excluir esta OS?" className="btn-danger w-full">
                  Excluir OS
                </ConfirmButton>
              </form>
            )}
        </aside>
      </div>

      <div className="mt-6">
        <Link href="/ordens-servico" className="text-sm text-primary">
          ← voltar para ordens de serviço
        </Link>
      </div>
    </div>
  );
}
