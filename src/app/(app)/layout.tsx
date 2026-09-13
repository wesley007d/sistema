import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { AtalhosTeclado } from "@/components/AtalhosTeclado";
import { isOwner, permissionsOf, requireDb } from "@/lib/auth";
import { cssTemaEmpresa } from "@/lib/cor";
import { situacaoAssinatura } from "@/lib/assinatura";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, db } = await requireDb();
  // Enquanto a senha for provisória, nada do sistema abre: manda pra troca de
  // senha (rota fora deste grupo, sem sidebar, evita loop de redirect).
  if (user.senhaProvisoria) redirect("/trocar-senha");
  const allowed = permissionsOf(user);
  const owner = isOwner(user);
  const empresa = await db.company.findUnique({
    where: { id: user.companyId },
    select: {
      logoUrl: true,
      corPrimaria: true,
      nomeFantasia: true,
      tema: true,
      menuColorido: true,
      assinaturaStatus: true,
      assinaturaVence: true,
    },
  });

  // Assinatura vencida/cancelada bloqueia todo mundo, menos o dono da plataforma.
  const assinatura = situacaoAssinatura({
    assinaturaStatus: empresa?.assinaturaStatus,
    assinaturaVence: empresa?.assinaturaVence,
  });
  if (!owner && assinatura.bloqueada) redirect("/assinatura");
  const avisoAtraso =
    !owner && assinatura.emAtraso && user.role === "ADMIN";

  const temaCss = cssTemaEmpresa({
    cor: empresa?.corPrimaria,
    tema: empresa?.tema,
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {temaCss && <style dangerouslySetInnerHTML={{ __html: temaCss }} />}
      <Sidebar
        userName={user.nome}
        isAdmin={user.role === "ADMIN"}
        isOwner={owner}
        allowed={allowed}
        logoUrl={empresa?.logoUrl ?? null}
        empresaNome={empresa?.nomeFantasia ?? null}
        menuColorido={empresa?.menuColorido ?? false}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        {avisoAtraso && (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
            Sua mensalidade venceu
            {assinatura.diasRestantes !== null
              ? ` há ${Math.abs(assinatura.diasRestantes)} dia(s)`
              : ""}
            . Regularize para não perder o acesso.{" "}
            <Link href="/assinatura" className="font-medium underline">
              ver detalhes
            </Link>
          </div>
        )}
        <div className="mx-auto max-w-6xl p-6 sm:p-8">{children}</div>
        <footer className="flex flex-col items-center justify-between gap-1 border-t border-border px-6 py-4 text-xs text-muted sm:flex-row sm:px-8">
          <span>
            © {new Date().getFullYear()} Auto Peças System. Todos os direitos
            reservados.
          </span>
          <span>Desenvolvido por Wesley Vinicius</span>
        </footer>
      </main>
      <AtalhosTeclado allowed={allowed} />
    </div>
  );
}
