"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDbPermission } from "@/lib/auth";
import { bool, optStr, parseNumber, str } from "@/lib/format";

function readService(formData: FormData) {
  return {
    codigo: str(formData.get("codigo")),
    nome: str(formData.get("nome")),
    descricao: optStr(formData.get("descricao")),
    preco: parseNumber(formData.get("preco")),
    itemListaServico: optStr(formData.get("itemListaServico")),
    codTributacaoMunicipio: optStr(formData.get("codTributacaoMunicipio")),
    aliquotaIss: parseNumber(formData.get("aliquotaIss")),
    issRetido: bool(formData.get("issRetido")),
    ativo: bool(formData.get("ativo")),
  };
}

export async function createService(formData: FormData) {
  const { user, db } = await requireDbPermission("servicos");
  const data = readService(formData);
  if (!data.codigo || !data.nome)
    throw new Error("Código e nome do serviço são obrigatórios.");
  await db.service.create({ data: { ...data, companyId: user.companyId } });
  revalidatePath("/servicos");
  redirect("/servicos");
}

export async function updateService(id: string, formData: FormData) {
  const { db } = await requireDbPermission("servicos");
  const data = readService(formData);
  if (!data.codigo || !data.nome)
    throw new Error("Código e nome do serviço são obrigatórios.");
  await db.service.update({ where: { id }, data });
  revalidatePath("/servicos");
  redirect("/servicos");
}

export async function deleteService(id: string) {
  const { db } = await requireDbPermission("servicos");
  const usado =
    (await db.serviceOrderItem.count({ where: { serviceId: id } })) +
    (await db.invoiceServiceItem.count({ where: { serviceId: id } }));
  if (usado > 0) {
    await db.service.update({ where: { id }, data: { ativo: false } });
  } else {
    await db.service.delete({ where: { id } });
  }
  revalidatePath("/servicos");
  redirect("/servicos");
}
