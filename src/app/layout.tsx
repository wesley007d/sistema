import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
