import Link from "next/link";
import { can, requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { CatalogoTabs } from "@/components/CatalogoTabs";
import { money, num } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user, db } = await requireDb();
  const { q = "" } = await searchParams;
  const termo = q.trim();

  const produtos = await db.product.findMany({
    where: termo
      ? {
          OR: [
            { nome: { contains: termo } },
            { sku: { contains: termo } },
            { codigoBarras: { contains: termo } },
            { marca: { contains: termo } },
          ],
        }
      : undefined,
    include: { category: true },
    orderBy: { nome: "asc" },
    take: 200,
  });

  return (
    <div>
      <CatalogoTabs canServicos={can(user, "servicos")} />
      <PageHeader
        title="Produtos / Peças"
        subtitle={`${produtos.length} item(ns)`}
        action={{ href: "/produtos/novo", label: "+ Novo produto" }}
      />

      <form className="mb-4">
        <input
          name="q"
          defaultValue={termo}
          placeholder="Buscar por nome, SKU, código de barras ou marca…"
          className="input max-w-md"
        />
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th"></th>
              <th className="th">SKU</th>
              <th className="th">Produto</th>
              <th className="th">Categoria</th>
              <th className="th text-right">Custo</th>
              <th className="th text-right">Venda</th>
              <th className="th text-right">Estoque</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={8}>
                  Nenhum produto encontrado.{" "}
                  <Link href="/produtos/novo" className="text-primary">
                    Cadastrar o primeiro
                  </Link>
                </td>
              </tr>
            )}
            {produtos.map((p) => {
              const baixo = p.estoque <= p.estoqueMinimo;
              return (
                <tr key={p.id} className="hover:bg-background">
                  <td className="td">
                    {p.imagemUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imagemUrl}
                        alt=""
                        className="size-9 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <div className="size-9 rounded-md border border-dashed border-border" />
                    )}
                  </td>
                  <td className="td font-mono text-xs">{p.sku}</td>
                  <td className="td">
                    <Link
                      href={`/produtos/${p.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.nome}
                    </Link>
                    {!p.ativo && (
                      <span className="badge ml-2 bg-gray-100 text-gray-500">
                        inativo
                      </span>
                    )}
                    {p.marca && (
                      <span className="ml-2 text-xs text-muted">{p.marca}</span>
                    )}
                  </td>
                  <td className="td text-muted">{p.category?.nome ?? "-"}</td>
                  <td className="td text-right">{money(p.precoCusto)}</td>
                  <td className="td text-right font-medium">{money(p.precoVenda)}</td>
                  <td
                    className={`td text-right ${
                      baixo ? "font-semibold text-red-600" : ""
                    }`}
                  >
                    {num(p.estoque)} {p.unidade}
                  </td>
                  <td className="td text-right">
                    <Link
                      href={`/produtos/${p.id}`}
                      className="text-xs text-primary"
                    >
                      editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
