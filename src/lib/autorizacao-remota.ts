import crypto from "crypto";
import { clientIp, esperaLegivel, hit, reset } from "@/lib/rate-limit";

/**
 * Autorização do administrador à distância (WhatsApp), sem guardar nada no
 * banco: o pedido vira um token assinado que vai no link; o admin abre o link,
 * confirma com a própria senha e recebe um código de 6 dígitos que só bate com
 * aquele pedido. O funcionário digita o código e o servidor confere.
 * Vale por 30 minutos e só para o tipo de pedido (e limite) que foi pedido.
 */

export type TipoAutorizacao = "produto" | "desconto";

export type PedidoAutorizacao = {
  /** empresa */
  c: string;
  k: TipoAutorizacao;
  /** descrição para o admin ler (ex.: "Desconto de 15% na venda de R$ 200,00") */
  d: string;
  /** quem pediu */
  r: string;
  /** desconto máximo autorizado (%), só para "desconto" */
  p?: number;
  /** expira em (ms) */
  e: number;
  n: string;
};

const VALIDADE_MS = 30 * 60_000;

function segredo(): string {
  const s = process.env.AUTORIZACAO_SECRET || process.env.CRON_SECRET;
  if (!s) throw new Error("Autorização pelo WhatsApp não está configurada no servidor.");
  return s;
}

const hmac = (texto: string) =>
  crypto.createHmac("sha256", segredo()).update(texto).digest("base64url");

export function criarPedido(p: Omit<PedidoAutorizacao, "e" | "n">): string {
  const pedido: PedidoAutorizacao = {
    ...p,
    d: p.d.slice(0, 200),
    r: p.r.slice(0, 80),
    e: Date.now() + VALIDADE_MS,
    n: crypto.randomBytes(6).toString("base64url"),
  };
  const corpo = Buffer.from(JSON.stringify(pedido)).toString("base64url");
  return `${corpo}.${hmac(`pedido:${corpo}`)}`;
}

/** Pedido do token, se a assinatura confere e não expirou. */
export function lerPedido(token: string): PedidoAutorizacao | null {
  const [corpo, assinatura] = (token ?? "").split(".");
  if (!corpo || !assinatura) return null;
  const esperado = hmac(`pedido:${corpo}`);
  if (
    esperado.length !== assinatura.length ||
    !crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(assinatura))
  )
    return null;
  try {
    const p = JSON.parse(Buffer.from(corpo, "base64url").toString()) as PedidoAutorizacao;
    return p.e > Date.now() ? p : null;
  } catch {
    return null;
  }
}

/** Código de 6 dígitos daquele pedido (só o servidor sabe calcular). */
export function codigoDoPedido(token: string): string {
  const h = crypto.createHmac("sha256", segredo()).update(`codigo:${token}`).digest();
  return String(h.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

/**
 * Confere o código digitado pelo funcionário. Com limite de tentativas (o
 * código tem só 6 dígitos). Devolve o pedido válido ou lança erro explicando.
 */
export async function conferirCodigo(
  companyId: string,
  tipo: TipoAutorizacao,
  token: string,
  codigo: string,
): Promise<PedidoAutorizacao> {
  const chave = `codigoaut:${companyId}:${await clientIp()}`;
  const r = hit(chave, 8, 10 * 60_000);
  if (!r.ok)
    throw new Error(`Muitas tentativas de código. Aguarde ${esperaLegivel(r.retryAfterSec)}.`);

  const pedido = lerPedido(token);
  if (!pedido || pedido.c !== companyId || pedido.k !== tipo)
    throw new Error("Pedido de autorização expirado ou inválido. Peça de novo pelo WhatsApp.");
  const certo = codigoDoPedido(token);
  const digitado = codigo.replace(/\D/g, "");
  if (digitado.length !== 6 || !crypto.timingSafeEqual(Buffer.from(certo), Buffer.from(digitado)))
    throw new Error("Código de autorização incorreto.");
  reset(chave);
  return pedido;
}
