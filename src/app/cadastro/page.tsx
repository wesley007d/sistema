import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LandingFooter } from "@/components/LandingFooter";
import { CadastroForm } from "./CadastroForm";

export const dynamic = "force-dynamic";

const PASSOS = [
  "Conta nova e isolada para a sua loja",
  "Você entra como administrador",
  "Comece a vender e controlar o estoque na hora",
];

export default async function CadastroPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <>
      <main className="min-h-screen lg:grid lg:grid-cols-2">
        {/* Painel de marca — só no desktop (mesmo padrão visual do /login) */}
        <aside
          className="relative hidden overflow-hidden bg-cover bg-center p-12 text-white lg:flex lg:flex-col lg:justify-center"
          style={{ backgroundImage: "url(/login-hero.webp)" }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-primary/60 to-[#0f306e]/75"
          />
          <div className="relative z-10 max-w-md">
            <Logo size="lg" variant="light" className="mb-8" />
            <h2 className="text-3xl font-bold leading-tight">
              Comece a organizar sua{" "}
              <span className="text-sky-400">auto peças hoje.</span>
            </h2>
            <p className="mt-3 text-white/80">
              Cadastre sua empresa e já entre gerenciando vendas, estoque e
              financeiro num sistema só seu.
            </p>
            <ul className="mt-8 space-y-4">
              {PASSOS.map((p) => (
                <li key={p} className="flex items-start gap-3.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-black/20">
                    <svg
                      viewBox="0 0 20 20"
                      className="size-5 fill-white"
                      aria-hidden="true"
                    >
                      <path d="M8.2 13.4 4.8 10l-1.2 1.2 4.6 4.6L18 6l-1.2-1.2z" />
                    </svg>
                  </span>
                  <p className="mt-1.5 font-medium text-white">{p}</p>
                </li>
              ))}
            </ul>

            <p
              className="mt-10 text-2xl text-sky-400"
              style={{ fontFamily: "var(--font-caveat)" }}
            >
              Sua loja, do seu jeito, no seu controle!
            </p>
            <svg
              viewBox="0 0 180 26"
              className="mt-1 h-5 w-44 text-sky-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 10c46 15 100 15 144 2c8-2.5 16-6 24-11" />
            </svg>
          </div>

          {/* Formas decorativas */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-24 size-[26rem] rounded-full bg-white/5"
          />
        </aside>

        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 lg:min-h-0">
          <CadastroForm />
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
