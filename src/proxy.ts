import { NextResponse, type NextRequest } from "next/server";

/**
 * Content-Security-Policy por requisição (nonce novo a cada resposta).
 *
 * `script-src` só aceita 'self' + o nonce da resposta; o Next carimba esse
 * nonce nos <script> que ele injeta, então qualquer script inline injetado por
 * um atacante (XSS) é bloqueado pelo navegador. `style-src` mantém
 * 'unsafe-inline' — estilos inline (React `style={{}}`, tema por empresa) são
 * usados demais no app e o risco de injeção via CSS é baixo.
 *
 * Dev: React usa `eval` para reconstruir stack traces → precisa de
 * 'unsafe-eval'; e o HMR precisa de websocket.
 */
export function proxy(req: NextRequest) {
  const dev = process.env.NODE_ENV !== "production";

  // A Hostinger nao redireciona http->https no servidor (a opcao "Forcar
  // HTTPS" do painel fazia isso, mas sobrescrevendo a CSP com uma versao
  // fraca - por isso ficou desligada). Sem isso, quem acessa por http fica
  // sem criptografia; entao o redirect passa a ser feito aqui.
  const proto = req.headers.get("x-forwarded-proto");
  // DIAGNOSTICO TEMPORARIO (remover depois de confirmar em producao): só
  // registra o que a Hostinger manda, ainda NÃO redireciona - checar antes
  // de ativar o redirect de verdade, pra não arriscar loop se o proxy deles
  // nao mandar x-forwarded-proto correto.
  if (!dev) {
    console.log(`[diag-proto] ${req.method} ${req.nextUrl.pathname} proto=${proto}`);
  }

  const nonce = btoa(crypto.randomUUID());

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.googletagmanager.com https://www.google-analytics.com",
    "font-src 'self'",
    `connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com${dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  // O Next lê o nonce a partir do header de CSP na REQUISIÇÃO.
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-nonce", nonce);
  reqHeaders.set("content-security-policy", csp);

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set("content-security-policy", csp);
  return res;
}

export const config = {
  matcher: [
    {
      // Tudo, inclusive /api e favicon (precisam do redirect http->https
      // tambem); so os estaticos internos do Next ficam de fora. Ignora
      // prefetches do next/link.
      source: "/((?!_next/static|_next/image).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
