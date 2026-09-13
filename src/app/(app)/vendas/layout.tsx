import type { ReactNode } from "react";
import { requireAnyPermission } from "@/lib/auth";

export default async function Layout({ children }: { children: ReactNode }) {
  // `vendas` = PDV + Caixa (operador); `pdv` = só lançar venda (vendedor).
  await requireAnyPermission(["vendas", "pdv"]);
  return children;
}
