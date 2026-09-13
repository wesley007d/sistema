"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { NavIcon } from "@/components/NavIcon";
import { logout } from "@/app/login/actions";

interface NavItem {
  href: string;
  label: string;
  perm: string;
  /** Se definido, mostra o item quando o usuário tem QUALQUER uma destas permissões. */
  perms?: string[];
  /** Nome do ícone (default: usa `perm`). */
  icon?: string;
  soon?: boolean;
  adminOnly?: boolean;
  /** Esconde o item se o usuário já tiver esta outra permissão (evita link duplicado). */
  hideIfPerm?: string;
}

const groups: { title: string; items: NavItem[] }[] = [
  { title: "", items: [{ href: "/", label: "Início", perm: "dashboard" }] },
  {
    title: "Cadastros",
    items: [
      { href: "/produtos", label: "Produtos / Peças", perm: "produtos", perms: ["produtos", "pdv"] },
      { href: "/servicos", label: "Serviços", perm: "servicos" },
      { href: "/parceiros", label: "Clientes e Fornecedores", perm: "parceiros" },
    ],
  },
  {
    title: "Movimentação",
    items: [
      { href: "/vendas/pdv", label: "PDV — nova venda", perm: "vendas", perms: ["vendas", "pdv"], icon: "vendas" },
      { href: "/vendas/orcamentos", label: "Orçamentos", perm: "vendas", perms: ["vendas", "pdv"], icon: "notas" },
      { href: "/vendas/aprovacoes", label: "Aprovações de desconto", perm: "vendas", icon: "caixa" },
      { href: "/caixa", label: "Caixa", perm: "vendas", icon: "caixa" },
      { href: "/vendas", label: "Vendas (lista)", perm: "vendas", perms: ["vendas", "pdv"], icon: "notas" },
      { href: "/ordens-servico", label: "Ordens de Serviço", perm: "ordens_servico" },
    ],
  },
  {
    title: "Fiscal",
    items: [
      { href: "/notas", label: "Notas Fiscais", perm: "notas" },
      { href: "/xml", label: "XML", perm: "xml" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/financeiro", label: "Contas a pagar/receber", perm: "financeiro" },
      {
        href: "/financeiro/caixa",
        label: "Caixa e recebíveis",
        perm: "financeiro_caixa",
        hideIfPerm: "financeiro",
      },
      { href: "/relatorios", label: "Relatórios e DRE", perm: "relatorios" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/configuracoes", label: "Configurações", perm: "configuracoes" },
      {
        href: "/configuracoes/usuarios",
        label: "Usuários e permissões",
        perm: "configuracoes",
        icon: "parceiros",
        adminOnly: true,
      },
    ],
  },
];

export function Sidebar({
  userName,
  isAdmin,
  isOwner = false,
  allowed,
  logoUrl = null,
  empresaNome = null,
  menuColorido = false,
}: {
  userName: string;
  isAdmin: boolean;
  isOwner?: boolean;
  allowed: string[];
  logoUrl?: string | null;
  empresaNome?: string | null;
  menuColorido?: boolean;
}) {
  const pathname = usePathname();
  const perms = new Set(allowed);
  const col = menuColorido;

  // Paleta do menu — muda quando "menu colorido" está ligado.
  const t = {
    aside: col
      ? "border-transparent bg-primary text-white"
      : "border-border bg-surface",
    headBorder: col ? "border-white/15" : "border-border",
    nomeEmpresa: col ? "text-white/75" : "text-muted",
    groupTitle: col ? "text-white/55" : "text-muted/80",
    itemActive: col
      ? "bg-white/20 font-medium text-white"
      : "bg-primary-soft font-medium text-primary",
    itemIdle: col
      ? "text-white/80 hover:bg-white/10 hover:text-white"
      : "text-foreground/80 hover:bg-surface-2 hover:text-foreground",
    bar: col ? "bg-white" : "bg-primary",
    iconActive: col ? "text-white" : "text-primary",
    iconIdle: col
      ? "text-white/65 group-hover:text-white"
      : "text-muted group-hover:text-foreground",
    footBorder: col ? "border-white/15" : "border-border",
    avatar: col ? "bg-white/20 text-white" : "bg-primary-soft text-primary",
    muted: col ? "text-white/65" : "text-muted",
    sair: col
      ? "font-medium text-white hover:underline"
      : "font-medium text-primary hover:underline",
    kbd: col ? "border-white/25 bg-white/10" : "border-border bg-surface-2",
  };

  const renderLink = (
    href: string,
    label: string,
    iconName: string,
    active: boolean,
    soon?: boolean,
  ) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? t.itemActive : t.itemIdle
      }`}
    >
      {active && (
        <span
          className={`absolute inset-y-1.5 left-0 w-0.5 rounded-full ${t.bar}`}
        />
      )}
      <NavIcon
        name={iconName}
        className={`size-[18px] shrink-0 ${active ? t.iconActive : t.iconIdle}`}
      />
      <span className="flex-1 truncate">{label}</span>
      {soon && (
        <span className="badge bg-amber-100 text-amber-700">em breve</span>
      )}
    </Link>
  );

  return (
    <aside
      className={`flex w-60 shrink-0 flex-col border-r print:hidden ${t.aside}`}
    >
      <div
        className={`flex min-h-14 shrink-0 flex-col items-center justify-center gap-1 border-b px-4 py-3 ${t.headBorder}`}
      >
        {logoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={empresaNome ?? "Logo da empresa"}
              className="max-h-20 w-auto max-w-full object-contain"
            />
            {empresaNome && (
              <span
                className={`max-w-full truncate text-xs font-medium ${t.nomeEmpresa}`}
              >
                {empresaNome}
              </span>
            )}
          </>
        ) : col ? (
          <span className="text-lg font-bold text-white">
            {empresaNome ?? "Auto Peças System"}
          </span>
        ) : (
          <Logo size="md" />
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((g, i) => {
          const visiveis = g.items.filter(
            (it) =>
              (it.perm === "dashboard" ||
                (it.perms
                  ? it.perms.some((p) => perms.has(p))
                  : perms.has(it.perm))) &&
              (!it.adminOnly || isAdmin) &&
              (!it.hideIfPerm || !perms.has(it.hideIfPerm)),
          );
          if (visiveis.length === 0) return null;
          return (
            <div key={i}>
              {g.title && (
                <p
                  className={`mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] ${t.groupTitle}`}
                >
                  {g.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visiveis.map((it) => {
                  const active =
                    it.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(it.href);
                  return renderLink(
                    it.href,
                    it.label,
                    it.icon ?? it.perm,
                    active,
                    it.soon,
                  );
                })}
              </div>
            </div>
          );
        })}

        {isOwner && (
          <div>
            <p
              className={`mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] ${t.groupTitle}`}
            >
              Plataforma
            </p>
            {renderLink(
              "/dono",
              "Área do Dono",
              "relatorios",
              pathname.startsWith("/dono"),
            )}
          </div>
        )}
      </nav>

      <div className={`shrink-0 border-t p-3 ${t.footBorder}`}>
        <Link
          href="/perfil"
          aria-current={pathname === "/perfil" ? "page" : undefined}
          className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
            pathname === "/perfil" ? t.itemActive : t.itemIdle
          }`}
        >
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${t.avatar}`}
          >
            {userName.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className={`text-xs ${t.muted}`}>
              {isAdmin ? "Administrador" : "Funcionário"} · meu perfil
            </p>
          </div>
        </Link>
        <div
          className={`mt-2 flex items-center justify-between px-2 text-xs ${t.muted}`}
        >
          <span>
            <kbd className={`rounded border px-1 font-mono ${t.kbd}`}>F1</kbd>{" "}
            atalhos
          </span>
          <form action={logout}>
            <button type="submit" className={t.sair}>
              Sair
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
