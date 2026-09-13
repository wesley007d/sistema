"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { PasswordInput } from "@/components/PasswordInput";
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
        <PasswordInput
          id="atual"
          name="atual"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="nova">
          Nova senha
        </label>
        <PasswordInput
          id="nova"
          name="nova"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="confirmar">
          Repita a nova senha
        </label>
        <PasswordInput
          id="confirmar"
          name="confirmar"
          autoComplete="new-password"
          minLength={6}
          required
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
