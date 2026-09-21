"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { PasswordInput } from "@/components/PasswordInput";
import { signupCompany } from "./actions";

type State = { erro?: string } | undefined;

export function CadastroForm() {
  const [state, formAction] = useActionState<State, FormData>(signupCompany, undefined);
  const [cnpj, setCnpj] = useState("");
  const [preview, setPreview] = useState<{ razaoSocial: string; situacao: string } | null>(null);
  const [erroPreview, setErroPreview] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  async function verificarCnpj() {
    setErroPreview(null);
    setPreview(null);
    setVerificando(true);
    try {
      const res = await fetch(`/cadastro/buscar-cnpj?cnpj=${encodeURIComponent(cnpj)}`);
      const json = await res.json();
      if (!res.ok) setErroPreview(json.erro || "Não foi possível verificar o CNPJ.");
      else setPreview(json.dados);
    } catch {
      setErroPreview("Não foi possível verificar o CNPJ agora.");
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center lg:hidden">
        <Logo size="lg" />
      </div>

      <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-7 shadow-sm">
        <h1 className="text-xl font-semibold">Cadastre sua empresa</h1>
        <p className="text-sm text-muted">
          Cria uma conta nova e isolada para a sua loja, com você como administrador. A razão
          social é confirmada automaticamente pelo CNPJ na Receita Federal.
        </p>

        <div>
          <label className="label">CNPJ</label>
          <div className="flex gap-2">
            <input
              name="cnpj"
              required
              className="input"
              value={cnpj}
              onChange={(e) => {
                setCnpj(e.target.value);
                setPreview(null);
                setErroPreview(null);
              }}
            />
            <button
              type="button"
              onClick={verificarCnpj}
              disabled={verificando || !cnpj}
              className="btn-ghost whitespace-nowrap"
            >
              {verificando ? "Verificando…" : "Verificar"}
            </button>
          </div>
          {preview && (
            <p className="mt-1 text-sm text-green-700">
              ✓ {preview.razaoSocial} — situação {preview.situacao}
            </p>
          )}
          {erroPreview && <p className="mt-1 text-sm text-red-700">{erroPreview}</p>}
        </div>
        <div>
          <label className="label">Nome fantasia (opcional)</label>
          <input name="nomeFantasia" className="input" />
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
          <PasswordInput name="senha" required />
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
