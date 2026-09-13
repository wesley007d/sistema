import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { TrocarSenhaForm } from "./TrocarSenhaForm";

export const dynamic = "force-dynamic";

export default async function TrocarSenhaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.senhaProvisoria) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <Logo size="lg" className="mb-8 flex justify-center" />

        <div className="rounded-xl border border-border bg-surface p-7 shadow-sm">
          <h1 className="text-xl font-semibold">Defina sua senha</h1>
          <p className="mt-1 text-sm text-muted">
            Olá, {user.nome.split(" ")[0]}. Antes de continuar, troque a senha
            provisória por uma que só você conheça.
          </p>

          <TrocarSenhaForm />
        </div>
      </div>
    </main>
  );
}
