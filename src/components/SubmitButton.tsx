"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children = "Salvar",
  className = "btn-primary",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Aguarde…" : children}
    </button>
  );
}
