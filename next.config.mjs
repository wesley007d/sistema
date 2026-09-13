/**
 * Headers de segurança estáticos. A Content-Security-Policy (com nonce por
 * requisição) é montada no middleware — ver src/proxy.ts.
 *
 * Arquivo em .mjs (não .ts): o build na Hostinger falha ao compilar um
 * next.config.ts porque o binário nativo do SWC não roda no glibc do
 * servidor deles — um .mjs puro não precisa desse passo de compilação.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
