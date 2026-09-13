"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Recarrega os dados do servidor a cada `segundos` sem piscar a tela. */
export function AutoRefresh({ segundos = 20 }: { segundos?: number }) {
  const router = useRouter();
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(id);
  }, [router, segundos, ativo]);

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <input
        type="checkbox"
        checked={ativo}
        onChange={(e) => setAtivo(e.target.checked)}
      />
      Atualizar automático ({segundos}s)
    </label>
  );
}
