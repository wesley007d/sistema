import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LandingFooter } from "@/components/LandingFooter";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

const RECURSOS = [
  {
    titulo: "PDV, caixa e vendas de balcão",
    desc: "Mais agilidade no seu dia a dia.",
    path: "M4 6h16l-1.6 8H6.5L5 5H2m5 15a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm10 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z",
  },
  {
    titulo: "Estoque, produtos e ordens de serviço",
    desc: "Organização total para sua operação.",
    path: "M3.5 7.5 12 3l8.5 4.5L12 12l-8.5-4.5Zm0 0v9L12 21m8.5-13.5v9L12 21m0-9v9",
  },
  {
    titulo: "Emissão de NF-e, NFC-e e NFS-e",
    desc: "Mais praticidade e conformidade fiscal.",
    path: "M4 13a8 8 0 0 1 16 0M7 16a5 5 0 0 1 10 0M10.2 19a1.8 1.8 0 1 0 3.6 0",
  },
  {
    titulo: "Financeiro, contas a pagar/receber e DRE",
    desc: "Sua gestão financeira na palma da mão.",
    path: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M12 3v18M15.5 6.5H10a2.5 2.5 0 0 0 0 5h4a2.5 2.5 0 0 1 0 5H8",
  },
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <>
      <main className="min-h-screen lg:grid lg:grid-cols-2">
        {/* Painel de marca — só no desktop */}
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
              Todo o balcão da sua auto peças{" "}
              <span className="text-sky-400">num lugar só.</span>
            </h2>
            <p className="mt-3 text-white/80">
              Sistema completo para o seu negócio de autopeças, com foco em
              agilidade, controle e crescimento.
            </p>
            <ul className="mt-8 space-y-4">
              {RECURSOS.map((r) => (
                <li key={r.titulo} className="flex items-start gap-3.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-black/20">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5 text-white"
                      aria-hidden="true"
                    >
                      <path d={r.path} />
                    </svg>
                  </span>
                  <div>
                    <p className="font-medium text-white">{r.titulo}</p>
                    <p className="text-sm text-white/70">{r.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p
              className="mt-10 text-2xl text-sky-400"
              style={{ fontFamily: "var(--font-caveat)" }}
            >
              Mais controle, mais vendas, mais resultado!
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

        {/* Formulário */}
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 lg:min-h-0">
          <LoginForm />
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
