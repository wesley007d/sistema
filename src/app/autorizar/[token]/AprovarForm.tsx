"use client";

import { useActionState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { SubmitButton } from "@/components/SubmitButton";
import { aprovarPedido, type EstadoAprovacao } from "../actions";

export function AprovarForm({ token }: { token: string }) {
  const [estado, action] = useActionState<EstadoAprovacao, FormData>(
    aprovarPedido.bind(null, token),
    {},
  );

  if (estado.codigo) {
    const texto = `✅ Autorizado. Código: ${estado.codigo}`;
    return (
      <div className="mt-6 text-center">
        <p className="text-sm text-muted">Código de autorização</p>
        <p className="mt-1 font-mono text-4xl font-bold tracking-[0.3em]">{estado.codigo}</p>
        <p className="mt-2 text-xs text-muted">
          Mande este código para quem pediu. Ele vale só para este pedido, por até 30 minutos.
        </p>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
          className="btn-primary mt-4 inline-flex w-full justify-center"
        >
          Enviar código pelo WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-3">
      <p className="text-sm">Se concorda, confirme com o seu acesso de administrador:</p>
      <input
        name="email"
        type="email"
        required
        autoComplete="username"
        placeholder="Seu e-mail de administrador"
        className="input"
      />
      <PasswordInput name="senha" required autoComplete="current-password" placeholder="Sua senha" />
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <SubmitButton className="btn-primary w-full">Autorizar e gerar código</SubmitButton>
      <p className="text-center text-xs text-muted">
        Se você não reconhece este pedido, apenas feche esta página.
      </p>
    </form>
  );
}
