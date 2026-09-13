"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Atalho = { key: string; label: string; href: string; perms: string[] };

/** Teclas de função para pular entre telas, no estilo dos sistemas de balcão. */
const ATALHOS: Atalho[] = [
  { key: "F2", label: "Produtos / Peças", href: "/produtos", perms: ["produtos"] },
  { key: "F3", label: "Caixa (receber)", href: "/caixa", perms: ["vendas"] },
  { key: "F4", label: "PDV (nova venda)", href: "/vendas/pdv", perms: ["vendas", "pdv"] },
  { key: "F5", label: "Início (painel)", href: "/", perms: ["dashboard"] },
  { key: "F6", label: "Ordens de Serviço", href: "/ordens-servico", perms: ["ordens_servico"] },
  { key: "F7", label: "Vendas (lista)", href: "/vendas", perms: ["vendas", "pdv"] },
  { key: "F8", label: "Clientes e Fornecedores", href: "/parceiros", perms: ["parceiros"] },
  // F9: puxar venda — abre o Caixa (lista de vendas aguardando + campo para digitar o número)
  { key: "F9", label: "Puxar venda (Caixa)", href: "/caixa", perms: ["vendas"] },
  { key: "F10", label: "Notas Fiscais", href: "/notas", perms: ["notas"] },
];

export function AtalhosTeclado({ allowed }: { allowed: string[] }) {
  const router = useRouter();
  const permsKey = allowed.join(",");
  const perms = useMemo(
    () => new Set(permsKey ? permsKey.split(",") : []),
    [permsKey],
  );

  const [ajuda, setAjuda] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const podeUsar = useCallback(
    (req: string[]) => req.some((p) => p === "dashboard" || perms.has(p)),
    [perms],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

      if (e.key === "F1") {
        e.preventDefault();
        setAjuda((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setAjuda(false);
        return;
      }

      const a = ATALHOS.find((x) => x.key === e.key);
      if (!a) return;
      e.preventDefault();
      if (!podeUsar(a.perms)) {
        setAviso(`Sem permissão: ${a.label} (${a.key})`);
        return;
      }
      setAjuda(false);
      setAviso(`${a.key} → ${a.label}`);
      router.push(a.href);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [podeUsar, router]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 1800);
    return () => clearTimeout(t);
  }, [aviso]);

  return (
    <>
      {aviso && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white shadow-lg">
          {aviso}
        </div>
      )}

      {ajuda && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAjuda(false)}
        >
          <div
            className="card w-full max-w-md p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Atalhos do teclado</h2>
              <button
                type="button"
                className="text-sm text-muted hover:text-foreground"
                onClick={() => setAjuda(false)}
              >
                Fechar (Esc)
              </button>
            </div>
            <ul className="divide-y divide-border">
              {ATALHOS.map((a) => {
                const ok = podeUsar(a.perms);
                return (
                  <li
                    key={a.key}
                    className={`flex items-center justify-between py-2 text-sm ${
                      ok ? "" : "opacity-40"
                    }`}
                  >
                    <span>{a.label}</span>
                    <kbd className="rounded border border-border bg-background px-2 py-0.5 font-mono text-xs">
                      {a.key}
                    </kbd>
                  </li>
                );
              })}
              <li className="flex items-center justify-between py-2 text-sm">
                <span>Mostrar / esconder esta lista</span>
                <kbd className="rounded border border-border bg-background px-2 py-0.5 font-mono text-xs">
                  F1
                </kbd>
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted">
              Telas sem permissão para o seu usuário ficam em cinza e o atalho
              não abre.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
