"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { str } from "@/lib/format";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";

type State = { ok?: string; erro?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** O usuário logado altera o próprio nome e e-mail (confirmando a senha atual). */
export async function atualizarMeusDados(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const user = await requireUser();
  const nome = str(formData.get("nome"));
  const email = str(formData.get("email")).toLowerCase();
  const senhaAtual = str(formData.get("senhaAtual"));

  if (!nome) return { erro: "Informe seu nome." };
  if (!EMAIL_RE.test(email)) return { erro: "E-mail inválido." };
  if (!(await verifyPassword(senhaAtual, user.senhaHash)))
    return { erro: "Senha atual incorreta." };

  if (email !== user.email) {
    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe && existe.id !== user.id)
      return { erro: "Já existe um usuário com este e-mail." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { nome, email },
  });
  revalidatePath("/perfil");
  return { ok: "Dados atualizados." };
}

/** O usuário logado troca a própria senha. */
export async function trocarMinhaSenha(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const user = await requireUser();
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
  revalidatePath("/perfil");
  return { ok: "Senha alterada." };
}
