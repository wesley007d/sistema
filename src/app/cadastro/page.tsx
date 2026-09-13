import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
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
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary to-[#0f306e] p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <Logo size="lg" variant="light" className="absolute left-12 top-12" />

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Comece a organizar sua auto peças hoje.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {PASSOS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-white/90">
                <svg
                  viewBox="0 0 20 20"
                  className="mt-0.5 size-5 shrink-0 fill-white/90"
                  aria-hidden="true"
                >
                  <path d="M8.2 13.4 4.8 10l-1.2 1.2 4.6 4.6L18 6l-1.2-1.2z" />
                </svg>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 size-[26rem] rounded-full bg-white/5"
        />
      </aside>

      <div className="flex min-h-screen items-center justify-center bg-background p-6 lg:min-h-0">
        <CadastroForm />
      </div>
    </main>
  );
}
