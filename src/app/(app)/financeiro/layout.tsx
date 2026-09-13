import type { ReactNode } from "react";
import { requireAnyPermission } from "@/lib/auth";

export default async function Layout({ children }: { children: ReactNode }) {
  // `financeiro` = acesso completo; `financeiro_caixa` = só fluxo de caixa +
  // recebíveis de clientes (cada página aplica a restrição fina).
  await requireAnyPermission(["financeiro", "financeiro_caixa"]);
  return children;
}
