"use server";

import { getCurrentUser } from "@/lib/auth";
import { registrarErro } from "@/lib/error-log";

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
