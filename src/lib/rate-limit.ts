import { headers } from "next/headers";

/**
 * Rate limiting simples em memória (fixed-window), para proteger login,
 * cadastro e autorização de admin contra força bruta / abuso.
 *
 * Suficiente para deploy em UM processo Node (o caso deste projeto: Next
 * `start` + SQLite). Se um dia rodar em várias instâncias / serverless, trocar
 * a implementação de `hit`/`reset` por uma tabela no banco ou Redis — a
 * interface (`RateResult`) pode ficar igual.
 */

interface Bucket {
  count: number;
  resetAt: number; // epoch ms em que a janela zera
}

// Sobrevive ao HMR do `next dev` (mesmo truque do Prisma client em lib/db.ts).
const g = globalThis as unknown as { __rlBuckets?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = g.__rlBuckets ?? (g.__rlBuckets = new Map());

let ultimaLimpeza = 0;
function limparExpirados(agora: number) {
  if (agora - ultimaLimpeza < 60_000) return;
  ultimaLimpeza = agora;
  for (const [k, b] of buckets) if (b.resetAt <= agora) buckets.delete(k);
}

export interface RateResult {
  /** false = estourou o limite; barrar a ação. */
  ok: boolean;
  /** segundos até a janela liberar (só faz sentido quando `ok` é false). */
  retryAfterSec: number;
}

/**
 * Registra uma tentativa para `key` e diz se ainda está dentro do limite
 * (`limit` tentativas a cada `windowMs`).
 */
export function hit(key: string, limit: number, windowMs: number): RateResult {
  const agora = Date.now();
  limparExpirados(agora);

  const b = buckets.get(key);
  if (!b || b.resetAt <= agora) {
    buckets.set(key, { count: 1, resetAt: agora + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  b.count++;
  if (b.count > limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - agora) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Zera o contador de `key` (chamar após um sucesso legítimo). */
export function reset(key: string) {
  buckets.delete(key);
}

/**
 * IP do cliente a partir dos headers da requisição. Atrás de proxy confiável
 * (nginx / plataforma) usa `x-forwarded-for`; sem proxy o valor é falsificável
 * — por isso todo endpoint também limita por um segundo eixo não-falsificável
 * (e-mail, empresa).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "desconhecido";
}

/** Converte segundos em um texto curto tipo "3 min" / "45 s". */
export function esperaLegivel(seg: number): string {
  return seg >= 60 ? `${Math.ceil(seg / 60)} min` : `${seg} s`;
}
