"use client";

import { useFormStatus } from "react-dom";

/** Botao de submit que pede confirmacao antes de enviar o form (ex.: excluir). */
export function ConfirmButton({
  children,
  message = "Tem certeza?",
  className = "btn-danger",
}: {
  children: React.ReactNode;
  message?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
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
