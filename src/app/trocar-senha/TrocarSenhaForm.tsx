"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { definirNovaSenha } from "./actions";

type State = { erro?: string } | undefined;

export function TrocarSenhaForm() {
  const [state, formAction] = useActionState<State, FormData>(
    definirNovaSenha,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="atual">
          Senha atual (a que o administrador te passou)
        </label>
        <input
          id="atual"
          name="atual"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="nova">
          Nova senha
        </label>
        <input
          id="nova"
          name="nova"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="confirmar">
          Repita a nova senha
        </label>
        <input
          id="confirmar"
          name="confirmar"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          className="input"
        />
      </div>

      {state?.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.erro}
        </p>
      )}

      <SubmitButton className="btn-primary w-full">
        Salvar e entrar
      </SubmitButton>
    </form>
  );
}
