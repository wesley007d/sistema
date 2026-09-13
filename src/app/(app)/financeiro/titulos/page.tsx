import Link from "next/link";
import { can, requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { FinanceNav } from "@/components/FinanceNav";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, SelectField } from "@/components/Field";
import { money, date } from "@/lib/format";
import { getDefaultCashAccount } from "@/lib/finance";
import { baixarTitulo, criarTitulo } from "../actions";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, string> = {
  ABERTO: "bg-gray-100 text-gray-600",
  PARCIAL: "bg-amber-100 text-amber-700",
  PAGO: "bg-green-100 text-green-700",
  CANCELADO: "bg-red-100 text-red-700",
};

export default async function TitulosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; status?: string; f?: string }>;
}) {
  const { user, db } = await requireDb();
  // Sem `financeiro` completo (só `financeiro_caixa`): vê apenas recebíveis.
  const full = can(user, "financeiro");
  await getDefaultCashAccount(user.companyId, db);
  const { tipo, status, f } = await searchParams;

  const amanha = new Date();
  amanha.setHours(0, 0, 0, 0);
  amanha.setDate(amanha.getDate() + 1);

  const where: Record<string, unknown> = {};
  if (!full) where.tipo = "RECEBER";
  else if (tipo) where.tipo = tipo;
  if (status) where.status = status;
  if (f === "vencidos") {
    where.status = { in: ["ABERTO", "PARCIAL"] };
    where.vencimento = { lt: amanha };
  }

  const [titulos, contas, parceiros] = await Promise.all([
    db.financialEntry.findMany({
      where,
      include: { partner: true, settlements: true },
      orderBy: { vencimento: "asc" },
      take: 300,
    }),
    db.cashAccount.findMany({ where: { ativo: true }, orderBy: { createdAt: "asc" } }),
    db.partner.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  const hojeInput = new Date().toISOString().slice(0, 10);
  const totalSaldo = titulos
    .filter((t) => t.status === "ABERTO" || t.status === "PARCIAL")
    .reduce((s, t) => s + (t.valor - t.valorPago), 0);

  const filtros = full
    ? [
        { label: "Todos", qs: "" },
        { label: "A receber", qs: "tipo=RECEBER" },
        { label: "A pagar", qs: "tipo=PAGAR" },
        { label: "Em aberto", qs: "status=ABERTO" },
        { label: "Vencidos", qs: "f=vencidos" },
        { label: "Pagos", qs: "status=PAGO" },
      ]
    : [
        { label: "Todos", qs: "" },
        { label: "Em aberto", qs: "status=ABERTO" },
        { label: "Vencidos", qs: "f=vencidos" },
        { label: "Pagos", qs: "status=PAGO" },
      ];

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle={
          full
            ? "Títulos — contas a pagar e a receber"
            : "Recebíveis de clientes"
        }
      />
      <FinanceNav active="/financeiro/titulos" full={full} />

      {full && (
      <details className="card mb-6 p-4">
        <summary className="cursor-pointer font-medium">+ Novo título</summary>
        <form action={criarTitulo} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Tipo"
            name="tipo"
            options={[
              { value: "RECEBER", label: "A receber" },
              { value: "PAGAR", label: "A pagar" },
            ]}
          />
          <Field label="Descrição" name="descricao" required className="lg:col-span-2" />
          <Field label="Categoria" name="categoria" hint="ex.: Aluguel, Impostos" />
          <Field label="Valor total" name="valor" type="number" step="0.01" required />
          <Field label="1º vencimento" name="vencimento" type="date" required defaultValue={hojeInput} />
          <Field label="Parcelas" name="parcelas" type="number" defaultValue={1} hint="mensais" />
          <div>
            <label className="label">Cliente/Fornecedor</label>
            <select name="partnerId" className="input" defaultValue="">
              <option value="">—</option>
              {parceiros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <Field label="Observação" name="observacao" className="lg:col-span-3" />
          <div className="lg:col-span-4">
            <SubmitButton>Lançar título</SubmitButton>
          </div>
        </form>
      </details>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {filtros.map((ft) => {
          const currentQs = new URLSearchParams({
            ...(tipo ? { tipo } : {}),
            ...(status ? { status } : {}),
            ...(f ? { f } : {}),
          }).toString();
          const active = currentQs === ft.qs;
          return (
            <Link
              key={ft.label}
              href={ft.qs ? `/financeiro/titulos?${ft.qs}` : "/financeiro/titulos"}
              className={`badge border ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {ft.label}
            </Link>
          );
        })}
      </div>

      <p className="mb-2 text-sm text-muted">
        {titulos.length} título(s) · saldo em aberto exibido:{" "}
        <b className="text-foreground">{money(totalSaldo)}</b>
      </p>

      <div className="card divide-y divide-border">
        {titulos.length === 0 && (
          <p className="p-4 text-sm text-muted">Nenhum título neste filtro.</p>
        )}
        {titulos.map((t) => {
          const saldo = t.valor - t.valorPago;
          const aberto = t.status === "ABERTO" || t.status === "PARCIAL";
          const vencido = aberto && t.vencimento < amanha;
          return (
            <div key={t.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span
                    className={`badge mr-2 ${
                      t.tipo === "RECEBER"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {t.tipo === "RECEBER" ? "receber" : "pagar"}
                  </span>
                  <Link
                    href={`/financeiro/titulos/${t.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {t.descricao}
                  </Link>
                  <span className="ml-2 text-xs text-muted">
                    {t.partner?.nome ? `${t.partner.nome} · ` : ""}
                    vence {date(t.vencimento)}
                    {vencido && <span className="text-red-600"> (vencido)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${statusBadge[t.status]}`}>
                    {t.status.toLowerCase()}
                  </span>
                  <span className="text-right">
                    <span className="block font-medium">{money(t.valor)}</span>
                    {t.valorPago > 0 && (
                      <span className="block text-xs text-muted">
                        pago {money(t.valorPago)} · resta {money(saldo)}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {aberto && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-primary">
                    Dar baixa
                  </summary>
                  <form
                    action={baixarTitulo.bind(null, t.id)}
                    className="mt-2 flex flex-wrap items-end gap-2"
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
                      <input
                        name="data"
                        type="date"
                        defaultValue={hojeInput}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Forma</label>
                      <input name="formaPagamento" className="input w-32" placeholder="Pix, dinheiro…" />
                    </div>
                    <SubmitButton className="btn-primary">Baixar</SubmitButton>
                  </form>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
