import { can, requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { CatalogoTabs } from "@/components/CatalogoTabs";
import { ProductForm } from "../ProductForm";
import { createProduct } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovoProdutoPage() {
  const { user, db } = await requireDb();
  const categorias = await db.category.findMany({ orderBy: { nome: "asc" } });
  return (
    <div>
      <CatalogoTabs canServicos={can(user, "servicos")} />
      <PageHeader
        title="Novo produto"
        subtitle="Cadastro de peça — para mão de obra, use a aba Serviços"
      />
      <ProductForm
        action={createProduct}
        categorias={categorias.map((c) => c.nome)}
        isAdmin={user.role === "ADMIN"}
      />
    </div>
  );
}
