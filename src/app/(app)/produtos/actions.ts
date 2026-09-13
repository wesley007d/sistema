"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDbAnyPermission, requireDbPermission } from "@/lib/auth";
import type { ScopedDb } from "@/lib/tenant-db";
import { bool, optStr, parseNumber, str } from "@/lib/format";
import { gerarSkuProduto } from "@/lib/produto-sku";
import { conferirAdmin } from "@/lib/aprovacao";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "produtos");

// Só imagens rasterizadas. SVG fica de fora: é XML e pode conter <script>, o que
// vira XSS armazenado quando o arquivo é servido no mesmo domínio.
const EXT_IMAGEM_OK = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const MIME_IMAGEM_OK = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const EXT_POR_CONTENT_TYPE: Record<string, string> = {
  jpeg: "jpg",
};

/** Normaliza e valida a extensão de imagem; lança erro se não for permitida. */
function extImagemValida(bruto: string): string {
  const ext = bruto.toLowerCase().replace(/[^a-z0-9]/g, "");
  const norm = ext === "jpeg" ? "jpg" : ext;
  if (!EXT_IMAGEM_OK.has(norm))
    throw new Error("Formato de imagem inválido (use PNG, JPG, WEBP ou GIF).");
  return norm;
}

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

/** Baixa uma imagem de uma URL externa e salva localmente; lança erro se não der certo. */
async function baixarImagemDaUrl(url: string): Promise<string> {
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

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error("Imagem muito grande (máx. 8MB).");
  }

  const bruto = contentType.split("/")[1] ?? "jpg";
  const ext = extImagemValida(EXT_POR_CONTENT_TYPE[bruto] ?? bruto);
  const nomeArquivo = `${randomUUID()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, nomeArquivo), buffer);
  return `/uploads/produtos/${nomeArquivo}`;
}

/** Salva a imagem enviada/baixada (se houver) e devolve a URL pública; null = remover. */
async function saveImagem(formData: FormData): Promise<string | null | undefined> {
  if (bool(formData.get("removerImagem"))) return null;

  const file = formData.get("imagem");
  if (file instanceof File && file.size > 0) {
    if (file.size > 8 * 1024 * 1024)
      throw new Error("Imagem muito grande (máx. 8MB).");
    if (!MIME_IMAGEM_OK.has(file.type))
      throw new Error("Formato de imagem inválido (use PNG, JPG, WEBP ou GIF).");
    const ext = extImagemValida(file.name.split(".").pop() || "jpg");
    const nomeArquivo = `${randomUUID()}.${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, nomeArquivo), buffer);
    return `/uploads/produtos/${nomeArquivo}`;
  }

  const urlExterna = optStr(formData.get("imagemUrlExterna"));
  if (urlExterna) return baixarImagemDaUrl(urlExterna);

  return undefined;
}

async function removerArquivoAntigo(imagemUrl: string | null | undefined) {
  if (!imagemUrl || !imagemUrl.startsWith("/uploads/produtos/")) return;
  try {
    await unlink(path.join(process.cwd(), "public", imagemUrl));
  } catch {
    // arquivo já não existe; ignora
  }
}

function readProduct(formData: FormData) {
  return {
    sku: str(formData.get("sku")),
    codigoBarras: optStr(formData.get("codigoBarras")),
    nome: str(formData.get("nome")),
    descricao: optStr(formData.get("descricao")),
    marca: optStr(formData.get("marca")),
    unidade: str(formData.get("unidade")) || "UN",
    precoCusto: parseNumber(formData.get("precoCusto")),
    precoVenda: parseNumber(formData.get("precoVenda")),
    estoqueMinimo: parseNumber(formData.get("estoqueMinimo")),
    localizacao: optStr(formData.get("localizacao")),
    ncm: optStr(formData.get("ncm")),
    cest: optStr(formData.get("cest")),
    cfopVenda: str(formData.get("cfopVenda")) || "5102",
    origem: str(formData.get("origem")) || "0",
    icmsCst: str(formData.get("icmsCst")) || "102",
    aliquotaIcms: parseNumber(formData.get("aliquotaIcms")),
    ativo: bool(formData.get("ativo")),
  };
}

async function resolveCategoria(
  db: ScopedDb,
  companyId: string,
  nome: string | null
): Promise<string | null> {
  if (!nome) return null;
  const cat = await db.category.upsert({
    where: { companyId_nome: { companyId, nome } },
    create: { nome, companyId },
    update: {},
  });
  return cat.id;
}

