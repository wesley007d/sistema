import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth";

export default async function Layout({ children }: { children: ReactNode }) {
  await requirePermission("relatorios");
  return children;
}
