import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

const RECURSOS = [
  "PDV, caixa e vendas de balcão",
  "Estoque, produtos e ordens de serviço",
  "Emissão de NF-e, NFC-e e NFS-e",
  "Financeiro, contas a pagar/receber e DRE",
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Painel de marca — só no desktop */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary to-[#0f306e] p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <Logo size="lg" variant="light" className="absolute left-12 top-12" />

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Todo o balcão da sua auto peças num lugar só.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {RECURSOS.map((r) => (
              <li key={r} className="flex items-start gap-3 text-white/90">
                <svg
                  viewBox="0 0 20 20"
                  className="mt-0.5 size-5 shrink-0 fill-white/90"
                  aria-hidden="true"
                >
                  <path d="M8.2 13.4 4.8 10l-1.2 1.2 4.6 4.6L18 6l-1.2-1.2z" />
                </svg>
                {r}
              </li>
            ))}
          </ul>
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
      <SiteFooter className="lg:col-span-2" />
    </main>
  );
}
