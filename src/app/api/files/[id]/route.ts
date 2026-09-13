import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Serve um arquivo (foto de produto, logo da empresa) guardado no banco.
 * Público/sem auth de propósito — igual ao comportamento antigo de servir
 * de /public/uploads/, o id é um cuid não-adivinhável.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const file = await prisma.uploadedFile.findUnique({
    where: { id },
    select: { mime: true, data: true },
  });
  if (!file) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
