import type { ReactNode } from "react";
import { requireAnyPermission } from "@/lib/auth";

export default async function Layout({ children }: { children: ReactNode }) {
  // `produtos` = cadastro completo; `pdv` (vendedor) só consulta + edita a
  // localização/prateleira. Cada página aplica a restrição fina.
  await requireAnyPermission(["produtos", "pdv"]);
  return children;
}
