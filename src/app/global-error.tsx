"use client";

import { useEffect } from "react";
import { registrarErroCliente } from "./error-actions";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    registrarErroCliente({
      mensagem: error.message,
      stack: error.stack,
      rota: "(global)",
      digest: error.digest,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Algo deu errado
        </h1>
        <p style={{ maxWidth: 360, fontSize: "0.875rem", color: "#64748b" }}>
          {error.digest
            ? `Não foi possível carregar o sistema. Código: ${error.digest}`
            : "Não foi possível carregar o sistema. Tente novamente."}
        </p>
        <button
          onClick={() => retry()}
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 1.25rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
