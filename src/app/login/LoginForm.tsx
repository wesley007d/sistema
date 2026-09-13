"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { login } from "./actions";

type State = { erro?: string } | undefined;

export function LoginForm() {
  const [state, formAction] = useActionState<State, FormData>(login, undefined);

  return (
    <div className="w-full max-w-sm">
      <Logo size="lg" className="mb-8 flex justify-center lg:hidden" />

      <div className="rounded-xl border border-border bg-surface p-7 shadow-sm">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Acesse o painel da sua loja.</p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
              className="input"
            />
          </div>

          {state?.erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.erro}
            </p>
          )}

          <SubmitButton className="btn-primary w-full">Entrar</SubmitButton>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        Não tem conta?{" "}
        <Link
          href="/cadastro"
          className="font-medium text-primary hover:underline"
        >
          Cadastre sua empresa
        </Link>
      </p>
    </div>
  );
}
