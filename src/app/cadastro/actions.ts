"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { str } from "@/lib/format";
import { clientIp, esperaLegivel, hit } from "@/lib/rate-limit";
import { ALL_MODULE_KEYS, createSession, hashPassword } from "@/lib/auth";
import { MENSALIDADE_PADRAO } from "@/lib/assinatura";
import { enviarEmail } from "@/lib/email";
import { formatarCnpj, validarCnpj } from "@/lib/cnpj";
import { consultarCnpjReceita } from "@/lib/cnpj-consulta";

export async function signupCompany(_prev: unknown, formData: FormData) {
  const nomeFantasiaDigitado = str(formData.get("nomeFantasia")) || null;
  const cnpjDigitado = str(formData.get("cnpj"));
  const nome = str(formData.get("nome"));
  const email = str(formData.get("email")).toLowerCase();
  const senha = str(formData.get("senha"));

  if (!cnpjDigitado || !nome || !email || senha.length < 6) {
    return { erro: "Preencha CNPJ, nome, e-mail e senha (mín. 6 caracteres)." };
  }
  if (!validarCnpj(cnpjDigitado)) {
    return { erro: "CNPJ inválido. Confira os números digitados." };
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

  const cnpj = formatarCnpj(cnpjDigitado);
  const jaExiste = await prisma.company.findFirst({ where: { cnpj } });
  if (jaExiste) return { erro: "Já existe uma empresa cadastrada com esse CNPJ." };

  // Fonte de verdade: a razão social vem da Receita Federal, nunca do que o
  // usuário digitou — é o jeito de garantir que a empresa cadastrada é real.
  let dadosOficiais;
  try {
    dadosOficiais = await consultarCnpjReceita(cnpjDigitado);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível verificar o CNPJ." };
  }
  if (dadosOficiais.situacao.toUpperCase() !== "ATIVA") {
    return {
      erro: `Esse CNPJ está com situação "${dadosOficiais.situacao || "não ativa"}" na Receita Federal e não pode se cadastrar.`,
    };
  }

  const senhaHash = await hashPassword(senha);
  // Toda empresa nova começa com 7 dias de teste grátis.
  const fimDoTeste = new Date(Date.now() + 7 * 86_400_000);
  const user = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        razaoSocial: dadosOficiais.razaoSocial,
        nomeFantasia: nomeFantasiaDigitado || dadosOficiais.nomeFantasia,
        cnpj,
        cep: dadosOficiais.cep,
        logradouro: dadosOficiais.logradouro,
        numero: dadosOficiais.numero,
        complemento: dadosOficiais.complemento,
        bairro: dadosOficiais.bairro,
        municipio: dadosOficiais.municipio,
        uf: dadosOficiais.uf,
        codMunicipio: dadosOficiais.codMunicipio,
        telefone: dadosOficiais.telefone,
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

  // Alerta de novo cadastro nunca deve travar o cadastro em si.
  const alertaEmail = process.env.ALERTA_CADASTRO_EMAIL;
  if (alertaEmail) {
    try {
      await enviarEmail({
        to: alertaEmail,
        subject: "Novo cadastro no Auto Peças System",
        html: `<div style="font-family:sans-serif;line-height:1.6;color:#111">
          <p>Uma empresa nova acabou de se cadastrar:</p>
          <p><b>Empresa:</b> ${nomeFantasiaDigitado || dadosOficiais.nomeFantasia || dadosOficiais.razaoSocial} (CNPJ ${cnpj})<br/>
          <b>Responsável:</b> ${nome} (${email})</p>
        </div>`,
      });
    } catch (e) {
      console.error("Falha ao enviar alerta de novo cadastro por e-mail:", e);
    }
  }

  redirect("/configuracoes");
}
