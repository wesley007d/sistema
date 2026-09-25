"use client";

import { useEffect, useRef, useState } from "react";
import { Barcode } from "@/components/Barcode";
import { money, parseNumber } from "@/lib/format";

interface Dados {
  nome: string;
  sku: string;
  codigoBarras: string;
  precoVenda: number;
}

/**
 * Prévia da etiqueta que acompanha o cadastro: lê os campos do formulário
 * enquanto a pessoa digita (não precisa salvar para ver como vai ficar).
 * Fica presa no topo da tela para continuar visível ao rolar o formulário.
 */
export function EtiquetaPrevia({ inicial }: { inicial: Dados }) {
  const raiz = useRef<HTMLDivElement>(null);
  const [d, setD] = useState<Dados>(inicial);

  useEffect(() => {
    const form = raiz.current?.closest("form");
    if (!form) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const ler = () => {
      const fd = new FormData(form);
      setD({
        nome: String(fd.get("nome") ?? ""),
        sku: String(fd.get("sku") ?? "").trim(),
        codigoBarras: String(fd.get("codigoBarras") ?? "").trim(),
        precoVenda: parseNumber(fd.get("precoVenda")),
      });
    };
    // Espera o React aplicar o que o próprio formulário recalcula (ex.: preço pela margem).
    const agenda = () => {
      clearTimeout(t);
      t = setTimeout(ler, 0);
    };
    form.addEventListener("input", agenda);
    form.addEventListener("change", agenda);
    return () => {
      clearTimeout(t);
      form.removeEventListener("input", agenda);
      form.removeEventListener("change", agenda);
    };
  }, []);

  const codigo = d.codigoBarras || d.sku;

  return (
    <div
      ref={raiz}
      className="sticky top-2 z-10 -mx-1 flex flex-wrap items-center gap-5 rounded-xl border border-border bg-surface/95 p-4 shadow-md backdrop-blur"
    >
      <div
        className="flex w-52 shrink-0 flex-col items-center justify-center gap-0.5 rounded border border-dashed border-gray-400 bg-white px-2 py-2 text-center text-black"
        aria-label="Prévia da etiqueta"
      >
        <p className="line-clamp-2 min-h-[24px] w-full text-[10px] font-semibold leading-tight">
          {d.nome || "Nome do produto"}
        </p>
        <Barcode value={codigo || "P0001"} height={34} width={1.4} fontSize={10} />
        <p className="text-sm font-bold">{money(d.precoVenda)}</p>
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Prévia da etiqueta</p>
        <p className="text-xs text-muted">
          Atualiza enquanto você preenche o cadastro — não precisa salvar para
          ver como fica.
        </p>
        {!codigo && (
          <p className="mt-1 text-xs text-amber-700">
            Ainda sem código: o exemplo usa P0001; o código real é gerado ao
            salvar (ou digite o seu em Código / SKU).
          </p>
        )}
      </div>
    </div>
  );
}
