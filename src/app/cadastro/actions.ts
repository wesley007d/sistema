"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { str } from "@/lib/format";
import { clientIp, esperaLegivel, hit } from "@/lib/rate-limit";
import { ALL_MODULE_KEYS, createSession, hashPassword } from "@/lib/auth";
import { MENSALIDADE_PADRAO } from "@/lib/assinatura";

export async function signupCompany(_prev: unknown, formData: FormData) {
  const razaoSocial = str(formData.get("razaoSocial"));
  const nomeFantasia = str(formData.get("nomeFantasia")) || null;
  const cnpj = str(formData.get("cnpj"));
  const nome = str(formData.get("nome"));
  const email = str(formData.get("email")).toLowerCase();
  const senha = str(formData.get("senha"));

  if (!razaoSocial || !nome || !email || senha.length < 6) {
    return { erro: "Preencha razão social, nome, e-mail e senha (mín. 6 caracteres)." };
  }

  // Anti-abuso: no máx. 3 empresas por IP a cada hora.
  const r = hit(`signup:ip:${await clientIp()}`, 3, 60 * 60_000);
  if (!r.ok) {
    return {
      erro: `Muitos cadastros deste dispositivo. Tente novamente em ${esperaLegivel(r.retryAfterSec)}.`,
    };
  }

  const existe = await prisma.user.findUnique({ where: { email } });
  if (existe) return { erro: "Já existe um usuário com este e-mail." };

  const senhaHash = await hashPassword(senha);
  // Toda empresa nova começa com 14 dias de teste grátis.
  const fimDoTeste = new Date(Date.now() + 14 * 86_400_000);
  const user = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        razaoSocial,
        nomeFantasia,
        cnpj,
        assinaturaStatus: "TESTE",
        assinaturaValor: MENSALIDADE_PADRAO,
        assinaturaVence: fimDoTeste,
      },
    });
    return tx.user.create({
      data: {
        companyId: company.id,
        nome,
        email,
        senhaHash,
        role: "ADMIN",
        permissoes: JSON.stringify(ALL_MODULE_KEYS),
      },
    });
  });

  await createSession(user.id);
  redirect("/configuracoes");
}
