import Link from "next/link";
import { requireDbAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { definirMarcaFabricante } from "../actions";

export const dynamic = "force-dynamic";

/**
 * A NF-e não traz marca. O começo do código de barras (prefixo GS1) identifica
 * o fabricante, então dá para marcar todos os produtos dele de uma vez.
 */
export default async function MarcasPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const { db } = await requireDbAdmin();
  const { msg } = await searchParams;
  const produtos = await db.product.findMany({
    where: { ativo: true },
    select: { nome: true, codigoBarras: true, marca: true },
    orderBy: { nome: "asc" },
  });

  type Grupo = { prefixo: string; nomes: string[]; marcas: Map<string, number>; semMarca: number };
  const grupos = new Map<string, Grupo>();
  let semCodigo = 0;
  for (const p of produtos) {
    const cb = p.codigoBarras?.trim() ?? "";
    if (!/^\d{13}$/.test(cb)) {
      if (!p.marca) semCodigo++;
      continue;
    }
    const prefixo = cb.slice(0, 7);
    const g: Grupo = grupos.get(prefixo) ?? { prefixo, nomes: [], marcas: new Map(), semMarca: 0 };
    g.nomes.push(p.nome);
    const marca = p.marca?.trim();
    if (marca) g.marcas.set(marca, (g.marcas.get(marca) ?? 0) + 1);
    else g.semMarca++;
    grupos.set(prefixo, g);
  }
  // sem marca primeiro, depois os maiores grupos
  const lista = [...grupos.values()].sort(
    (a, b) => Number(b.semMarca > 0) - Number(a.semMarca > 0) || b.nomes.length - a.nomes.length,
  );

  return (
    <div>
      <PageHeader
        title="Marcas por fabricante"
        subtitle="A nota fiscal (XML) não traz a marca. Os produtos estão agrupados pelo fabricante, que o começo do código de barras identifica — digite a marca uma vez e todos do grupo recebem."
      />
      {msg && <p className="card mb-4 border-green-200 bg-green-50 p-3 text-sm text-green-700">{msg}</p>}

      {lista.length === 0 ? (
        <p className="card p-6 text-sm text-muted">Nenhum produto com código de barras ainda.</p>
      ) : (
        <div className="space-y-3">
          {lista.map((g) => {
            const marcas = [...g.marcas.entries()].sort((a, b) => b[1] - a[1]);
            return (
              <form
                key={g.prefixo}
                action={definirMarcaFabricante}
                className="card flex flex-wrap items-end gap-3 p-4"
              >
                <input type="hidden" name="prefixo" value={g.prefixo} />
                <div className="min-w-0 flex-1 basis-72">
                  <p className="text-sm font-medium">
                    {g.nomes.length} produto(s)
                    {g.semMarca > 0 ? (
                      <span className="badge ml-2 bg-amber-100 text-amber-800">{g.semMarca} sem marca</span>
                    ) : (
                      <span className="badge ml-2 bg-green-100 text-green-700">com marca</span>
                    )}
                    <span className="ml-2 font-mono text-xs text-muted">código {g.prefixo}…</span>
                  </p>
                  <p className="mt-1 truncate text-xs text-muted">
                    {g.nomes.slice(0, 4).join(" · ")}
                    {g.nomes.length > 4 ? ` · e mais ${g.nomes.length - 4}` : ""}
                  </p>
                  {marcas.length > 1 && (
                    <p className="mt-1 text-xs text-amber-700">
                      Marcas diferentes neste grupo: {marcas.map(([m, n]) => `${m} (${n})`).join(", ")}
                    </p>
                  )}
                </div>
                <input
                  name="marca"
                  defaultValue={marcas[0]?.[0] ?? ""}
                  placeholder="Marca (ex.: Cobreq)"
                  required
                  className="input max-w-56"
                />
                <SubmitButton>Aplicar a todos</SubmitButton>
              </form>
            );
          })}
        </div>
      )}

      {semCodigo > 0 && (
        <p className="mt-4 text-sm text-muted">
          {semCodigo} produto(s) sem marca não têm código de barras — esses precisam da marca
          no cadastro de cada um.
        </p>
      )}
      <Link href="/produtos" className="mt-6 inline-block text-sm text-primary">
        ← voltar para produtos
      </Link>
    </div>
  );
}
