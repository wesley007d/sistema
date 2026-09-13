"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
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
        <input
          id="senhaAtual"
          name="senhaAtual"
          type="password"
          autoComplete="current-password"
          required
          className="input"
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
      <Aviso state={state} />
      <SubmitButton className="btn-ghost">Trocar senha</SubmitButton>
    </form>
  );
}
