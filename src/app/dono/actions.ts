"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { randomInt } from "node:crypto";
import { hashPassword, requireOwner, PLATAFORMA_COMPANY_ID } from "@/lib/auth";
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

type SenhaState = { senha?: string; erro?: string } | undefined;

/**
 * A dona gera uma senha provisória para um usuário de uma empresa cliente
 * (a senha real não pode ser lida — só o hash fica no banco). O usuário entra
 * com ela e é obrigado a definir uma nova em /trocar-senha.
 */
export async function gerarSenhaProvisoria(
  userId: string,
  _prev: SenhaState,
): Promise<SenhaState> {
  await requireOwner();
  const alvo = await prisma.user.findUnique({ where: { id: userId } });
  if (!alvo) return { erro: "Usuário não encontrado. Atualize a página." };
  if (alvo.companyId === PLATAFORMA_COMPANY_ID)
    return { erro: "Use a tela de perfil para a senha da plataforma." };

  // sem caracteres que confundem ao ditar/ler (0/O, 1/l/I)
  const alfabeto = "abcdefghjkmnpqrstuvwxyz23456789";
  let senha = "";
  for (let i = 0; i < 8; i++) senha += alfabeto[randomInt(alfabeto.length)];

  await prisma.user.update({
    where: { id: userId },
    data: { senhaHash: await hashPassword(senha), senhaProvisoria: true },
  });
  await prisma.session.deleteMany({ where: { userId } });
  revalidatePath(`/dono/assinaturas/${alvo.companyId}`);
  return { senha };
}

type ZerarState = { ok?: string; erro?: string } | undefined;

/**
 * Zera os dados de movimento de uma empresa cliente que usou o sistema para
 * testar: produtos, estoque, vendas, OS, XMLs, financeiro e caixa — e,
 * se marcado, clientes/fornecedores. Mantém empresa, usuários,
 * configurações, contas de caixa e assinatura.
 *
 * Notas fiscais emitidas em PRODUÇÃO são documento fiscal: ficam, só perdem o
 * vínculo com venda/produto/cliente. A numeração de NF-e/NFS-e não volta a 1
 * (a SEFAZ rejeitaria número repetido); só a de venda, OS e produto.
 */
export async function zerarDadosEmpresa(
  companyId: string,
  _prev: ZerarState,
  formData: FormData,
): Promise<ZerarState> {
  await requireOwner();
  if (companyId === PLATAFORMA_COMPANY_ID)
    return { erro: "A empresa da plataforma não pode ser zerada." };
  const empresa = await prisma.company.findUnique({ where: { id: companyId } });
  if (!empresa) return { erro: "Empresa não encontrada." };

  const nome = (empresa.nomeFantasia || empresa.razaoSocial).trim();
  const digitado = str(formData.get("confirmacao"));
  if (digitado.toLocaleLowerCase("pt-BR") !== nome.toLocaleLowerCase("pt-BR"))
    return { erro: `Digite exatamente o nome da empresa: ${nome}` };
  const apagarParceiros = formData.get("parceiros") === "on";

  const where = { companyId };
  await prisma.$transaction(
    async (tx) => {
      // notas de produção ficam: solta os vínculos com o que vai ser apagado
      const idsMantidas = (
        await tx.invoice.findMany({
          where: { companyId, ambiente: "PRODUCAO" },
          select: { id: true },
        })
      ).map((n) => n.id);
      if (idsMantidas.length > 0) {
        await tx.invoice.updateMany({
          where: { id: { in: idsMantidas } },
          data: {
            saleId: null,
            serviceOrderId: null,
            ...(apagarParceiros ? { partnerId: null } : {}),
          },
        });
        await tx.invoiceItem.updateMany({
          where: { invoiceId: { in: idsMantidas } },
          data: { productId: null },
        });
        await tx.invoiceServiceItem.updateMany({
          where: { invoiceId: { in: idsMantidas } },
          data: { serviceId: null },
        });
      }

      // financeiro e caixa
      await tx.cashTransaction.deleteMany({ where });
      await tx.settlement.deleteMany({ where });
      await tx.financialEntry.deleteMany({ where });
      await tx.cashRegisterSession.deleteMany({ where });

      // documentos
      await tx.invoice.deleteMany({ where: { companyId, id: { notIn: idsMantidas } } });
      await tx.xmlDocument.deleteMany({
        where: {
          companyId,
          OR: [
            { direcao: "ENTRADA" },
            { invoiceId: null },
            { invoiceId: { notIn: idsMantidas } },
          ],
        },
      });

      // movimento e catálogo
      await tx.sale.deleteMany({ where });
      await tx.serviceOrder.deleteMany({ where });
      await tx.stockMovement.deleteMany({ where });
      const fotos = await tx.product.findMany({
        where: { companyId, imagemUrl: { startsWith: "/api/files/" } },
        select: { imagemUrl: true },
      });
      await tx.product.deleteMany({ where });
      const idsFotos = fotos.map((f) => f.imagemUrl!.slice("/api/files/".length));
      if (idsFotos.length > 0)
        await tx.uploadedFile.deleteMany({ where: { companyId, id: { in: idsFotos } } });
      await tx.category.deleteMany({ where });
      await tx.service.deleteMany({ where });

      if (apagarParceiros) await tx.partner.deleteMany({ where });

      await tx.sequence.deleteMany({
        where: { companyId, name: { in: ["venda", "os", "produto"] } },
      });
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  revalidatePath("/dono");
  revalidatePath(`/dono/assinaturas/${companyId}`);
  return {
    ok:
      `Dados de ${nome} zerados.` +
      (apagarParceiros ? " Clientes e fornecedores também foram apagados." : ""),
  };
}
