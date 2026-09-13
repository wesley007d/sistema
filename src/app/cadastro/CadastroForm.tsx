"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { signupCompany } from "./actions";

type State = { erro?: string } | undefined;

export function CadastroForm() {
  const [state, formAction] = useActionState<State, FormData>(signupCompany, undefined);

  return (
    <div className="w-full max-w-md">
      <Logo size="lg" className="mb-8 flex justify-center lg:hidden" />

      <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-7 shadow-sm">
        <h1 className="text-xl font-semibold">Cadastre sua empresa</h1>
        <p className="text-sm text-muted">
          Cria uma conta nova e isolada para a sua loja, com você como administrador.
        </p>

        <div>
          <label className="label">Razão social</label>
          <input name="razaoSocial" required className="input" />
        </div>
        <div>
          <label className="label">Nome fantasia</label>
          <input name="nomeFantasia" className="input" />
        </div>
        <div>
          <label className="label">CNPJ</label>
          <input name="cnpj" className="input" />
        </div>

        <hr className="border-border" />

        <div>
          <label className="label">Seu nome</label>
          <input name="nome" required className="input" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label">Senha</label>
          <input name="senha" type="password" required className="input" />
        </div>

        {state?.erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.erro}
          </p>
        )}

        <SubmitButton className="btn-primary w-full">Criar empresa e entrar</SubmitButton>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
