"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  CHAVE_PAPEL,
  cssCupom,
  cssPagina,
  lerPapel,
  type Papel,
} from "@/lib/imprimir-cupom";

const OPCOES: { valor: Papel; label: string }[] = [
  { valor: "80", label: "Térmica 80mm" },
  { valor: "58", label: "Térmica 58mm" },
  { valor: "A4", label: "Folha A4" },
];

const MUDOU = "cupomPapel:mudou";
function assinar(cb: () => void) {
  window.addEventListener(MUDOU, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(MUDOU, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Escolha do papel da impressora (fica salva neste computador) e o CSS de
 * impressão correspondente. Com `autoPrint`, abre a impressão já no tamanho
 * certo assim que o cupom (e a logo) carregam.
 */
export function PapelCupom({ autoPrint }: { autoPrint: boolean }) {
  // null no servidor; no navegador vem do localStorage deste computador
  const papel = useSyncExternalStore(assinar, lerPapel, () => null);
  const pageRef = useRef<HTMLStyleElement>(null);

  // @page da térmica com a altura do conteúdo, medida na hora de imprimir
  useEffect(() => {
    if (!papel) return;
    const medir = () => {
      if (pageRef.current)
        pageRef.current.textContent = cssPagina(
          papel,
          document.getElementById("cupom"),
        );
    };
    medir();
    window.addEventListener("beforeprint", medir);
    return () => window.removeEventListener("beforeprint", medir);
  }, [papel]);

  const jaImprimiu = useRef(false);
  useEffect(() => {
    if (!papel || !autoPrint || jaImprimiu.current) return;
    jaImprimiu.current = true;
    let cancelado = false;
    const imgs = Array.from(
      document.querySelectorAll<HTMLImageElement>("#cupom img"),
    );
    Promise.all(
      imgs.map((i) =>
        i.complete
          ? null
          : new Promise((r) => {
              i.addEventListener("load", r, { once: true });
              i.addEventListener("error", r, { once: true });
            }),
      ),
    ).then(() => {
      setTimeout(() => !cancelado && window.print(), 250);
    });
    return () => {
      cancelado = true;
    };
  }, [papel, autoPrint]);

  function escolher(p: Papel) {
    try {
      localStorage.setItem(CHAVE_PAPEL, p);
    } catch {}
    window.dispatchEvent(new Event(MUDOU));
  }

  const atual = papel ?? "80";
  const css = cssCupom(atual, "#cupom");

  return (
    <>
      <style ref={pageRef} />
      <style>{`${css}
        @media print { html, body { background: #fff !important; margin: 0; padding: 0; } }`}</style>
      <div className="mb-3 flex flex-wrap items-center gap-2 font-sans text-xs print:hidden">
        <span className="text-gray-600">Papel da impressora:</span>
        {OPCOES.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => escolher(o.valor)}
            className={`rounded border px-2 py-1 ${
              atual === o.valor
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-black"
            }`}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => window.print()}
          className="ml-auto rounded bg-black px-3 py-1 text-white"
        >
          Imprimir
        </button>
      </div>
    </>
  );
}
