"use client";

import { useActionState } from "react";
import { zerarDadosEmpresa } from "../../actions";

type State = { ok?: string; erro?: string } | undefined;

export function ZerarDadosForm({ companyId, nome }: { companyId: string; nome: string }) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    zerarDadosEmpresa.bind(null, companyId),
    undefined,
  );

  if (state?.ok)
    return (
      <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>
    );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Apagar os dados de ${nome}? Isso não pode ser desfeito pelo sistema.`))
          e.preventDefault();
      }}
      className="space-y-3"
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="parceiros" />
        Apagar também clientes e fornecedores cadastrados
      </label>
      <div>
        <label className="label" htmlFor="confirmacao">
          Para confirmar, digite o nome da empresa: <strong>{nome}</strong>
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          autoComplete="off"
          className="input max-w-sm"
          required
        />
      </div>
      {state?.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.erro}</p>
      )}
      <button type="submit" className="btn-danger" disabled={pending}>
        {pending ? "Apagando…" : "Zerar dados da empresa"}
      </button>
    </form>
  );
}
