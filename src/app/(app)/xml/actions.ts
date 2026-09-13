"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDbPermission } from "@/lib/auth";
import type { ScopedDb } from "@/lib/tenant-db";
import { str } from "@/lib/format";
import { parseNfeXml } from "@/lib/xml/parse-nfe";
import { gerarSkuProduto } from "@/lib/produto-sku";

/** Importa um ou mais arquivos XML (NF-e / NFS-e) de entrada */
export async function importXml(formData: FormData) {
  const { user, db } = await requireDbPermission("xml");
  const arquivos = formData.getAll("arquivos").filter((f): f is File => f instanceof File);
  if (arquivos.length === 0) throw new Error("Selecione ao menos um arquivo XML.");

  let importados = 0;
  let duplicados = 0;
  let ultimoId = "";

  for (const file of arquivos) {
    if (file.size > 5 * 1024 * 1024)
      throw new Error(`Arquivo "${file.name}" muito grande (máx. 5MB para XML).`);
    const conteudo = await file.text();
    if (!conteudo.trim()) continue;
    const parsed = parseNfeXml(conteudo);

    if (parsed.chaveAcesso) {
      // findFirst (não findUnique) para o filtro de empresa ser aplicado pelo
      // client escopado — a duplicidade é checada só dentro da própria empresa.
      const existente = await db.xmlDocument.findFirst({
        where: { chaveAcesso: parsed.chaveAcesso },
      });
      if (existente) {
        duplicados++;
        ultimoId = existente.id;
        continue;
      }
    }

    const doc = await db.xmlDocument.create({
      data: {
        companyId: user.companyId,
        direcao: "ENTRADA",
        tipo: parsed.tipo === "DESCONHECIDO" ? "NFE" : parsed.tipo,
        chaveAcesso: parsed.chaveAcesso,
        numero: parsed.numero,
        serie: parsed.serie,
        emitenteNome: parsed.emitenteNome,
        emitenteCnpj: parsed.emitenteCnpj,
        destinatarioNome: parsed.destinatarioNome,
        destinatarioCnpj: parsed.destinatarioCnpj,
        dataEmissao: parsed.dataEmissao,
        valorTotal: parsed.valorTotal,
        status: "IMPORTADO",
        conteudo,
        origemArquivo: file.name,
        items: {
          create: parsed.items.map((it) => ({
            companyId: user.companyId,
            codigo: it.codigo,
            descricao: it.descricao,
            ncm: it.ncm,
            cfop: it.cfop,
            unidade: it.unidade,
            quantidade: it.quantidade,
            valorUnit: it.valorUnit,
            valorTotal: it.valorTotal,
          })),
        },
      },
    });
    importados++;
    ultimoId = doc.id;

    // tenta vincular automaticamente por SKU / código de barras
    await autoVincular(db, doc.id);
  }

  revalidatePath("/xml");
  if (importados === 1 && duplicados === 0) redirect(`/xml/${ultimoId}`);
  redirect(
    `/xml?msg=${encodeURIComponent(
      `${importados} importado(s), ${duplicados} já existente(s)`,
    )}`,
  );
}

async function autoVincular(db: ScopedDb, docId: string) {
  const itens = await db.xmlItem.findMany({ where: { xmlDocumentId: docId } });
  for (const it of itens) {
    if (!it.codigo) continue;
    const prod = await db.product.findFirst({
      where: { OR: [{ sku: it.codigo }, { codigoBarras: it.codigo }] },
    });
    if (prod) {
      await db.xmlItem.update({
        where: { id: it.id },
        data: { productId: prod.id, vinculado: true },
      });
    }
  }
}

/** Vincula um item do XML a um produto existente ou cria um novo produto */
export async function vincularItem(itemId: string, formData: FormData) {
  const { user, db } = await requireDbPermission("xml");
  const productId = str(formData.get("productId"));
  const criarNovo = str(formData.get("criarNovo")) === "1";
  const item = await db.xmlItem.findUniqueOrThrow({ where: { id: itemId } });

  let finalProductId = productId;

  if (criarNovo) {
    // Usa o código do fornecedor (ajuda a casar em importações futuras);
    // se a nota não trouxe código, gera um automático.
    const sku = item.codigo || (await gerarSkuProduto(db, user.companyId));
    const existe = await db.product.findUnique({
      where: { companyId_sku: { companyId: user.companyId, sku } },
    });
    const novo = existe
      ? existe
      : await db.product.create({
          data: {
            companyId: user.companyId,
            sku,
            nome: item.descricao,
            unidade: item.unidade || "UN",
            precoCusto: item.valorUnit,
            precoVenda: Math.round(item.valorUnit * 1.4 * 100) / 100,
            ncm: item.ncm,
            estoque: 0,
          },
        });
    finalProductId = novo.id;
  }

  if (!finalProductId) throw new Error("Selecione um produto ou marque 'criar novo'.");

  await db.xmlItem.update({
    where: { id: itemId },
    data: { productId: finalProductId, vinculado: true },
  });
  const doc = await db.xmlItem.findUniqueOrThrow({ where: { id: itemId } });
  revalidatePath(`/xml/${doc.xmlDocumentId}`);
}

/** Lança as quantidades do XML como entrada de estoque nos produtos vinculados */
export async function lancarEstoque(docId: string) {
  const { user, db } = await requireDbPermission("xml");
  const doc = await db.xmlDocument.findUniqueOrThrow({
    where: { id: docId },
    include: { items: true },
  });
  if (doc.status === "LANCADO")
    throw new Error("Este XML já foi lançado em estoque.");

  const vinculados = doc.items.filter((i) => i.productId && i.vinculado);
  if (vinculados.length === 0)
    throw new Error("Nenhum item vinculado a produto. Vincule os itens primeiro.");

  await db.$transaction(async (tx) => {
    for (const it of vinculados) {
      const p = await tx.product.findUniqueOrThrow({ where: { id: it.productId! } });
      const saldo = p.estoque + it.quantidade;
      await tx.product.update({
        where: { id: p.id },
        data: {
          estoque: saldo,
          precoCusto: it.valorUnit || p.precoCusto,
        },
      });
      await tx.stockMovement.create({
        data: {
          companyId: user.companyId,
          productId: p.id,
          tipo: "ENTRADA",
          quantidade: it.quantidade,
          custoUnit: it.valorUnit,
          saldoApos: saldo,
          origem: "NFE_ENTRADA",
          origemId: doc.id,
          observacao: `XML ${doc.numero ?? ""} - ${doc.emitenteNome ?? ""}`.trim(),
        },
      });
    }
    await tx.xmlDocument.update({
      where: { id: docId },
      data: { status: "LANCADO" },
    });

    // conta a pagar para o fornecedor
    await tx.financialEntry.create({
      data: {
        companyId: user.companyId,
        tipo: "PAGAR",
        status: "ABERTO",
        descricao: `Compra XML ${doc.numero ?? ""} - ${doc.emitenteNome ?? "fornecedor"}`,
        categoria: "Compras",
        valor: doc.valorTotal,
        vencimento: new Date(),
      },
    });
  });

  revalidatePath(`/xml/${docId}`);
  revalidatePath("/xml");
  revalidatePath("/produtos");
}

export async function deleteXml(docId: string) {
  const { db } = await requireDbPermission("xml");
  const doc = await db.xmlDocument.findUniqueOrThrow({ where: { id: docId } });
  if (doc.status === "LANCADO")
    throw new Error("Não é possível excluir um XML já lançado em estoque.");
  await db.xmlDocument.delete({ where: { id: docId } });
  revalidatePath("/xml");
  redirect("/xml");
}
