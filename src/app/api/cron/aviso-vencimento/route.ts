import { enviarAvisosVencimento } from "@/lib/aviso-vencimento";

export const dynamic = "force-dynamic";

/**
 * Disparado por um cron externo (ex.: cron-job.org ou GitHub Actions
 * agendado) uma vez por dia — esta hospedagem não tem cron nativo. Protegido
 * por CRON_SECRET (query "?secret=" ou header "Authorization: Bearer ...").
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secretEsperado = process.env.CRON_SECRET;
  const secretRecebido =
    url.searchParams.get("secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secretEsperado || secretRecebido !== secretEsperado) {
    return new Response("não autorizado", { status: 401 });
  }

  try {
    const resultados = await enviarAvisosVencimento();
    return Response.json({ ok: true, enviados: resultados.length, resultados });
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, erro }, { status: 500 });
  }
}
