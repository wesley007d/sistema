import Link from "next/link";
import { redirect } from "next/navigation";
import { can, requireDb } from "@/lib/auth";
import { LIMITE_DESCONTO_VENDEDOR } from "@/lib/aprovacao";
import { getOpenCashSession } from "@/lib/caixa";
import { PageHeader } from "@/components/PageHeader";
import { PDV } from "./PDV";
import { semDesconto } from "@/lib/desconto";
import {
  atualizarOrcamento,
  finalizarVenda,
  salvarOrcamento,
  salvarPreVenda,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function PdvPage({
  searchParams,
}: {
  searchParams: Promise<{ venda?: string; orcamento?: string }>;
}) {
  const { venda: vendaParam, orcamento: orcamentoId } = await searchParams;

  // Receber venda agora é só na tela Caixa. Mantém links antigos funcionando.
  if (vendaParam) {
    redirect(`/caixa?venda=${vendaParam}`);
  }

  const { user, db } = await requireDb();
  // Vendedor (só permissão `pdv`): monta a venda e envia ao caixa, não fecha.
  const soPreVenda = !can(user, "vendas");
  const [parceiros, osTecnicos, vendaMecs, sessaoCaixa] = await Promise.all([
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
    getOpenCashSession(db),
  ]);

  // Editar orçamento já feito: carrega os itens no PDV e regrava o mesmo número.
  const orc = orcamentoId
    ? await db.sale.findUnique({
        where: { id: orcamentoId },
        include: { items: { include: { product: true } } },
      })
    : null;
  if (orcamentoId && (!orc || orc.status !== "ORCAMENTO")) {
    redirect(orc ? `/vendas/${orc.id}` : "/vendas/orcamentos");
  }
  const orcamento = orc
    ? {
        id: orc.id,
        numero: orc.numero,
        operadorNome: null,
        partnerId: orc.partnerId,
        descontoGeral: orc.desconto,
        acrescimo: orc.acrescimo,
        observacao: orc.observacao,
        itens: orc.items.map((it) => ({
          tipo: (it.tipo === "SERVICO" ? "SERVICO" : "PECA") as "PECA" | "SERVICO",
          productId: it.productId ?? "",
          serviceId: it.serviceId,
          mecanico: it.mecanico ?? undefined,
          sku: it.product?.sku ?? "",
          descricao: it.descricao,
          quantidade: it.quantidade,
          // peça: preço atual do cadastro (o servidor também trava isso p/ não-admin)
          precoUnit:
            it.tipo !== "SERVICO" && it.product && user.role !== "ADMIN"
              ? it.product.precoVenda
              : it.precoUnit,
          desconto: it.desconto,
          estoque: it.product?.estoque ?? 0,
          localizacao: it.product?.localizacao ?? null,
          imagemUrl: it.product?.imagemUrl ?? null,
          semDesconto: it.tipo !== "SERVICO" && semDesconto(it.product?.ncm),
        })),
      }
    : null;
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
        title={orcamento ? `Editando orçamento nº ${orcamento.numero}` : "PDV — Venda de balcão"}
        subtitle={
          soPreVenda
            ? "Monte a venda e envie ao caixa. Bipe o código ou busque o produto."
            : "Bipe o código de barras ou busque o produto. Enter adiciona o item."
        }
        action={
          orcamento ? (
            <Link href={`/vendas/${orcamento.id}`} className="btn-ghost">
              Cancelar edição
            </Link>
          ) : (
            <Link href="/vendas" className="btn-ghost">
              Ver vendas
            </Link>
          )
        }
      />
      {!soPreVenda && !sessaoCaixa && (
        <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          O caixa está <strong>fechado</strong> — a venda só pode ser finalizada depois de{" "}
          <Link href="/caixa" className="font-semibold underline">abrir o caixa</Link>.
          Orçamento e pré-venda continuam liberados.
        </p>
      )}
      <PDV
        key={orcamento?.id ?? "nova"}
        preVenda={orcamento ?? undefined}
        editarOrcamento={
          orcamento
            ? {
                salvar: atualizarOrcamento.bind(null, orcamento.id, false),
                salvarEEnviar: atualizarOrcamento.bind(null, orcamento.id, true),
              }
            : undefined
        }
        partners={parceiros}
        mecanicos={mecanicos}
        action={soPreVenda ? salvarPreVenda : finalizarVenda}
        salvarPreVendaAction={salvarPreVenda}
        salvarOrcamentoAction={salvarOrcamento}
        soPreVenda={soPreVenda}
        limiteDesconto={LIMITE_DESCONTO_VENDEDOR}
        podeAlterarPreco={user.role === "ADMIN"}
      />
    </div>
  );
}
