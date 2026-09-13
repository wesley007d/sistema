import Link from "next/link";

const allTabs = [
  { href: "/financeiro", label: "Painel", fullOnly: true },
  { href: "/financeiro/titulos", label: "Títulos" },
  { href: "/financeiro/caixa", label: "Fluxo de caixa" },
  { href: "/financeiro/contas", label: "Contas", fullOnly: true },
];

/**
 * `full` = usuário com a permissão `financeiro` completa. Sem ela (só
 * `financeiro_caixa`), o menu mostra apenas Títulos e Fluxo de caixa.
 */
export function FinanceNav({
  active,
  full = true,
}: {
  active: string;
  full?: boolean;
}) {
  const tabs = allTabs.filter((t) => full || !t.fullOnly);
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${
            active === t.href
              ? "border-primary font-medium text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
