"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDbPermission } from "@/lib/auth";
import { bool, optStr, str } from "@/lib/format";

function readPartner(formData: FormData) {
  return {
    tipo: str(formData.get("tipo")) || "CLIENTE",
    pessoa: str(formData.get("pessoa")) || "FISICA",
    nome: str(formData.get("nome")),
    nomeFantasia: optStr(formData.get("nomeFantasia")),
    cpfCnpj: optStr(formData.get("cpfCnpj")),
    rgIe: optStr(formData.get("rgIe")),
    im: optStr(formData.get("im")),
    indicadorIe: str(formData.get("indicadorIe")) || "9",
    email: optStr(formData.get("email")),
    telefone: optStr(formData.get("telefone")),
    celular: optStr(formData.get("celular")),
    cep: optStr(formData.get("cep")),
    logradouro: optStr(formData.get("logradouro")),
    numero: optStr(formData.get("numero")),
    complemento: optStr(formData.get("complemento")),
    bairro: optStr(formData.get("bairro")),
    municipio: optStr(formData.get("municipio")),
    uf: optStr(formData.get("uf")),
    codMunicipio: optStr(formData.get("codMunicipio")),
    observacoes: optStr(formData.get("observacoes")),
    ativo: bool(formData.get("ativo")),
  };
}

export async function createPartner(formData: FormData) {
  const { user, db } = await requireDbPermission("parceiros");
  const data = readPartner(formData);
  if (!data.nome) throw new Error("Nome / razão social é obrigatório.");
  await db.partner.create({ data: { ...data, companyId: user.companyId } });
  revalidatePath("/parceiros");
  redirect("/parceiros");
}

export async function updatePartner(id: string, formData: FormData) {
  const { db } = await requireDbPermission("parceiros");
  const data = readPartner(formData);
  if (!data.nome) throw new Error("Nome / razão social é obrigatório.");
  await db.partner.update({ where: { id }, data });
  revalidatePath("/parceiros");
  redirect("/parceiros");
}

export async function deletePartner(id: string) {
  const { db } = await requireDbPermission("parceiros");
  const usado =
    (await db.sale.count({ where: { partnerId: id } })) +
    (await db.invoice.count({ where: { partnerId: id } })) +
    (await db.serviceOrder.count({ where: { partnerId: id } }));
  if (usado > 0) {
    await db.partner.update({ where: { id }, data: { ativo: false } });
  } else {
    await db.partner.delete({ where: { id } });
  }
  revalidatePath("/parceiros");
  redirect("/parceiros");
}
