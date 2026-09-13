import Link from "next/link";

const tabs = [
  { href: "/relatorios", label: "Painel" },
  { href: "/relatorios/dre", label: "DRE" },
  { href: "/relatorios/vendas", label: "Vendas" },
  { href: "/relatorios/estoque", label: "Estoque" },
  { href: "/relatorios/titulos", label: "Recebíveis e dívidas" },
];

export function ReportNav({
  active,
  query = "",
}: {
  active: string;
  query?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={`${t.href}${query}`}
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
