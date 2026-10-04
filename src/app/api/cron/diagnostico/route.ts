export const dynamic = "force-dynamic";

/**
 * Diz quais variáveis de ambiente o servidor está enxergando (só sim/não,
 * nunca o valor) — para conferir configuração da Hostinger sem login.
 * Protegido pelo mesmo CRON_SECRET da rota de aviso de vencimento.
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

  const nomes = [
    "MERCADOPAGO_ACCESS_TOKEN",
    "MERCADOPAGO_WEBHOOK_SECRET",
    "SUPORTE_CONTATO",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "ALERTA_CADASTRO_EMAIL",
  ];
  const variaveis = Object.fromEntries(nomes.map((n) => [n, !!process.env[n]?.trim()]));
  // nomes parecidos (espaço, letra trocada) que indicam variável cadastrada errada
  const parecidas = Object.keys(process.env).filter(
    (k) => /MERCADO|SUPORTE/i.test(k) && !nomes.includes(k),
  );
  return Response.json({ variaveis, parecidas });
}
