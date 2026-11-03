import os from "node:os";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de lentidão medido DE DENTRO do servidor (só leitura): tempo de
 * ida ao banco, das consultas das telas Caixa e PDV, e carga da máquina.
 * Protegido pelo CRON_SECRET (igual /api/cron/diagnostico).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const esperado = process.env.CRON_SECRET;
  const recebido =
    url.searchParams.get("secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!esperado || recebido !== esperado) {
    return new Response("não autorizado", { status: 401 });
  }

  const ms = async (f: () => Promise<unknown>) => {
    const t = performance.now();
    await f();
    return Math.round(performance.now() - t);
  };

  const select1: number[] = [];
  for (let i = 0; i < 5; i++) select1.push(await ms(() => prisma.$queryRaw`select 1`));

  const empresa = await prisma.company.findFirst({
    where: { id: { notIn: ["plataforma"] } },
    orderBy: { products: { _count: "desc" } },
    select: { id: true },
  });
  const companyId = empresa?.id ?? "default";
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const consultas: Record<string, number> = {
    sessao_usuario_empresa: await ms(() =>
      prisma.session.findFirst({ include: { user: { include: { company: true } } } }),
    ),
    caixa_sessao_aberta: await ms(() =>
      prisma.cashRegisterSession.findFirst({
        where: { companyId, status: "ABERTO" },
        include: { operador: true, account: true },
      }),
    ),
    caixa_vendas_abertas: await ms(() =>
      prisma.sale.findMany({
        where: { companyId, status: "ABERTA" },
        include: { operador: true, partner: true },
      }),
    ),
    caixa_vendas_hoje: await ms(() =>
      prisma.sale.findMany({
        where: { companyId, status: "FINALIZADA", finalizadaEm: { gte: inicioDia } },
        include: { operador: true },
        take: 50,
      }),
    ),
    pdv_clientes: await ms(() =>
      prisma.partner.findMany({
        where: { companyId, ativo: true, tipo: { in: ["CLIENTE", "AMBOS"] } },
        select: { id: true, nome: true },
      }),
    ),
    pdv_mecanicos: await ms(() =>
      prisma.saleItem.findMany({
        where: { companyId, mecanico: { not: null } },
        distinct: ["mecanico"],
        select: { mecanico: true },
        take: 50,
      }),
    ),
    pdv_busca_kit: await ms(() =>
      prisma.product.findMany({
        where: { companyId, ativo: true, nome: { contains: "kit", mode: "insensitive" } },
        take: 20,
      }),
    ),
  };

  // CPU: quanto tempo a máquina leva numa conta fixa (referência: PC comum ~15–30 ms)
  const cpuMs = (() => {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < 20_000_000; i++) x = (x + i * 7) % 1_000_003;
    return Math.round(performance.now() - t) + (x < 0 ? 1 : 0);
  })();

  const mem = process.memoryUsage();
  return Response.json({
    select1_ms: select1,
    consultas_ms: consultas,
    cpu_teste_ms: cpuMs,
    servidor: {
      node: process.version,
      cpus: os.cpus().length,
      carga_1_5_15min: os.loadavg().map((n) => Math.round(n * 100) / 100),
      memoria_livre_mb: Math.round(os.freemem() / 1048576),
      memoria_total_mb: Math.round(os.totalmem() / 1048576),
      processo_rss_mb: Math.round(mem.rss / 1048576),
      processo_heap_mb: Math.round(mem.heapUsed / 1048576),
      no_ar_ha_min: Math.round(process.uptime() / 60),
    },
  });
}
