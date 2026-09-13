import { notFound } from "next/navigation";
import { can, requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Field, SelectField } from "@/components/Field";
import { dateTime, num } from "@/lib/format";
import { ProductForm } from "../ProductForm";
import {
  adjustStock,
  deleteProduct,
  salvarLocalizacaoProduto,
  updateProduct,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, db } = await requireDb();
  const { id } = await params;
  const [product, categorias, movimentos] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { category: true } }),
    db.category.findMany({ orderBy: { nome: "asc" } }),
    db.stockMovement.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  if (!product) notFound();

  const ehAdmin = user.role === "ADMIN";
  const temProdutos = can(user, "produtos");
  const updateAction = updateProduct.bind(null, id);
  const adjustAction = adjustStock.bind(null, id);
  const deleteAction = deleteProduct.bind(null, id);

  return (
    <div>
      <PageHeader
        title={product.nome}
        subtitle={`SKU ${product.sku} · estoque atual ${num(product.estoque)} ${product.unidade}`}
        action={
          ehAdmin ? (
            <form action={deleteAction}>
              <ConfirmButton message="Excluir este produto? (se já usado em vendas/notas, será apenas inativado)">
                Excluir
              </ConfirmButton>
            </form>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductForm
            action={updateAction}
            product={product}
            categorias={categorias.map((c) => c.nome)}
            categoriaAtual={product.category?.nome}
            isAdmin={user.role === "ADMIN"}
          />
        </div>

        <div className="space-y-6">
          {!ehAdmin && (
            <section className="card p-5">
              <h2 className="mb-1 font-semibold">Localização (prateleira)</h2>
              <p className="mb-3 text-xs text-muted">
                Você pode ajustar só a prateleira. O resto do cadastro é do
                administrador.
              </p>
              <form
                action={salvarLocalizacaoProduto.bind(null, id)}
                className="flex gap-2"
              >
                <input
                  name="localizacao"
                  defaultValue={product.localizacao ?? ""}
                  placeholder="ex.: Corredor B, prateleira 3"
                  className="input"
                />
                <SubmitButton>Salvar</SubmitButton>
              </form>
            </section>
          )}

          {temProdutos && (
          <>
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Movimentar estoque</h2>
            <form action={adjustAction} className="space-y-3">
              <SelectField
                label="Tipo"
                name="tipo"
                options={[
                  { value: "ENTRADA", label: "Entrada (+)" },
                  { value: "SAIDA", label: "Saída (−)" },
                  { value: "AJUSTE", label: "Ajuste (definir saldo)" },
                ]}
              />
              <Field label="Quantidade" name="quantidade" type="number" step="0.001" />
              <Field
                label="Custo unitário"
                name="custoUnit"
                type="number"
                step="0.01"
                defaultValue={product.precoCusto}
              />
              <Field label="Observação" name="observacao" />
              <SubmitButton className="btn-ghost w-full">Registrar</SubmitButton>
            </form>
          </section>

          <section className="card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="font-semibold">Últimas movimentações</h2>
            </header>
            <div className="divide-y divide-border text-sm">
              {movimentos.length === 0 && (
                <p className="px-4 py-6 text-muted">Sem movimentações.</p>
              )}
              {movimentos.map((m) => (
                <div key={m.id} className="px-4 py-2">
                  <div className="flex justify-between">
                    <span
                      className={
                        m.tipo === "SAIDA" ? "text-red-600" : "text-green-700"
                      }
                    >
                      {m.tipo} {num(m.quantidade)}
                    </span>
                    <span className="text-muted">saldo {num(m.saldoApos)}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {dateTime(m.createdAt)}
                    {m.origem ? ` · ${m.origem}` : ""}
                    {m.observacao ? ` · ${m.observacao}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
