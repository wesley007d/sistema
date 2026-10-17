"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

type Papel = "80" | "58" | "A4";
const CHAVE = "cupomPapel";

const OPCOES: { valor: Papel; label: string }[] = [
  { valor: "80", label: "Térmica 80mm" },
  { valor: "58", label: "Térmica 58mm" },
  { valor: "A4", label: "Folha A4" },
];

function lerPapel(): Papel {
  try {
    const v = localStorage.getItem(CHAVE);
    if (v === "80" || v === "58" || v === "A4") return v;
  } catch {}
  return "80";
}

const MUDOU = "cupomPapel:mudou";
function assinar(cb: () => void) {
  window.addEventListener(MUDOU, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(MUDOU, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Altura do cupom em mm, para a página da térmica ter o tamanho exato do
 * conteúdo (sem isso o navegador manda uma folha A4 e a bobina sai errada). */
function alturaMm() {
  const el = document.getElementById("cupom");
  if (!el) return 200;
  return Math.ceil((el.scrollHeight * 25.4) / 96) + 6;
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
        pageRef.current.textContent =
          papel === "A4"
            ? "@page { size: A4; margin: 12mm; }"
            : `@page { size: ${papel}mm ${alturaMm()}mm; margin: 0; }`;
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
      localStorage.setItem(CHAVE, p);
    } catch {}
    window.dispatchEvent(new Event(MUDOU));
  }

  const atual = papel ?? "80";
  const css =
    atual === "A4"
      ? `#cupom { width: 90mm; }`
      : `#cupom { width: ${atual === "80" ? 76 : 56}mm; max-width: none;
                  padding: 2mm ${atual === "80" ? 2 : 1}mm;
                  font-size: ${atual === "80" ? 12 : 10.5}px; }
         @media print { #cupom { margin: 0; } }`;

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
