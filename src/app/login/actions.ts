"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { str } from "@/lib/format";
import { clientIp, esperaLegivel, hit, reset } from "@/lib/rate-limit";
import {
  can,
  createSession,
  destroySession,
  hashPassword,
  isOwner,
  precisaRehashSenha,
  verifyPassword,
} from "@/lib/auth";

export async function login(_prev: unknown, formData: FormData) {
  const email = str(formData.get("email")).toLowerCase();
  const senha = str(formData.get("senha"));
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  // Anti força bruta: por IP (ampla) e por e-mail (vale mesmo se trocar de IP).
  const ip = await clientIp();
  const porIp = hit(`login:ip:${ip}`, 15, 15 * 60_000);
  const porEmail = hit(`login:email:${email}`, 7, 15 * 60_000);
  if (!porIp.ok || !porEmail.ok) {
    const s = Math.max(porIp.retryAfterSec, porEmail.retryAfterSec);
    return {
      erro: `Muitas tentativas de login. Tente novamente em ${esperaLegivel(s)}.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.ativo || !(await verifyPassword(senha, user.senhaHash))) {
    return { erro: "E-mail ou senha inválidos." };
  }
  // Sucesso: libera o contador do e-mail (o do IP expira sozinho em 15 min).
  reset(`login:email:${email}`);
  // Regrava a senha se o hash estava com parâmetros antigos (upgrade transparente).
  if (precisaRehashSenha(user.senhaHash)) {
    await prisma.user
      .update({ where: { id: user.id }, data: { senhaHash: await hashPassword(senha) } })
      .catch(() => {});
  }
  await createSession(user.id);
  // Senha provisória (definida pelo admin): força a troca antes de qualquer coisa.
  if (user.senhaProvisoria) redirect("/trocar-senha");
  // Dono da plataforma vai direto pra Área do Dono.
  if (isOwner(user)) redirect("/dono");
  // Vendedor (só PDV, sem Caixa) cai direto no PDV.
  const ehVendedor = can(user, "pdv") && !can(user, "vendas");
  redirect(ehVendedor ? "/vendas/pdv" : "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
