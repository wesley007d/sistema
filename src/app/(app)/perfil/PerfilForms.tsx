"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { PasswordInput } from "@/components/PasswordInput";
import { atualizarMeusDados, trocarMinhaSenha } from "./actions";

type State = { ok?: string; erro?: string } | undefined;

function Aviso({ state }: { state: State }) {
  if (state?.erro)
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.erro}
      </p>
    );
  if (state?.ok)
    return (
      <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
        {state.ok}
      </p>
    );
  return null;
}

export function DadosForm({ nome, email }: { nome: string; email: string }) {
  const [state, action] = useActionState<State, FormData>(
    atualizarMeusDados,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="nome">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          defaultValue={nome}
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="email">
          E-mail (usado para entrar)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={email}
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="senhaAtual">
          Sua senha atual (para confirmar)
        </label>
        <PasswordInput
          id="senhaAtual"
          name="senhaAtual"
          autoComplete="current-password"
          required
        />
      </div>
      <Aviso state={state} />
      <SubmitButton className="btn-ghost">Salvar dados</SubmitButton>
    </form>
  );
}

export function SenhaForm() {
  const [state, action] = useActionState<State, FormData>(
    trocarMinhaSenha,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="atual">
          Senha atual
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
      <Aviso state={state} />
      <SubmitButton className="btn-ghost">Trocar senha</SubmitButton>
    </form>
  );
}
