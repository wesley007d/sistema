"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDbPermission } from "@/lib/auth";
import { getDefaultCashAccount } from "@/lib/finance";
import { getOpenCashSession, resumoSessaoCaixa } from "@/lib/caixa";
import { optStr, parseNumber } from "@/lib/format";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Abre o caixa com um fundo de troco (ex.: R$ 50). */
export async function abrirCaixa(formData: FormData) {
  const { user, db } = await requireDbPermission("vendas");
  const jaAberto = await getOpenCashSession(db);
  if (jaAberto) throw new Error("O caixa já está aberto.");

  const valorAbertura = r2(parseNumber(formData.get("valorAbertura")));
  if (valorAbertura < 0) throw new Error("Valor de abertura inválido.");

  const conta = await getDefaultCashAccount(user.companyId, db);

  await db.cashRegisterSession.create({
    data: {
      companyId: user.companyId,
      accountId: conta.id,
      operadorId: user.id,
      valorAbertura,
      observacaoAbertura: optStr(formData.get("observacao")),
    },
  });

  revalidatePath("/caixa");
}

/** Fecha o caixa: confere o valor contado contra o esperado e registra a diferença. */
export async function fecharCaixa(formData: FormData) {
  const { user, db } = await requireDbPermission("vendas");
  const session = await getOpenCashSession(db);
  if (!session) throw new Error("Não há caixa aberto.");

  const valorContado = r2(parseNumber(formData.get("valorContado")));
  const sangrarVendido = formData.get("sangrarVendido") === "on";

  const resumo = await resumoSessaoCaixa(db, session);
  const diferenca = r2(valorContado - resumo.esperado);
  const aRetirar = r2(resumo.esperado - session.valorAbertura);

  await db.$transaction(async (tx) => {
    if (sangrarVendido && aRetirar > 0.001) {
      await tx.cashTransaction.create({
        data: {
          companyId: user.companyId,
          accountId: session.accountId,
          tipo: "SAIDA",
          valor: aRetirar,
          descricao: "Sangria de fechamento de caixa",
          categoria: "Sangria",
          origem: "MANUAL",
        },
      });
    }
    await tx.cashRegisterSession.update({
      where: { id: session.id },
      data: {
        status: "FECHADO",
        valorContado,
        diferenca,
        fechadoEm: new Date(),
        observacaoFechamento: optStr(formData.get("observacao")),
      },
    });
  });

  revalidatePath("/caixa");
  revalidatePath("/financeiro/caixa");
  redirect(`/caixa/fechamento/${session.id}`);
}
