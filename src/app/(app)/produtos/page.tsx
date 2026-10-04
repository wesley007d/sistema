import Link from "next/link";
import { can, requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { CatalogoTabs } from "@/components/CatalogoTabs";
import { ConfirmButton } from "@/components/ConfirmButton";
import { money, num } from "@/lib/format";
import { deleteProducts } from "./actions";
import { SelecionarTodos } from "./SelecionarTodos";

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

  const podeExcluir = user.role === "ADMIN" && can(user, "produtos");

  return (
    <div>
      <CatalogoTabs canServicos={can(user, "servicos")} />
      <PageHeader
        title="Produtos / Peças"
        subtitle={`${produtos.length} item(ns)`}
        action={
          <div className="flex flex-wrap gap-2">
            {user.role === "ADMIN" && (
              <Link href="/produtos/marcas" className="btn-ghost">
                Marcas por fabricante
              </Link>
            )}
            <Link href="/produtos/novo" className="btn-primary">
              + Novo produto
            </Link>
          </div>
        }
      />

      <form className="mb-4">
        <input
          name="q"
          defaultValue={termo}
          placeholder="Buscar por nome, SKU, código de barras ou marca…"
          className="input max-w-md"
        />
      </form>

      {podeExcluir && produtos.length > 0 && (
        <div className="mb-2 flex justify-end">
          <ConfirmButton
            form="form-produtos"
            className="btn-danger text-sm"
            message="Excluir os produtos selecionados? Os que já tiveram venda, OS ou nota ficam só inativados."
          >
            Excluir selecionados
          </ConfirmButton>
        </div>
      )}

      <form id="form-produtos" action={deleteProducts} className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {podeExcluir && (
                <th className="th w-8">
                  <SelecionarTodos form="form-produtos" />
                </th>
              )}
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
                <td className="td text-muted" colSpan={podeExcluir ? 9 : 8}>
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
                  {podeExcluir && (
                    <td className="td">
                      <input
                        type="checkbox"
                        name="ids"
                        value={p.id}
                        aria-label={`Selecionar ${p.nome}`}
                      />
                    </td>
                  )}
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
                  <td className="td text-right whitespace-nowrap">
                    <Link
                      href={`/produtos/${p.id}`}
                      className="text-xs text-primary"
                    >
                      editar
                    </Link>
                    <Link
                      href={`/produtos/etiquetas?ids=${p.id}`}
                      target="_blank"
                      className="ml-3 text-xs text-primary"
                    >
                      🏷️ etiqueta
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </form>
    </div>
  );
}