export async function createProduct(formData: FormData) {
  const { user, db } = await requireDbPermission("produtos");
  const data = readProduct(formData);
  if (!data.nome) {
    throw new Error("O nome do produto é obrigatório.");
  }
  // Funcionário só cadastra produto novo com um admin autorizando na hora.
  if (user.role !== "ADMIN") {
    const adm = await conferirAdmin(
      user.companyId,
      str(formData.get("adminEmail")),
      str(formData.get("adminSenha")),
    );
    if (!adm)
      throw new Error(
        "Cadastro de produto novo precisa da autorização de um administrador (e-mail e senha corretos).",
      );
  }
  if (data.sku) {
    const existe = await db.product.findUnique({
      where: { companyId_sku: { companyId: user.companyId, sku: data.sku } },
    });
    if (existe) throw new Error(`Já existe um produto com o código "${data.sku}".`);
  }
  const categoryId = await resolveCategoria(db, user.companyId, optStr(formData.get("categoria")));
  const imagemUrl = await saveImagem(formData);

  const estoqueInicial = parseNumber(formData.get("estoqueInicial"));

  await db.$transaction(async (tx) => {
    // Código em branco -> gera automático (P0001, P0002, ...).
    const sku = data.sku || (await gerarSkuProduto(tx, user.companyId));
    const p = await tx.product.create({
      data: {
        ...data,
        sku,
        companyId: user.companyId,
        categoryId,
        estoque: estoqueInicial,
        imagemUrl: imagemUrl ?? null,
      },
    });
    if (estoqueInicial !== 0) {
      await tx.stockMovement.create({
        data: {
          companyId: user.companyId,
          productId: p.id,
          tipo: "ENTRADA",
          quantidade: estoqueInicial,
          custoUnit: data.precoCusto,
          saldoApos: estoqueInicial,
          origem: "MANUAL",
          observacao: "Estoque inicial no cadastro",
        },
      });
    }
  });

  revalidatePath("/produtos");
  redirect("/produtos");
}

export async function updateProduct(id: string, formData: FormData) {
  const { user, db } = await requireDbPermission("produtos");
  // Editar o cadastro de um produto existente é só do administrador geral.
  if (user.role !== "ADMIN")
    throw new Error(
      "Somente o administrador geral edita o cadastro de produtos.",
    );
  const data = readProduct(formData);
  if (!data.nome) {
    throw new Error("O nome do produto é obrigatório.");
  }
  const { sku, ...rest } = data;
  if (sku) {
    const conflito = await db.product.findUnique({
      where: { companyId_sku: { companyId: user.companyId, sku } },
    });
    if (conflito && conflito.id !== id)
      throw new Error(`Já existe outro produto com o código "${sku}".`);
  }
  const categoryId = await resolveCategoria(db, user.companyId, optStr(formData.get("categoria")));
  const imagemUrl = await saveImagem(formData);
  if (imagemUrl !== undefined) {
    const atual = await db.product.findUnique({ where: { id }, select: { imagemUrl: true } });
    await removerArquivoAntigo(atual?.imagemUrl);
  }
  await db.product.update({
    where: { id },
    data: {
      ...rest,
      // Código em branco na edição: mantém o atual.
      ...(sku ? { sku } : {}),
      categoryId,
      ...(imagemUrl !== undefined ? { imagemUrl } : {}),
    },
  });
  revalidatePath("/produtos");
  revalidatePath(`/produtos/${id}`);
  redirect("/produtos");
}

export async function deleteProduct(id: string) {
  const { user, db } = await requireDbPermission("produtos");
  if (user.role !== "ADMIN")
    throw new Error("Somente o administrador geral exclui produtos.");
  const usado =
    (await db.saleItem.count({ where: { productId: id } })) +
    (await db.invoiceItem.count({ where: { productId: id } })) +
    (await db.serviceOrderItem.count({ where: { productId: id } }));
  if (usado > 0) {
    // Nao apaga: apenas inativa para preservar historico
    await db.product.update({ where: { id }, data: { ativo: false } });
  } else {
    const p = await db.product.findUnique({ where: { id }, select: { imagemUrl: true } });
    await removerArquivoAntigo(p?.imagemUrl);
    await db.product.delete({ where: { id } });
  }
  revalidatePath("/produtos");
  redirect("/produtos");
}

/**
 * Atualiza SÓ a localização (prateleira) de um produto — liberado para
 * vendedor (`pdv`) e quem cuida de produtos. Não toca em preço nem no
 * resto do cadastro.
 */
export async function salvarLocalizacaoProduto(id: string, formData: FormData) {
  const { db } = await requireDbAnyPermission(["produtos", "pdv"]);
  const localizacao = str(formData.get("localizacao")).slice(0, 60) || null;
  await db.product.update({ where: { id }, data: { localizacao } });
  revalidatePath(`/produtos/${id}`);
  revalidatePath("/produtos");
}

export async function adjustStock(id: string, formData: FormData) {
  const { user, db } = await requireDbPermission("produtos");
  const tipo = str(formData.get("tipo"));
  if (!["ENTRADA", "SAIDA", "AJUSTE"].includes(tipo))
    throw new Error("Tipo de movimento inválido.");
  const quantidade = parseNumber(formData.get("quantidade"));
  const custoUnit = parseNumber(formData.get("custoUnit"));
  const observacao = optStr(formData.get("observacao"));
  if (quantidade <= 0) throw new Error("Informe uma quantidade maior que zero.");

  await db.$transaction(async (tx) => {
    const p = await tx.product.findUniqueOrThrow({ where: { id } });
    let saldo = p.estoque;
    if (tipo === "ENTRADA") saldo += quantidade;
    else if (tipo === "SAIDA") saldo -= quantidade;
    else saldo = quantidade; // AJUSTE define o saldo absoluto

    const delta = saldo - p.estoque;

    await tx.product.update({ where: { id }, data: { estoque: saldo } });
    await tx.stockMovement.create({
      data: {
        companyId: user.companyId,
        productId: id,
        tipo,
        quantidade: tipo === "AJUSTE" ? Math.abs(delta) : quantidade,
        custoUnit,
        saldoApos: saldo,
        origem: "MANUAL",
        observacao,
      },
    });
  });

  revalidatePath(`/produtos/${id}`);
  revalidatePath("/produtos");
}
