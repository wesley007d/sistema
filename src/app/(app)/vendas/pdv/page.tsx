import Link from "next/link";
import { redirect } from "next/navigation";
import { can, requireDb } from "@/lib/auth";
import { LIMITE_DESCONTO_VENDEDOR } from "@/lib/aprovacao";
import { PageHeader } from "@/components/PageHeader";
import { PDV } from "./PDV";
import { finalizarVenda, salvarOrcamento, salvarPreVenda } from "../actions";

export const dynamic = "force-dynamic";

export default async function PdvPage({
  searchParams,
}: {
  searchParams: Promise<{ venda?: string }>;
}) {
  const { venda: vendaParam } = await searchParams;

  // Receber venda agora é só na tela Caixa. Mantém links antigos funcionando.
  if (vendaParam) {
    redirect(`/caixa?venda=${vendaParam}`);
  }

  const { user, db } = await requireDb();
  // Vendedor (só permissão `pdv`): monta a venda e envia ao caixa, não fecha.
  const soPreVenda = !can(user, "vendas");
  const [parceiros, osTecnicos, vendaMecs] = await Promise.all([
    db.partner.findMany({
      where: { ativo: true, tipo: { in: ["CLIENTE", "AMBOS"] } },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    db.serviceOrder.findMany({
      where: { tecnico: { not: null } },
      distinct: ["tecnico"],
      select: { tecnico: true },
      take: 50,
    }),
    db.saleItem.findMany({
      where: { mecanico: { not: null } },
      distinct: ["mecanico"],
      select: { mecanico: true },
      take: 50,
    }),
  ]);
  const mecanicos = [
    ...new Set(
      [
        ...osTecnicos.map((t) => t.tecnico),
        ...vendaMecs.map((m) => m.mecanico),
      ].filter((s): s is string => !!s && s.trim() !== ""),
    ),
  ].sort();

  return (
    <div>
      <PageHeader
        title="PDV — Venda de balcão"
        subtitle={
          soPreVenda
            ? "Monte a venda e envie ao caixa. Bipe o código ou busque o produto."
            : "Bipe o código de barras ou busque o produto. Enter adiciona o item."
        }
        action={
          <Link href="/vendas" className="btn-ghost">
            Ver vendas
          </Link>
        }
      />
      <PDV
        partners={parceiros}
        mecanicos={mecanicos}
        action={soPreVenda ? salvarPreVenda : finalizarVenda}
        salvarPreVendaAction={salvarPreVenda}
        salvarOrcamentoAction={salvarOrcamento}
        soPreVenda={soPreVenda}
        limiteDesconto={LIMITE_DESCONTO_VENDEDOR}
      />
    </div>
  );
}
