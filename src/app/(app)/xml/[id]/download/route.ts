import { requireDbPermission } from "@/lib/auth";

/** Remove tudo que não seja seguro num nome de arquivo de header HTTP. */
function nomeSeguro(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120) || "arquivo";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { db } = await requireDbPermission("xml");
  const { id } = await ctx.params;
  const doc = await db.xmlDocument.findUnique({ where: { id } });
  if (!doc) return new Response("Não encontrado", { status: 404 });
  const nome = nomeSeguro(
    doc.origemArquivo ??
      `${doc.tipo}-${doc.numero ?? ""}-${doc.chaveAcesso ?? id}.xml`,
  );
  return new Response(doc.conteudo, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
    },
  });
}
