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
  const nonce = btoa(crypto.randomUUID());

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
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
      // Tudo, menos API e assets estáticos; ignora prefetches do next/link.
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
