import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string } | ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        )}
      </div>
      {action &&
        (typeof action === "object" && action !== null && "href" in action ? (
          <Link href={action.href} className="btn-primary shrink-0">
            {action.label}
          </Link>
        ) : (
          <div className="shrink-0">{action}</div>
        ))}
    </div>
  );
}
