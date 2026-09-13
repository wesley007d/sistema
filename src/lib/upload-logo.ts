import type { ScopedDb } from "@/lib/tenant-db";
import { MIME_IMAGEM_OK, apagarArquivo, salvarArquivo } from "@/lib/uploaded-file";

const MAX = 4 * 1024 * 1024; // 4MB

/** Salva o arquivo de logo enviado; devolve a URL pública ou null se não veio arquivo. */
export async function salvarLogoUpload(
  db: ScopedDb,
  companyId: string,
  file: unknown,
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX) throw new Error("Logo muito grande (máx. 4 MB).");
  if (!MIME_IMAGEM_OK.has(file.type)) {
    throw new Error("Formato de logo inválido (use PNG, JPG, WEBP ou GIF).");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return salvarArquivo(db, companyId, file.type, buffer);
}

/** Apaga um logo salvo anteriormente. */
export async function apagarLogo(db: ScopedDb, url: string | null | undefined) {
  await apagarArquivo(db, url);
}
