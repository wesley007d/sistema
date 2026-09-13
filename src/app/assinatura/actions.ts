"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MENSALIDADE_PADRAO } from "@/lib/assinatura";
import { criarOrderPix, consultarOrder } from "@/lib/mercadopago";
import { processarOrderPix } from "@/lib/pagamento-assinatura";

/** Cobrança fica disponível por 30min antes de gerar uma nova (evita duplicar order no Mercado Pago). */
const VALIDADE_MS = 30 * 60_000;

/**
 * Gera (ou reaproveita) uma cobrança Pix pendente para a empresa do usuário
 * logado. Só o ADMIN da empresa pode pagar. Reaproveita a última cobrança
 * PENDENTE se ainda estiver dentro da validade, pra não empilhar orders no
 * Mercado Pago a cada clique/refresh.
 */
export async function gerarCobrancaPix(): Promise<void> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Só o administrador da empresa pode gerar a cobrança.");

  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });

  const existente = await prisma.cobrancaPix.findFirst({
    where: { companyId: company.id, status: "PENDENTE" },
    orderBy: { createdAt: "desc" },
  });
  if (existente && Date.now() - existente.createdAt.getTime() < VALIDADE_MS) {
    return;
  }

  const valor = company.assinaturaValor || MENSALIDADE_PADRAO;
  const order = await criarOrderPix({
    valor,
    externalReference: company.id,
    descricao: `Mensalidade Auto Peças System - ${company.nomeFantasia || company.razaoSocial}`,
    payerEmail: company.email || user.email,
  });

  const pagamento = order.transactions?.payments?.[0];
  await prisma.cobrancaPix.create({
    data: {
      companyId: company.id,
      mpOrderId: order.id,
      valor,
      qrCode: pagamento?.payment_method?.qr_code ?? null,
      qrCodeBase64: pagamento?.payment_method?.qr_code_base64 ?? null,
    },
  });
}

/**
 * Reconsulta a cobrança no Mercado Pago. Chamada tanto pelo polling automático
 * (`PixAguardando`, a cada poucos segundos, sem o cliente precisar clicar em
 * nada) quanto pelo botão manual "verificar agora". Se aprovada, aplica o
 * pagamento (ativa a empresa) e devolve "PAGO"; o componente cliente é quem
 * decide navegar de volta pro sistema.
 */
export async function verificarPagamentoPix(cobrancaId: string): Promise<"PAGO" | "PENDENTE"> {
  const user = await requireUser();
  const cobranca = await prisma.cobrancaPix.findUniqueOrThrow({ where: { id: cobrancaId } });
  if (cobranca.companyId !== user.companyId) throw new Error("Cobrança de outra empresa.");

  const order = await consultarOrder(cobranca.mpOrderId);
  return processarOrderPix(order);
}
