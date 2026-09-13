import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import { requireOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DonoLayout({ children }: { children: ReactNode }) {
  const user = await requireOwner();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="badge bg-primary-soft text-primary">Área do Dono</span>
            <span className="text-sm font-medium">Auto Peças System</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-primary hover:underline">
              Voltar à minha loja
            </Link>
            <span className="text-muted">{user.nome}</span>
            <form action={logout}>
              <button type="submit" className="font-medium text-primary hover:underline">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
