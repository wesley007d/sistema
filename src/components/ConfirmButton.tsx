"use client";

import { useFormStatus } from "react-dom";

/** Botao de submit que pede confirmacao antes de enviar o form (ex.: excluir). */
export function ConfirmButton({
  children,
  message = "Tem certeza?",
  className = "btn-danger",
  form,
}: {
  children: React.ReactNode;
  message?: string;
  className?: string;
  /** id do <form> quando o botão fica fora dele */
  form?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      form={form}
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "Aguarde…" : children}
    </button>
  );
}
