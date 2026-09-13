"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

export async function limparErrosAntigos(formData: FormData) {
  await requireOwner();
  const dias = Number(formData.get("dias")) || 30;
  const limite = new Date(Date.now() - dias * 86_400_000);
  await prisma.errorLog.deleteMany({ where: { createdAt: { lt: limite } } });
  revalidatePath("/dono/erros");
}

export async function excluirErro(id: string) {
  await requireOwner();
  await prisma.errorLog.delete({ where: { id } }).catch(() => {});
  revalidatePath("/dono/erros");
}
