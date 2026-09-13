import { prisma } from "@/lib/db";
import { type MpOrder, orderPixAprovada } from "@/lib/mercadopago";

/**
 * Aplica um pagamento de mensalidade confirmado: registra no histórico,
 * marca a empresa ATIVA e empurra o vencimento em 1 mês (a partir do maior
 * entre o vencimento atual e hoje). Mesma regra usada no lançamento manual
 * pela dona em /dono/assinaturas.
 */
export async function aplicarPagamentoPix(
  companyId: string,
  valor: number,
  pagoEm: Date,
): Promise<void> {
  const c = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const hoje = new Date();
  const base = c.assinaturaVence && c.assinaturaVence > hoje ? c.assinaturaVence : hoje;
  const proximo = new Date(base);
  proximo.setMonth(proximo.getMonth() + 1);

  await prisma.$transaction([
    prisma.assinaturaPagamento.create({
      data: {
        companyId,
        valor,
        pagoEm,
        venceAnterior: c.assinaturaVence,
        venceNovo: proximo,
        metodo: "PIX",
        obs: "Pago automaticamente via Pix (Mercado Pago).",
        registradoPor: "Sistema (Pix automático)",
      },
    }),
    prisma.company.update({
      where: { id: companyId },
      data: { assinaturaStatus: "ATIVA", assinaturaVence: proximo },
    }),
  ]);
}

/**
 * Processa uma order do Mercado Pago (chamado pelo webhook e pelo botão
 * "já paguei, verificar"). Idempotente: se a cobrança já está PAGO, não faz
 * nada de novo (evita duplicar ao receber a mesma notificação mais de uma vez).
 */
export async function processarOrderPix(order: MpOrder): Promise<"PAGO" | "PENDENTE"> {
  const cobranca = await prisma.cobrancaPix.findUnique({
    where: { mpOrderId: order.id },
  });
  if (!cobranca) return "PENDENTE";
  if (cobranca.status === "PAGO") return "PAGO";

  if (orderPixAprovada(order)) {
    await aplicarPagamentoPix(cobranca.companyId, cobranca.valor, new Date());
    await prisma.cobrancaPix.update({
      where: { id: cobranca.id },
      data: { status: "PAGO", pagoEm: new Date() },
    });
    return "PAGO";
  }
  return "PENDENTE";
}
