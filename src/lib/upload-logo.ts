import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "public", "uploads", "empresa");
const MAX = 4 * 1024 * 1024; // 4MB
// Só imagens rasterizadas. SVG é vetor XML e pode carregar <script> — servido
// no mesmo domínio vira XSS armazenado, então fica de fora de propósito.
const EXT_OK = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const MIME_OK = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/** Salva o arquivo de logo enviado; devolve a URL pública ou null se não veio arquivo. */
export async function salvarLogoUpload(file: unknown): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX) throw new Error("Logo muito grande (máx. 4 MB).");
  const ext = (file.name.split(".").pop() || "png")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!EXT_OK.has(ext) || !MIME_OK.has(file.type)) {
    throw new Error("Formato de logo inválido (use PNG, JPG, WEBP ou GIF).");
  }
  const nome = `${randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`;
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, nome), Buffer.from(await file.arrayBuffer()));
  return `/uploads/empresa/${nome}`;
}

/** Apaga um logo salvo anteriormente (só arquivos dentro de /uploads/empresa/). */
export async function apagarLogo(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/empresa/")) return;
  try {
    await unlink(path.join(process.cwd(), "public", url));
  } catch {
    /* já não existe */
  }
}
