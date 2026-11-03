import type { Instrumentation } from "next";

/**
 * O banco (Neon, plano grátis) "dorme" depois de 5 min sem uso e a 1ª tela
 * depois disso demora ~0,5–1 s a mais para ele acordar. No horário da loja
 * (seg–sáb, 8h–19h de Brasília) mandamos um "select 1" a cada 4 min para ele
 * ficar acordado. Fora desse horário deixa dormir. Pior caso ~72 de 100
 * CU-hora/mês; com NEON_API_KEY o uso é conferido de hora em hora e isto
 * desliga sozinho perto do limite (ver lib/neon-uso.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  const g = globalThis as unknown as { __bancoAcordado?: boolean };
  if (g.__bancoAcordado) return;
  g.__bancoAcordado = true;

  const { prisma } = await import("@/lib/db");
  const horarioDaLoja = () => {
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      hour: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const dia = partes.find((p) => p.type === "weekday")?.value;
    const hora = Number(partes.find((p) => p.type === "hour")?.value);
    return dia !== "Sun" && hora >= 8 && hora < 19;
  };
  const { podeManterAcordado } = await import("@/lib/neon-uso");
  const timer = setInterval(async () => {
    if (!horarioDaLoja()) return;
    if (!(await podeManterAcordado().catch(() => true))) return;
    prisma.$queryRaw`select 1`.catch(() => {});
  }, 4 * 60 * 1000);
  timer.unref?.();
}

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
