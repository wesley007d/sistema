import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { NotaForm } from "../NotaForm";
import { createNfe } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovaNfePage() {
  const { db } = await requireDb();
  const [produtos, parceiros] = await Promise.all([
    db.product.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    }),
    db.partner.findMany({
      where: { ativo: true, tipo: { in: ["CLIENTE", "AMBOS"] } },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Emitir NF-e (produto)"
        subtitle="Modelo 55 — venda de mercadoria"
      />
      <NotaForm
        kind="NFE"
        action={createNfe}
        partners={parceiros.map((p) => ({ id: p.id, nome: p.nome }))}
        catalog={produtos.map((p) => ({
          id: p.id,
          label: `${p.sku} · ${p.nome}`,
          preco: p.precoVenda,
          codigo: p.sku,
          descricao: p.nome,
          ncm: p.ncm,
          cfop: p.cfopVenda,
          unidade: p.unidade,
        }))}
      />
    </div>
  );
}
