"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { buscarMotivoErro, registrarErroCliente } from "./error-actions";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();
  const [motivo, setMotivo] = useState<string | null>(null);

  useEffect(() => {
    registrarErroCliente({
      mensagem: error.message,
      stack: error.stack,
      rota: pathname,
      digest: error.digest,
    }).catch(() => {});

    // o servidor grava o motivo real; pode levar um instante para aparecer
    let vivo = true;
    (async () => {
      for (const espera of [300, 1500, 3000]) {
        await new Promise((r) => setTimeout(r, espera));
        const m = await buscarMotivoErro(error.digest).catch(() => null);
        if (!vivo) return;
        if (m) return setMotivo(m);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [error, pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      {motivo ? (
        <p className="max-w-md rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="font-semibold">Motivo: </span>
          {motivo}
        </p>
      ) : (
        <p className="max-w-sm text-sm text-muted">
          Não foi possível concluir esta ação. Tente novamente.
        </p>
      )}
      {error.digest && <p className="text-xs text-muted">Código: {error.digest}</p>}
      <button onClick={() => retry()} className="btn-primary mt-2">
        Tentar de novo
      </button>
    </div>
  );
}
