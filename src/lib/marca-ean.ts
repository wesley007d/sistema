import type { ScopedDb } from "@/lib/tenant-db";

/**
 * A NF-e não tem campo de marca. O que ela traz é o código de barras (GTIN),
 * cujos primeiros dígitos identificam a empresa que registrou o produto no GS1
 * — na prática, o fabricante. Assim a marca é "aprendida": quando um produto
 * do mesmo fabricante já tem marca no catálogo, os novos herdam.
 */

/** GTIN válido (8, 12, 13 ou 14 dígitos); "SEM GTIN" e afins viram null. */
export function gtinValido(v: string | null | undefined): string | null {
  const d = (v ?? "").trim();
  return /^(\d{8}|\d{12,14})$/.test(d) && !/^0+$/.test(d) ? d : null;
}

/** Prefixo de empresa GS1 (no Brasil, 789/790 + ao menos 4 dígitos). */
function prefixoFabricante(gtin: string | null | undefined): string | null {
  return gtin && gtin.length === 13 ? gtin.slice(0, 7) : null;
}

function prefixoComum(a: string, b: string) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return i;
}

/** Marca de um produto já cadastrado do mesmo fabricante, se houver. */
export async function marcaPeloGtin(db: ScopedDb, gtin: string | null) {
  const pre = prefixoFabricante(gtin);
  if (!gtin || !pre) return null;
  const candidatos = await db.product.findMany({
    where: { codigoBarras: { startsWith: pre }, marca: { not: null } },
    select: { codigoBarras: true, marca: true },
    take: 100,
  });
  let melhor: { marca: string; n: number } | null = null;
  for (const c of candidatos) {
    const marca = c.marca?.trim();
    if (!marca || !c.codigoBarras) continue;
    const n = prefixoComum(gtin, c.codigoBarras);
    if (!melhor || n > melhor.n) melhor = { marca, n };
  }
  return melhor?.marca ?? null;
}

/** Preenche a marca dos outros produtos do mesmo fabricante que estão sem marca. */
export async function espalharMarca(
  db: ScopedDb,
  productId: string,
  gtin: string | null,
  marca: string | null,
) {
  const pre = prefixoFabricante(gtinValido(gtin));
  if (!pre || !marca?.trim()) return 0;
  const r = await db.product.updateMany({
    where: {
      id: { not: productId },
      codigoBarras: { startsWith: pre },
      OR: [{ marca: null }, { marca: "" }],
    },
    data: { marca: marca.trim() },
  });
  return r.count;
}
