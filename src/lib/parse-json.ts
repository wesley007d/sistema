import { z } from "zod";

/**
 * Faz `JSON.parse` de um campo de formulário e valida contra um schema de
 * array. Nunca confiar no blob que vem do navegador — números viram `finite`,
 * strings ganham teto, e o tamanho do array é limitado.
 */
export function parseArrayJson<T>(
  raw: string | null | undefined,
  itemSchema: z.ZodType<T>,
  label = "itens",
  maxItens = 300,
): T[] {
  let dados: unknown;
  try {
    dados = JSON.parse((raw ?? "").trim() || "[]");
  } catch {
    throw new Error(`Não foi possível ler os ${label} enviados.`);
  }
  const res = z.array(itemSchema).max(maxItens).safeParse(dados);
  if (!res.success) {
    throw new Error(`Há ${label} com dados inválidos ou incompletos.`);
  }
  return res.data;
}

/** Number finito, não-negativo, com teto (preços, quantidades, descontos). */
export const zMoeda = z.number().finite().gte(0).lte(100_000_000);

/** Quantidade: > 0 e finita. */
export const zQtd = z.number().finite().gt(0).lte(1_000_000);

/** Id opcional (cuid) — string curta ou nulo/ausente. */
export const zIdOpc = z.string().max(60).nullish();
