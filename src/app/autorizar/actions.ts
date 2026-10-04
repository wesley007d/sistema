"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { conferirAdmin } from "@/lib/aprovacao";
import {
  codigoDoPedido,
  criarPedido,
  lerPedido,
  type TipoAutorizacao,
} from "@/lib/autorizacao-remota";

/** Funcionário pede a autorização: devolve o link do WhatsApp com o pedido. */
export async function pedirAutorizacao(
  tipo: TipoAutorizacao,
  descricao: string,
  pct?: number,
): Promise<{ token: string; whatsapp: string }> {
  const user = await requireUser();
  const token = criarPedido({
    c: user.companyId,
    k: tipo,
    d: descricao,
    r: user.nome,
    ...(tipo === "desconto" ? { p: Math.ceil((pct ?? 0) * 10) / 10 } : {}),
  });
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "sistemanegocios.com.br";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const link = `${proto}://${host}/autorizar/${token}`;
  const texto =
    `🔐 *Pedido de autorização* — ${user.nome}\n` +
    `${descricao}\n\n` +
    `Abra o link, confirme com sua senha e me mande o código:\n${link}`;
  return { token, whatsapp: `https://wa.me/?text=${encodeURIComponent(texto)}` };
}

export type EstadoAprovacao = { codigo?: string; erro?: string };

/** Admin confirma com e-mail e senha no próprio celular e recebe o código. */
export async function aprovarPedido(
  token: string,
  _prev: EstadoAprovacao,
  formData: FormData,
): Promise<EstadoAprovacao> {
  const pedido = lerPedido(token);
  if (!pedido) return { erro: "Este pedido expirou (vale 30 minutos). Peça para enviarem de novo." };
  try {
    const admin = await conferirAdmin(
      pedido.c,
      String(formData.get("email") ?? ""),
      String(formData.get("senha") ?? ""),
    );
    if (!admin) return { erro: "E-mail ou senha de administrador incorretos." };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível conferir." };
  }
  return { codigo: codigoDoPedido(token) };
}
