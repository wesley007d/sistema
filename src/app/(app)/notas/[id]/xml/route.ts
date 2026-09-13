import { requireDbPermission } from "@/lib/auth";

/** Remove tudo que não seja seguro num nome de arquivo de header HTTP. */
function nomeSeguro(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120) || "arquivo";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { db } = await requireDbPermission("notas");
  const { id } = await ctx.params;
  const nf = await db.invoice.findUnique({ where: { id } });
  if (!nf?.xml) {
    return new Response("XML não disponível para esta nota.", { status: 404 });
  }
  const nome = nomeSeguro(`${nf.tipo}-${nf.numero}-${nf.chaveAcesso ?? id}.xml`);
  return new Response(nf.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
    },
  });
}
