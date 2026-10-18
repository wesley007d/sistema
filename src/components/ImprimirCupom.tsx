"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { imprimirCupom } from "@/lib/imprimir-cupom";

/** Botão que imprime o cupom/orçamento na hora, sem abrir outra aba. */
export function BotaoImprimirCupom({
  vendaId,
  className,
  children = "Imprimir",
}: {
  vendaId: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [carregando, setCarregando] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={carregando}
      onClick={async () => {
        setCarregando(true);
        await imprimirCupom(vendaId);
        setCarregando(false);
      }}
    >
      {carregando ? "Imprimindo…" : children}
    </button>
  );
}

/** Imprime o cupom assim que a tela abre (caixa, logo depois de receber) e
 * tira o ?imprimir= da URL para não imprimir de novo ao recarregar. */
export function AutoImprimirCupom({ vendaId }: { vendaId: string }) {
  const router = useRouter();
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    imprimirCupom(vendaId).finally(() => router.replace("/caixa"));
  }, [vendaId, router]);
  return null;
}
