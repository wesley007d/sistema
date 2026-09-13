"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { registrarErroCliente } from "./error-actions";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    registrarErroCliente({
      mensagem: error.message,
      stack: error.stack,
      rota: pathname,
      digest: error.digest,
    }).catch(() => {});
  }, [error, pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="max-w-sm text-sm text-muted">
        {error.digest
          ? `Não foi possível carregar esta página. Código: ${error.digest}`
          : "Não foi possível carregar esta página. Tente novamente."}
      </p>
      <button onClick={() => retry()} className="btn-primary mt-2">
        Tentar de novo
      </button>
    </div>
  );
}
