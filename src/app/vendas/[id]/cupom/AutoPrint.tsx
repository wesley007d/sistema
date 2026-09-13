"use client";

import { useEffect } from "react";

/** Dispara a caixa de impressão do navegador ao abrir o cupom vindo do caixa. */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);
  return null;
}
