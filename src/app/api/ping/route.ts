export const dynamic = "force-dynamic";

/**
 * Resposta mínima (sem banco). O próprio servidor chama esta rota pelo endereço
 * público a cada 4 min no horário da loja (instrumentation.ts): assim a
 * Hostinger vê acesso e não desliga o sistema por falta de uso — religar custa
 * vários segundos para quem clicar depois.
 */
export function GET() {
  return new Response("ok", { headers: { "Cache-Control": "no-store" } });
}
