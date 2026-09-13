"use client";

import { useState } from "react";

export function CopyButton({ texto, className = "btn-ghost" }: { texto: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <button type="button" onClick={copiar} className={className}>
      {copiado ? "Copiado!" : "Copiar código"}
    </button>
  );
}
