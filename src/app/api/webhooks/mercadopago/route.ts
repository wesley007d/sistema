import { consultarOrder, validarAssinaturaWebhook } from "@/lib/mercadopago";
import { processarOrderPix } from "@/lib/pagamento-assinatura";

export const dynamic = "force-dynamic";

/**
 * Webhook de notificação do Mercado Pago (tópico "order"). O id da order vem
 * na query string (?data.id=...&type=order), não no corpo — o corpo é só
 * informativo; a gente sempre reconsulta a order pela API antes de aplicar
 * qualquer efeito, então o conteúdo do body nunca é usado como fonte de verdade.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("data_id");
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!validarAssinaturaWebhook(xSignature, xRequestId, dataId)) {
    return new Response("assinatura invalida", { status: 401 });
  }
  if (!dataId) return new Response("ok", { status: 200 });

  try {
    const order = await consultarOrder(dataId);
    await processarOrderPix(order);
  } catch (e) {
    console.error("Falha ao processar webhook do Mercado Pago:", e);
  }
  return new Response("ok", { status: 200 });
}
