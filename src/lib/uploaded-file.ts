import type { ScopedDb } from "@/lib/tenant-db";

/**
 * Fotos de produto e logo da empresa ficam salvas no banco (`UploadedFile`),
 * não em disco — esta hospedagem não mantém arquivos entre deploys. Servidas
 * por `/api/files/[id]`.
 */

// Só imagens rasterizadas. SVG fica de fora: é XML e pode conter <script>, o que
// vira XSS armazenado quando o arquivo é servido no mesmo domínio.
export const MIME_IMAGEM_OK = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const HOSTS_BLOQUEADOS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
];

/** Grava um arquivo binário no banco e devolve a URL pública que o serve. */
export async function salvarArquivo(
  db: ScopedDb,
  companyId: string,
  mime: string,
  data: Buffer,
): Promise<string> {
  const f = await db.uploadedFile.create({
    data: { companyId, mime, data: new Uint8Array(data) },
  });
  return `/api/files/${f.id}`;
}

/** Apaga um arquivo salvo anteriormente (só os servidos por /api/files/). */
export async function apagarArquivo(db: ScopedDb, url: string | null | undefined) {
  if (!url || !url.startsWith("/api/files/")) return;
  const id = url.slice("/api/files/".length);
  await db.uploadedFile.deleteMany({ where: { id } }).catch(() => {});
}

/** Baixa uma imagem de uma URL externa; lança erro se não der certo. */
export async function baixarImagemExterna(
  url: string,
): Promise<{ mime: string; data: Buffer }> {
  let alvo: URL;
  try {
    alvo = new URL(url);
  } catch {
    throw new Error("URL da imagem inválida.");
  }
  if (alvo.protocol !== "http:" && alvo.protocol !== "https:") {
    throw new Error("A URL da imagem precisa ser http ou https.");
  }
  if (HOSTS_BLOQUEADOS.some((re) => re.test(alvo.hostname))) {
    throw new Error("Essa URL de imagem não é permitida.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    // `manual`: um redirect poderia apontar para um host interno depois da
    // checagem de blocklist acima (SSRF). Não seguimos — pedimos a URL final.
    res = await fetch(alvo, { signal: controller.signal, redirect: "manual" });
  } catch {
    throw new Error("Não foi possível baixar a imagem dessa URL.");
  } finally {
    clearTimeout(timeout);
  }
  if (res.status >= 300 && res.status < 400)
    throw new Error("A URL da imagem redireciona; use o endereço final direto.");
  if (!res.ok) throw new Error(`Não foi possível baixar a imagem (HTTP ${res.status}).`);

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!MIME_IMAGEM_OK.has(contentType)) {
    throw new Error("Essa URL não aponta para uma imagem PNG, JPG, WEBP ou GIF.");
  }

  const data = Buffer.from(await res.arrayBuffer());
  if (data.length > 8 * 1024 * 1024) {
    throw new Error("Imagem muito grande (máx. 8MB).");
  }

  return { mime: contentType, data };
}
