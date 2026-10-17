// Busca por texto livre: ignora maiúsculas/minúsculas (no Postgres o
// `contains` padrão diferencia) e aceita as palavras em qualquer ordem —
// "kit rel bros" acha "Z-KIT REL BROS 150 03/15". Cada palavra precisa
// aparecer em pelo menos um dos campos.
export function buscaPorPalavras<C extends string>(termo: string, campos: C[]) {
  const palavras = termo.trim().split(/\s+/).filter(Boolean).slice(0, 8);
  return {
    AND: palavras.map((p) => ({
      OR: campos.map((c) => ({
        [c]: { contains: p, mode: "insensitive" as const },
      })) as { [K in C]?: { contains: string; mode: "insensitive" } }[],
    })),
  };
}
