"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOwner, PLATAFORMA_COMPANY_ID } from "@/lib/auth";
import { parseNumber, str } from "@/lib/format";

const STATUS_VALIDOS = ["TESTE", "ATIVA", "VENCIDA", "CANCELADA"];

/** Converte "yyyy-mm-dd" de <input type="date"> em Date ao meio-dia local (evita pular fuso). */
function dataInput(v: string): Date | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00`) : null;
}

/** A dona ajusta manualmente a assinatura de uma empresa. */
export async function atualizarAssinatura(companyId: string, formData: FormData) {
  await requireOwner();
  if (companyId === PLATAFORMA_COMPANY_ID)
    throw new Error("A empresa da plataforma não tem assinatura.");

  const status = str(formData.get("status")).toUpperCase();
  if (!STATUS_VALIDOS.includes(status)) throw new Error("Status inválido.");
  const valor = Math.max(0, parseNumber(formData.get("valor")));
  const obs = str(formData.get("obs")) || null;

  await prisma.company.update({
    where: { id: companyId },
    data: {
      assinaturaStatus: status,
      assinaturaValor: valor,
      assinaturaVence: dataInput(str(formData.get("vence"))),
      assinaturaObs: obs,
    },
  });
  revalidatePath("/dono/assinaturas");
  revalidatePath(`/dono/assinaturas/${companyId}`);
}

/**
 * Registra o pagamento da mensalidade: grava uma linha no histórico
 * (`AssinaturaPagamento`), põe a empresa como ATIVA e empurra o vencimento em
 * 1 mês (a partir do maior entre o vencimento atual e hoje).
 */
export async function registrarPagamento(companyId: string, formData: FormData) {
  const dona = await requireOwner();
  if (companyId === PLATAFORMA_COMPANY_ID)
    throw new Error("A empresa da plataforma não tem assinatura.");

  const c = await prisma.company.findUnique({ where: { id: companyId } });
  if (!c) throw new Error("Empresa não encontrada.");

  const valorInput = parseNumber(formData.get("valor"));
  const valor = valorInput > 0 ? valorInput : c.assinaturaValor;
  if (!(valor > 0))
    throw new Error("Informe o valor recebido (a empresa não tem mensalidade definida).");

  const pagoEm = dataInput(str(formData.get("pagoEm"))) ?? new Date();
  const metodo = str(formData.get("metodo")) || null;
  const obs = str(formData.get("obs")) || null;

  const hoje = new Date();
  const base =
    c.assinaturaVence && c.assinaturaVence > hoje ? c.assinaturaVence : hoje;
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
        metodo,
        obs,
        registradoPor: dona.nome,
      },
    }),
    prisma.company.update({
      where: { id: companyId },
      data: { assinaturaStatus: "ATIVA", assinaturaVence: proximo },
    }),
  ]);

  revalidatePath("/dono/assinaturas");
  revalidatePath(`/dono/assinaturas/${companyId}`);
}

/** Apaga um lançamento de pagamento (correção de erro de digitação). Não mexe no vencimento. */
export async function excluirPagamento(id: string, companyId: string) {
  await requireOwner();
  await prisma.assinaturaPagamento.deleteMany({ where: { id, companyId } });
  revalidatePath("/dono/assinaturas");
  revalidatePath(`/dono/assinaturas/${companyId}`);
}
