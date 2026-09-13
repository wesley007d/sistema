"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Abas do catálogo: Peças/Produtos e Serviços vivem no mesmo lugar, para
 * cadastrar tudo que entra numa venda sem precisar procurar em outro menu.
 */
export function CatalogoTabs({ canServicos = true }: { canServicos?: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: "/produtos", label: "Peças / Produtos", show: true },
    { href: "/servicos", label: "Serviços / Mão de obra", show: canServicos },
  ].filter((t) => t.show);

  return (
    <div className="mb-5 flex gap-1 border-b border-border">
      {tabs.map((t) => {
        const active = path === t.href || path.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
