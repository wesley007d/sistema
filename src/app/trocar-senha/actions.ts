"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { str } from "@/lib/format";
import {
  can,
  getCurrentUser,
  hashPassword,
  isOwner,
  verifyPassword,
} from "@/lib/auth";

type State = { erro?: string } | undefined;

/**
 * Fluxo de senha provisória: o usuário acabou de logar com a senha que o admin
 * definiu e precisa trocar por uma só dele antes de entrar no sistema.
 */
export async function definirNovaSenha(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.senhaProvisoria) redirect("/");

  const atual = str(formData.get("atual"));
  const nova = str(formData.get("nova"));
  const confirmar = str(formData.get("confirmar"));

  if (nova.length < 6)
    return { erro: "A nova senha deve ter ao menos 6 caracteres." };
  if (nova !== confirmar)
    return { erro: "A confirmação não confere com a nova senha." };
  if (!(await verifyPassword(atual, user.senhaHash)))
    return { erro: "Senha atual incorreta." };
  if (await verifyPassword(nova, user.senhaHash))
    return { erro: "A nova senha precisa ser diferente da atual." };

  await prisma.user.update({
    where: { id: user.id },
    data: { senhaHash: await hashPassword(nova), senhaProvisoria: false },
  });

  if (isOwner(user)) redirect("/dono");
  const ehVendedor = can(user, "pdv") && !can(user, "vendas");
  redirect(ehVendedor ? "/vendas/pdv" : "/");
}
