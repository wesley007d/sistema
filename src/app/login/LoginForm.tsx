"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { PasswordInput } from "@/components/PasswordInput";
import { login } from "./actions";

type State = { erro?: string } | undefined;

export function LoginForm() {
  const [state, formAction] = useActionState<State, FormData>(login, undefined);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex justify-center lg:hidden">
        <Logo size="lg" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-7 shadow-sm">
        <div className="mb-5 hidden justify-center lg:flex">
          <Logo size="lg" />
        </div>
        <h1 className="text-xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Acesse o painel da sua loja.</p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Digite seu e-mail"
                required
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="senha">
              Senha
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-center text-muted">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden="true">
                  <rect x="4" y="10.5" width="16" height="10" rx="2" />
                  <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
                </svg>
              </span>
              <PasswordInput
                id="senha"
                name="senha"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                required
                className="input pl-10"
              />
            </div>
          </div>

          {state?.erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.erro}
            </p>
          )}

          <SubmitButton className="btn-primary flex w-full items-center justify-center gap-2 bg-gradient-to-r from-primary to-[#0f306e] hover:opacity-95">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            Entrar
          </SubmitButton>
        </form>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm text-muted">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
          <path d="M3.5 10.5 12 3l8.5 7.5M5 9.5V20h4.5v-5.5h5V20H19V9.5" />
        </svg>
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
