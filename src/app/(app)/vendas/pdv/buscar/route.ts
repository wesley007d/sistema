import { requireDbAnyPermission } from "@/lib/auth";

export async function GET(req: Request) {
  const { db } = await requireDbAnyPermission(["vendas", "pdv"]);
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json([]);

  const [produtos, servicos] = await Promise.all([
    db.product.findMany({
      where: {
        ativo: true,
        OR: [
          { nome: { contains: q } },
          { sku: { contains: q } },
          { codigoBarras: { contains: q } },
          { marca: { contains: q } },
        ],
      },
      orderBy: { nome: "asc" },
      take: 20,
      select: {
        id: true,
        sku: true,
        codigoBarras: true,
        nome: true,
        precoVenda: true,
        estoque: true,
        unidade: true,
        localizacao: true,
        imagemUrl: true,
      },
    }),
    db.service.findMany({
      where: {
        ativo: true,
        OR: [{ nome: { contains: q } }, { codigo: { contains: q } }],
      },
      orderBy: { nome: "asc" },
      take: 10,
      select: { id: true, codigo: true, nome: true, preco: true },
    }),
  ]);

  return Response.json([
    ...produtos.map((p) => ({ kind: "produto" as const, ...p })),
    ...servicos.map((s) => ({
      kind: "servico" as const,
      id: s.id,
      codigo: s.codigo,
      nome: s.nome,
      preco: s.preco,
    })),
  ]);
}
