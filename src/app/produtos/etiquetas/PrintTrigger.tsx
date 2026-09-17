"use client";

import { useEffect } from "react";

/** Dispara a caixa de impressão do navegador ao abrir com ?print=1. */
export function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}
