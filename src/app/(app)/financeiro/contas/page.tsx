import { redirect } from "next/navigation";
import { can, requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { FinanceNav } from "@/components/FinanceNav";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Field, SelectField } from "@/components/Field";
import { money } from "@/lib/format";
import { accountBalance, getDefaultCashAccount } from "@/lib/finance";
import { atualizarConta, criarConta, excluirConta } from "../actions";

export const dynamic = "force-dynamic";

export default async function ContasPage() {
  const { user, db } = await requireDb();
  if (!can(user, "financeiro")) redirect("/financeiro/caixa");
  await getDefaultCashAccount(user.companyId, db);
  const contas = await db.cashAccount.findMany({ orderBy: { createdAt: "asc" } });
  const comSaldo = await Promise.all(
    contas.map(async (c) => ({
      c,
      saldo: await accountBalance(c.id, db),
      movs: await db.cashTransaction.count({ where: { accountId: c.id } }),
    })),
  );

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Contas (caixa e bancos)" />
      <FinanceNav active="/financeiro/contas" />

      <details className="card mb-6 p-4">
        <summary className="cursor-pointer font-medium">+ Nova conta</summary>
        <form action={criarConta} className="mt-3 grid gap-3 sm:grid-cols-4">
          <Field label="Nome" name="nome" required className="sm:col-span-2" />
          <SelectField
            label="Tipo"
            name="tipo"
            options={[
              { value: "CAIXA", label: "Caixa" },
              { value: "BANCO", label: "Conta bancária" },
            ]}
          />
          <Field label="Saldo inicial" name="saldoInicial" type="number" step="0.01" defaultValue={0} />
          <div className="sm:col-span-4">
            <SubmitButton>Criar conta</SubmitButton>
          </div>
        </form>
      </details>

      <div className="space-y-4">
        {comSaldo.map(({ c, saldo, movs }) => (
          <section key={c.id} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">
                {c.nome}{" "}
                <span className="text-xs font-normal text-muted">
                  {c.tipo.toLowerCase()}
                </span>
                {!c.ativo && (
                  <span className="badge ml-2 bg-gray-100 text-gray-500">inativa</span>
                )}
              </h3>
              <span className="text-right">
                <span className="block text-xs text-muted">saldo atual</span>
                <span className={`font-bold ${saldo < 0 ? "text-red-600" : ""}`}>
                  {money(saldo)}
                </span>
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <form
                action={atualizarConta.bind(null, c.id)}
                className="grid items-end gap-3 sm:grid-cols-4"
              >
                <Field label="Nome" name="nome" defaultValue={c.nome} className="sm:col-span-2" />
                <SelectField
                  label="Tipo"
                  name="tipo"
                  defaultValue={c.tipo}
                  options={[
                    { value: "CAIXA", label: "Caixa" },
                    { value: "BANCO", label: "Conta bancária" },
                  ]}
                />
                <Field
                  label="Saldo inicial"
                  name="saldoInicial"
                  type="number"
                  step="0.01"
                  defaultValue={c.saldoInicial}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="ativo" defaultChecked={c.ativo} className="size-4" />
                  Ativa
                </label>
                <div className="sm:col-span-4">
                  <SubmitButton className="btn-ghost">Salvar</SubmitButton>
                </div>
              </form>
              {movs === 0 && (
                <form action={excluirConta.bind(null, c.id)} className="mt-2">
                  <ConfirmButton message="Excluir esta conta?">Excluir conta</ConfirmButton>
                </form>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
