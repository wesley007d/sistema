import { can, requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { FinanceNav } from "@/components/FinanceNav";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, SelectField } from "@/components/Field";
import { money, dateTime } from "@/lib/format";
import { accountBalanceUntil, getDefaultCashAccount } from "@/lib/finance";
import { criarMovimentoCaixa, transferir } from "../actions";
import { CancelarMovimentoForm } from "./CancelarMovimentoForm";

export const dynamic = "force-dynamic";

function monthRange() {
  const now = new Date();
  const de = new Date(now.getFullYear(), now.getMonth(), 1);
  const ate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    de: de.toISOString().slice(0, 10),
    ate: ate.toISOString().slice(0, 10),
  };
}

export default async function CaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ conta?: string; de?: string; ate?: string }>;
}) {
  const { user, db } = await requireDb();
  const full = can(user, "financeiro");
  await getDefaultCashAccount(user.companyId, db);
  const contas = await db.cashAccount.findMany({
    where: { ativo: true },
    orderBy: { createdAt: "asc" },
  });
  const sp = await searchParams;
  const range = monthRange();
  const contaId = sp.conta && contas.some((c) => c.id === sp.conta) ? sp.conta : contas[0]?.id;
  const de = sp.de || range.de;
  const ate = sp.ate || range.ate;
  const dtDe = new Date(de + "T00:00:00");
  const dtAte = new Date(ate + "T23:59:59");

  const conta = contas.find((c) => c.id === contaId)!;
  const saldoInicial = await accountBalanceUntil(contaId, dtDe, db);

  const movs = await db.cashTransaction.findMany({
    where: { accountId: contaId, data: { gte: dtDe, lte: dtAte } },
    include: { settlement: { select: { formaPagamento: true } } },
    orderBy: [{ data: "asc" }, { createdAt: "asc" }],
  });

  const delta = (m: (typeof movs)[number]) =>
    m.cancelado ? 0 : m.tipo === "ENTRADA" ? m.valor : -m.valor;
  const linhas = movs.map((m, i) => {
    const saldo = movs
      .slice(0, i + 1)
      .reduce((s, x) => s + delta(x), saldoInicial);
    return { m, saldo: Math.round(saldo * 100) / 100 };
  });
  const entradas = movs
    .filter((m) => !m.cancelado && m.tipo === "ENTRADA")
    .reduce((s, m) => s + m.valor, 0);
  const saidas = movs
    .filter((m) => !m.cancelado && m.tipo === "SAIDA")
    .reduce((s, m) => s + m.valor, 0);
  const hojeInput = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Fluxo de caixa" />
      <FinanceNav active="/financeiro/caixa" full={full} />

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Conta</label>
          <select name="conta" defaultValue={contaId} className="input">
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">De</label>
          <input type="date" name="de" defaultValue={de} className="input" />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" name="ate" defaultValue={ate} className="input" />
        </div>
        <SubmitButton className="btn-ghost">Filtrar</SubmitButton>
      </form>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card title="Saldo inicial" value={money(saldoInicial)} />
        <Card title="Entradas" value={money(entradas)} accent="text-green-700" />
        <Card title="Saídas" value={money(saidas)} accent="text-red-600" />
        <Card
          title="Saldo final"
          value={money(saldoInicial + entradas - saidas)}
          accent="text-primary"
        />
      </div>

      <div className="my-6 grid gap-4 lg:grid-cols-2">
        <details className="card p-4">
          <summary className="cursor-pointer font-medium">
            + Lançar movimento (suprimento / sangria / despesa)
          </summary>
          <form action={criarMovimentoCaixa} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="accountId" value={contaId} />
            <SelectField
              label="Tipo"
              name="tipo"
              options={[
                { value: "ENTRADA", label: "Entrada (suprimento)" },
                { value: "SAIDA", label: "Saída (sangria/despesa)" },
              ]}
            />
            <Field label="Valor" name="valor" type="number" step="0.01" required />
            <Field label="Descrição" name="descricao" required className="sm:col-span-2" />
            <Field label="Categoria" name="categoria" />
            <Field label="Forma de pagamento" name="forma" placeholder="Pix, dinheiro…" />
            <Field label="Data" name="data" type="date" defaultValue={hojeInput} />
            <div className="sm:col-span-2">
              <SubmitButton>Lançar</SubmitButton>
            </div>
          </form>
        </details>

        <details className="card p-4">
          <summary className="cursor-pointer font-medium">
            Transferência entre contas
          </summary>
          <form action={transferir} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">De</label>
              <select name="origemId" defaultValue={contaId} className="input">
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Para</label>
              <select name="destinoId" className="input">
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Valor" name="valor" type="number" step="0.01" required />
            <Field label="Data" name="data" type="date" defaultValue={hojeInput} />
            <div className="sm:col-span-2">
              <SubmitButton>Transferir</SubmitButton>
            </div>
          </form>
        </details>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Data</th>
              <th className="th">Descrição</th>
              <th className="th">Categoria</th>
              <th className="th">Forma</th>
              <th className="th text-right">Entrada</th>
              <th className="th text-right">Saída</th>
              <th className="th text-right">Saldo</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-background">
              <td className="td text-muted" colSpan={6}>
                Saldo inicial em {de} — {conta.nome}
              </td>
              <td className="td text-right font-medium">{money(saldoInicial)}</td>
              <td className="td"></td>
            </tr>
            {linhas.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={8}>
                  Nenhum movimento no período.
                </td>
              </tr>
            )}
            {linhas.map(({ m, saldo }) => (
              <tr
                key={m.id}
                className={`hover:bg-background ${m.cancelado ? "opacity-50" : ""}`}
              >
                <td className="td whitespace-nowrap text-muted">{dateTime(m.data)}</td>
                <td className="td">
                  <span className={m.cancelado ? "line-through" : ""}>
                    {m.descricao}
                  </span>
                  {m.origem !== "MANUAL" && (
                    <span className="ml-2 text-xs text-muted">
                      {m.origem.toLowerCase().replace("_", " ")}
                    </span>
                  )}
                  {m.cancelado && (
                    <p className="text-xs text-red-600">
                      Cancelado por {m.canceladoPor}: {m.canceladoMotivo}
                    </p>
                  )}
                </td>
                <td className="td text-muted">{m.categoria ?? "—"}</td>
                <td className="td text-muted">
                  {m.settlement?.formaPagamento ?? m.forma ?? "—"}
                </td>
                <td className="td text-right text-green-700">
                  {!m.cancelado && m.tipo === "ENTRADA" ? money(m.valor) : ""}
                </td>
                <td className="td text-right text-red-600">
                  {!m.cancelado && m.tipo === "SAIDA" ? money(m.valor) : ""}
                </td>
                <td className="td text-right font-medium">{money(saldo)}</td>
                <td className="td text-right">
                  {m.origem === "MANUAL" && !m.cancelado && (
                    <CancelarMovimentoForm id={m.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  accent = "",
}: {
  title: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <p className={`mt-2 text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
