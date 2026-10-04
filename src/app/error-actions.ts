"use server";

import { getCurrentUser } from "@/lib/auth";
import { registrarErro } from "@/lib/error-log";
import { prisma } from "@/lib/db";

export async function registrarErroCliente(dados: {
  mensagem: string;
  stack?: string;
  rota?: string;
  digest?: string;
}) {
  const user = await getCurrentUser().catch(() => null);
  await registrarErro({
    origem: "CLIENTE",
    mensagem: dados.mensagem,
    stack: dados.stack ?? null,
    rota: dados.rota ?? null,
    digest: dados.digest ?? null,
    companyId: user?.companyId ?? null,
    userId: user?.id ?? null,
  });
}

/** Traduz erros técnicos (banco etc.) para algo que o usuário entenda. */
function motivoAmigavel(msg: string) {
  if (/transaction/i.test(msg) && /timeout|expired|closed|timed out/i.test(msg))
    return "A operação demorou demais e foi cancelada. Nada foi gravado pela metade — tente de novo.";
  if (/Unique constraint/i.test(msg))
    return "Já existe um registro com esses dados (por exemplo, um código repetido).";
  if (/P2025|Record to (update|delete) not found|No record was found/i.test(msg))
    return "O registro não foi encontrado — pode ter sido excluído. Atualize a página.";
  if (/prisma|invocation|ECONN|ETIMEDOUT|Can't reach database/i.test(msg))
    return "Falha ao falar com o banco de dados. Tente de novo em instantes.";
  return msg.split("\n")[0].slice(0, 400);
}

/**
 * Motivo real de um erro do servidor, pelo código (digest) mostrado na tela.
 * Só devolve erros do próprio usuário — nunca vaza erro de outra empresa.
 */
export async function buscarMotivoErro(digest?: string): Promise<string | null> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return null;
  const desde = new Date(Date.now() - 2 * 60_000);
  const erro =
    (digest
      ? await prisma.errorLog.findFirst({
          where: { origem: "SERVIDOR", digest, userId: user.id },
          orderBy: { createdAt: "desc" },
        })
      : null) ??
    // o código do navegador nem sempre é o mesmo do servidor: pega o último
    // erro do servidor deste usuário nos últimos 2 minutos
    (await prisma.errorLog.findFirst({
      where: { origem: "SERVIDOR", userId: user.id, createdAt: { gte: desde } },
      orderBy: { createdAt: "desc" },
    }));
  return erro ? motivoAmigavel(erro.mensagem) : null;
}
