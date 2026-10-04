import type { Instrumentation } from "next";

/**
 * Em produção o Next esconde a mensagem dos erros do servidor e o navegador só
 * recebe um código (digest). Guardamos aqui a mensagem real com esse código
 * para a tela de erro conseguir mostrar o motivo.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const e = err as { message?: string; stack?: string; digest?: string };
  const { registrarErro } = await import("@/lib/error-log");
  const { prisma } = await import("@/lib/db");

  // fora do contexto do request não dá para usar cookies(): lê o header
  const cookie = request.headers.cookie;
  const sid = (Array.isArray(cookie) ? cookie.join("; ") : cookie ?? "").match(
    /(?:^|;\s*)moto_sid=([^;]+)/,
  )?.[1];
  const session = sid
    ? await prisma.session
        .findUnique({ where: { id: sid }, select: { user: { select: { id: true, companyId: true } } } })
        .catch(() => null)
    : null;

  await registrarErro({
    origem: "SERVIDOR",
    mensagem: e?.message ?? String(err),
    stack: e?.stack ?? null,
    rota: `${request.method} ${request.path} (${context.routeType})`,
    digest: e?.digest ?? null,
    companyId: session?.user.companyId ?? null,
    userId: session?.user.id ?? null,
  });
};
