/**
 * Margem de lucro sobre o PREÇO DE VENDA (não markup sobre o custo):
 * margem 70% → do preço de venda, 70% é lucro e 30% é custo.
 * venda = custo / (1 − margem); ex.: custo 10,00 com 70% → 33,33.
 */
export function vendaPorMargem(custo: number, margemPct: number): number {
  if (!(margemPct < 100)) return NaN;
  return Math.round((custo / (1 - margemPct / 100) + Number.EPSILON) * 100) / 100;
}

/** Margem (%) que um preço de venda dá sobre ele mesmo. */
export function margemDe(custo: number, venda: number): number {
  if (!(venda > 0)) return NaN;
  return Math.round(((1 - custo / venda) * 100 + Number.EPSILON) * 100) / 100;
}
