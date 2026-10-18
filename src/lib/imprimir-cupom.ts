// Impressão do cupom sem abrir outra aba: busca a página do cupom, põe o
// conteúdo escondido na tela atual e imprime só ele. Com o Chrome em
// --kiosk-printing sai direto na impressora padrão.
// (Iframe não serve: o CSP/X-Frame-Options do sistema bloqueia frames.)

export type Papel = "80" | "58" | "A4";
export const CHAVE_PAPEL = "cupomPapel";

/** Papel escolhido neste computador (padrão: térmica 80mm). */
export function lerPapel(): Papel {
  try {
    const v = localStorage.getItem(CHAVE_PAPEL);
    if (v === "80" || v === "58" || v === "A4") return v;
  } catch {}
  return "80";
}

/** CSS da largura/fonte do cupom para o papel (seletor = o elemento do cupom). */
export function cssCupom(papel: Papel, sel: string) {
  return papel === "A4"
    ? `${sel} { width: 90mm; }`
    : `${sel} { width: ${papel === "80" ? 76 : 56}mm; max-width: none;
         padding: 2mm ${papel === "80" ? 2 : 1}mm;
         font-size: ${papel === "80" ? 12 : 10.5}px; }
       @media print { ${sel} { margin: 0; } }`;
}

/** @page do papel; na térmica, a altura é a do conteúdo (sem sobrar bobina). */
export function cssPagina(papel: Papel, el: HTMLElement | null) {
  if (papel === "A4") return "@page { size: A4; margin: 12mm; }";
  const altura = el ? Math.ceil((el.scrollHeight * 25.4) / 96) + 6 : 200;
  return `@page { size: ${papel}mm ${altura}mm; margin: 0; }`;
}

function esperarImagens(raiz: HTMLElement) {
  return Promise.all(
    Array.from(raiz.querySelectorAll("img")).map((i) =>
      i.complete
        ? null
        : new Promise((r) => {
            i.addEventListener("load", r, { once: true });
            i.addEventListener("error", r, { once: true });
          }),
    ),
  );
}

let imprimindo = false;

export async function imprimirCupom(vendaId: string) {
  if (imprimindo) return;
  imprimindo = true;
  try {
    const res = await fetch(`/vendas/${vendaId}/cupom`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const cupom = doc.getElementById("cupom");
    if (!cupom) throw new Error("cupom não encontrado");

    const papel = lerPapel();
    const caixa = document.createElement("div");
    caixa.id = "cupom-impressao";
    caixa.innerHTML = cupom.outerHTML;
    const el = caixa.firstElementChild as HTMLElement;
    el.id = "cupom-impressao-conteudo";

    const estilo = document.createElement("style");
    estilo.textContent = `${cssCupom(papel, "#cupom-impressao-conteudo")}
      @media screen { #cupom-impressao { position: fixed; left: -10000px; top: 0; } }
      @media print {
        html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
        body > *:not(#cupom-impressao) { display: none !important; }
      }`;
    const pagina = document.createElement("style");

    document.head.append(estilo, pagina);
    document.body.append(caixa);
    await esperarImagens(caixa);
    pagina.textContent = cssPagina(papel, el);

    const limpar = () => {
      caixa.remove();
      estilo.remove();
      pagina.remove();
    };
    window.addEventListener("afterprint", limpar, { once: true });
    window.print();
    // print() bloqueia até fechar a janela (ou imprimir direto no kiosk);
    // garante a limpeza mesmo se o afterprint não vier
    setTimeout(limpar, 1000);
  } catch (e) {
    console.error(e);
    // não conseguiu montar aqui: abre o cupom do jeito antigo
    window.open(`/vendas/${vendaId}/cupom?print=1`, "_blank");
  } finally {
    imprimindo = false;
  }
}
