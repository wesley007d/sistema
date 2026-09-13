import { prisma } from "@/lib/db";

type RegistrarErroInput = {
  origem: "SERVIDOR" | "CLIENTE";
  mensagem: string;
  stack?: string | null;
  rota?: string | null;
  digest?: string | null;
  companyId?: string | null;
  userId?: string | null;
};

/** Nunca lança — logar o erro não pode derrubar o fluxo que já estava quebrando. */
export async function registrarErro(input: RegistrarErroInput): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        origem: input.origem,
        mensagem: input.mensagem.slice(0, 2000),
        stack: input.stack ? input.stack.slice(0, 8000) : null,
        rota: input.rota ? input.rota.slice(0, 500) : null,
        digest: input.digest ?? null,
        companyId: input.companyId ?? null,
        userId: input.userId ?? null,
      },
    });
  } catch (e) {
    console.error("Falha ao registrar ErrorLog:", e);
  }
}
