import type { Metadata } from "next";
import { Geist, Caveat } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auto Peças System — gestão para lojas de autopeças",
  description:
    "PDV, estoque, ordens de serviço, emissão de NF-e/NFC-e/NFS-e, financeiro e DRE para a sua auto peças.",
};

// A CSP com nonce (ver src/proxy.ts) exige renderização dinâmica em todas as
// páginas — o nonce é injetado no SSR de cada requisição.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // So carrega em producao: dev nao deve poluir os dados reais de visitantes.
  const gaId =
    process.env.NODE_ENV === "production"
      ? process.env.GA_MEASUREMENT_ID
      : undefined;

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
      {gaId ? <GoogleAnalytics gaId={gaId} nonce={nonce} /> : null}
    </html>
  );
}
