const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface LinhaPagamento {
  forma: string;
  valor: number;
}

/**
 * Regra de troco do balcão: **só dinheiro dá troco**. Cartão, PIX e crediário
 * cobrem exatamente a sua parte — nunca geram troco.
 *
 * - `falta`  : quanto ainda falta pagar (todas as formas somadas).
 * - `troco`  : quanto do dinheiro passou do que faltava depois das outras formas.
 * - `recebidoAgora` : entra no caixa hoje (tudo menos crediário), já sem o troco.
 */
export function calcPagamento(total: number, pagamentos: LinhaPagamento[]) {
  const soma = (fn: (p: LinhaPagamento) => boolean) =>
    r2(
      pagamentos
        .filter(fn)
        .reduce((s, p) => s + (Number(p.valor) || 0), 0),
    );

  const dinheiro = soma((p) => p.forma === "DINHEIRO");
  const crediario = soma((p) => p.forma === "CREDIARIO");
  const outros = soma((p) => p.forma !== "DINHEIRO" && p.forma !== "CREDIARIO");

  const pago = r2(dinheiro + outros + crediario);
  const falta = Math.max(0, r2(total - pago));

  // do total, o crediário fica para depois; o resto (outros + dinheiro) é agora
  const dinheiroNecessario = Math.max(0, r2(total - crediario - outros));
  const troco = Math.max(0, r2(dinheiro - dinheiroNecessario));
  const recebidoAgora = r2(dinheiro + outros - troco);

  return { dinheiro, crediario, outros, pago, falta, troco, recebidoAgora };
}
