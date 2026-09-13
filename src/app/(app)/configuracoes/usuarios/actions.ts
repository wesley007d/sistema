"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { bool, str } from "@/lib/format";
import { ALL_MODULE_KEYS, hashPassword, requireDbAdmin } from "@/lib/auth";

function lerPermissoes(formData: FormData): string {
  const keys = formData
    .getAll("perm")
    .map(String)
    .filter((k) => ALL_MODULE_KEYS.includes(k));
  return JSON.stringify(keys);
}

export async function createUser(formData: FormData) {
  const { user, db } = await requireDbAdmin();
  const nome = str(formData.get("nome"));
  const email = str(formData.get("email")).toLowerCase();
  const senha = str(formData.get("senha"));
  const role = str(formData.get("role")) === "ADMIN" ? "ADMIN" : "FUNCIONARIO";
  if (!nome || !email || senha.length < 6)
    throw new Error("Preencha nome, e-mail e senha (mín. 6 caracteres).");

  // e-mail e' unico globalmente (entre todas as empresas), por isso a checagem
  // usa o client "cru", nao o escopado por tenant.
  const existe = await prisma.user.findUnique({ where: { email } });
  if (existe) throw new Error("Já existe um usuário com este e-mail.");

  await db.user.create({
    data: {
      companyId: user.companyId,
      nome,
      email,
      senhaHash: await hashPassword(senha),
      role,
      // A senha inicial é definida pelo admin: obriga o funcionário a trocar
      // por uma só dele no primeiro acesso.
      senhaProvisoria: true,
      permissoes:
        role === "ADMIN" ? JSON.stringify(ALL_MODULE_KEYS) : lerPermissoes(formData),
    },
  });
  revalidatePath("/configuracoes/usuarios");
}

export async function updateUser(id: string, formData: FormData) {
  const { user: me, db } = await requireDbAdmin();
  const role = str(formData.get("role")) === "ADMIN" ? "ADMIN" : "FUNCIONARIO";
  const ativo = bool(formData.get("ativo"));

  const alvo = await db.user.findUnique({ where: { id } });
  if (!alvo) throw new Error("Usuário não encontrado. Atualize a página.");

  if (me.id === id && (role !== "ADMIN" || !ativo)) {
    throw new Error("Você não pode remover seu próprio acesso de administrador.");
  }

  await db.user.update({
    where: { id },
    data: {
      nome: str(formData.get("nome")),
      role,
      ativo,
      permissoes:
        role === "ADMIN" ? JSON.stringify(ALL_MODULE_KEYS) : lerPermissoes(formData),
    },
  });
  if (!ativo) await prisma.session.deleteMany({ where: { userId: id } });
  revalidatePath("/configuracoes/usuarios");
}

export async function resetPassword(id: string, formData: FormData) {
  const { db } = await requireDbAdmin();
  const senha = str(formData.get("senha"));
  if (senha.length < 6) throw new Error("A senha deve ter ao menos 6 caracteres.");
  const alvo = await db.user.findUnique({ where: { id } });
  if (!alvo) throw new Error("Usuário não encontrado. Atualize a página.");
  await db.user.update({
    where: { id },
    data: { senhaHash: await hashPassword(senha), senhaProvisoria: true },
  });
  // encerra sessões antigas do usuário
  await prisma.session.deleteMany({ where: { userId: id } });
  revalidatePath("/configuracoes/usuarios");
}

export async function deleteUser(id: string) {
  const { user: me, db } = await requireDbAdmin();
  if (me.id === id) throw new Error("Você não pode excluir seu próprio usuário.");
  // Idempotente: se o registro já não existe (lista defasada, clique duplo,
  // outro admin apagou antes), apenas atualiza a tela.
  const alvo = await db.user.findUnique({ where: { id } });
  if (alvo) await db.user.delete({ where: { id } });
  revalidatePath("/configuracoes/usuarios");
  redirect("/configuracoes/usuarios");
}
