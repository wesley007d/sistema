import crypto from "crypto";

const MP_BASE = "https://api.mercadopago.com";

function accessToken(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return t;
}

type MpOrderPayment = {
  id: string;
  status: string;
  status_detail: string;
  payment_method?: {
    id: string;
    type: string;
    ticket_url?: string;
    qr_code?: string;
    qr_code_base64?: string;
  };
};

export type MpOrder = {
  id: string;
  status: string;
  status_detail: string;
  external_reference?: string;
  total_amount?: string;
  transactions?: { payments?: MpOrderPayment[] };
};

/** Cria uma cobrança Pix via API de Orders do Mercado Pago. */
export async function criarOrderPix(input: {
  valor: number;
  externalReference: string;
  descricao: string;
  payerEmail: string;
}): Promise<MpOrder> {
  const res = await fetch(`${MP_BASE}/v1/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
      Accept: "application/json",
    },
    body: JSON.stringify({
      type: "online",
      total_amount: input.valor.toFixed(2),
      external_reference: input.externalReference,
      description: input.descricao,
      processing_mode: "automatic",
      transactions: {
        payments: [
          {
            amount: input.valor.toFixed(2),
            payment_method: { id: "pix", type: "bank_transfer" },
          },
        ],
      },
      payer: { email: input.payerEmail },
    }),
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`Mercado Pago recusou a cobrança (${res.status}): ${corpo}`);
  }
  return res.json();
}

/** Consulta o estado atual de uma order (usado pelo webhook e pelo botão "já paguei"). */
export async function consultarOrder(mpOrderId: string): Promise<MpOrder> {
  const res = await fetch(`${MP_BASE}/v1/orders/${mpOrderId}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  if (!res.ok) throw new Error(`Falha ao consultar a order ${mpOrderId} (${res.status}).`);
  return res.json();
}

/** true quando o pagamento Pix da order foi aprovado. */
export function orderPixAprovada(order: MpOrder): boolean {
  const pagamento = order.transactions?.payments?.[0];
  return pagamento?.status === "processed" || pagamento?.status === "approved";
}

/**
 * Valida a assinatura HMAC do webhook (header x-signature), conforme
 * https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications
 * Sem MERCADOPAGO_WEBHOOK_SECRET configurado, a validação é pulada (usado só
 * até a usuária terminar de configurar a notificação no painel).
 */
export function validarAssinaturaWebhook(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!xSignature || !xRequestId || !dataId) return false;

  const partes = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );
  const ts = partes.ts;
  const hash = partes.v1;
  if (!ts || !hash) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const esperado = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(hash));
}
