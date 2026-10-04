"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDbPermission } from "@/lib/auth";
import type { ScopedDb } from "@/lib/tenant-db";
import { parseNumber, str } from "@/lib/format";
import { FORMAS_TPAG, parseNfeXml } from "@/lib/xml/parse-nfe";
import { getDefaultCashAccount } from "@/lib/finance";
import { gerarSkuProduto } from "@/lib/produto-sku";
import { marcaPeloGtin } from "@/lib/marca-ean";

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

/**
 * Código de barras de cada item, relido do XML guardado (o item no banco não
 * tem essa coluna). Chave: código + descrição do item.
 */
function gtinsDoXml(conteudo: string | null) {
  const mapa = new Map<string, string>();
  if (!conteudo) return mapa;
  for (const it of parseNfeXml(conteudo).items)
    if (it.gtin) mapa.set(`${it.codigo}|${it.descricao}`, it.gtin);
  return mapa;
}

const chaveItem = (it: { codigo: string | null; descricao: string }) =>
  `${it.codigo}|${it.descricao}`;

async function autoVincular(db: ScopedDb, docId: string) {
  const doc = await db.xmlDocument.findUniqueOrThrow({
    where: { id: docId },
    include: { items: true },
  });
  const gtins = gtinsDoXml(doc.conteudo);
  for (const it of doc.items) {
    const gtin = gtins.get(chaveItem(it));
    const ou = [
      ...(it.codigo ? [{ sku: it.codigo }, { codigoBarras: it.codigo }] : []),
      ...(gtin ? [{ codigoBarras: gtin }] : []),
    ];
    if (ou.length === 0) continue;
    const prod = await db.product.findFirst({ where: { OR: ou } });
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
  const item = await db.xmlItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { xmlDocument: { select: { conteudo: true } } },
  });

  let finalProductId = productId;

  if (criarNovo) {
    const gtin = gtinsDoXml(item.xmlDocument.conteudo).get(chaveItem(item)) ?? null;
    finalProductId = await produtoDoItem(db, user.companyId, item, gtin);
  }

  if (!finalProductId) throw new Error("Selecione um produto ou marque 'criar novo'.");

  await db.xmlItem.update({
    where: { id: itemId },
    data: { productId: finalProductId, vinculado: true },
  });
  const doc = await db.xmlItem.findUniqueOrThrow({ where: { id: itemId } });
  revalidatePath(`/xml/${doc.xmlDocumentId}`);
}

/** Cria um produto novo para cada item ainda não vinculado da nota, de uma vez */
export async function criarTodosNovos(docId: string) {
  const { user, db } = await requireDbPermission("xml");
  const doc = await db.xmlDocument.findUniqueOrThrow({
    where: { id: docId },
    include: { items: true },
  });
  if (doc.status === "LANCADO")
    throw new Error("Este XML já foi lançado em estoque.");

  const gtins = gtinsDoXml(doc.conteudo);
  for (const item of doc.items.filter((i) => !i.vinculado)) {
    const gtin = gtins.get(chaveItem(item)) ?? null;
    const productId = await produtoDoItem(db, user.companyId, item, gtin);
    await db.xmlItem.update({
      where: { id: item.id },
      data: { productId, vinculado: true },
    });
  }
  revalidatePath(`/xml/${docId}`);
}

/**
 * Produto para um item da nota: usa o código do fornecedor como SKU (ajuda a
 * casar em importações futuras) ou gera um automático se a nota não trouxe
 * código. Se já existe produto com esse SKU, reaproveita. Grava o código de
 * barras da nota e herda a marca de outro produto do mesmo fabricante.
 */
async function produtoDoItem(
  db: ScopedDb,
  companyId: string,
  item: {
    codigo: string | null;
    descricao: string;
    unidade: string | null;
    valorUnit: number;
    ncm: string | null;
  },
  gtin: string | null,
) {
  const sku = item.codigo || (await gerarSkuProduto(db, companyId));
  const existe = await db.product.findUnique({
    where: { companyId_sku: { companyId, sku } },
  });
  if (existe) {
    if (gtin && (!existe.codigoBarras || !existe.marca)) {
      const marca = existe.marca || (await marcaPeloGtin(db, gtin));
      await db.product.update({
        where: { id: existe.id },
        data: { codigoBarras: existe.codigoBarras || gtin, marca },
      });
    }
    return existe.id;
  }
  const novo = await db.product.create({
    data: {
      companyId,
      sku,
      nome: item.descricao,
      codigoBarras: gtin,
      marca: await marcaPeloGtin(db, gtin),
      unidade: item.unidade || "UN",
      precoCusto: item.valorUnit,
      precoVenda: Math.round(item.valorUnit * 1.4 * 100) / 100,
      ncm: item.ncm,
      estoque: 0,
    },
  });
  return novo.id;
}

/**
 * Lança os itens vinculados no estoque e gera o financeiro da compra:
 * - PAGO: título já quitado, com a saída registrada na conta escolhida;
 * - PRAZO: um título a pagar por parcela da nota (ou um só, no vencimento
 *   informado, quando a nota não traz parcelas).
 */
export async function lancarEstoque(docId: string, formData: FormData) {
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

  const pagamento = str(formData.get("pagamento")) === "PAGO" ? "PAGO" : "PRAZO";
  // % sobre o custo para já deixar o preço de venda pronto; vazio = não mexe
  const margemStr = str(formData.get("margem"));
  const margem = margemStr ? parseNumber(margemStr) : null;
  if (margem != null && (margem < 0 || margem > 1000))
    throw new Error("A porcentagem de venda precisa estar entre 0% e 1000%.");
  const accountId = str(formData.get("accountId"));
  const vencStr = str(formData.get("vencimento"));
  const vencimento = /^\d{4}-\d{2}-\d{2}$/.test(vencStr)
    ? new Date(`${vencStr}T12:00:00`)
    : new Date();
  const parsed = doc.conteudo ? parseNfeXml(doc.conteudo) : null;
  const duplicatas = parsed?.duplicatas ?? [];
  const forma =
    parsed?.formasPagamento
      .map((f) => FORMAS_TPAG[f])
      .filter((f) => f && f !== "Sem pagamento")
      .join(", ") || null;

  // Nota grande (200+ itens) com o banco remoto: 1 comando por item no
  // estoque e as movimentações gravadas de uma vez no fim, com folga de tempo.
  await db.$transaction(async (tx) => {
    const observacao = `XML ${doc.numero ?? ""} - ${doc.emitenteNome ?? ""}`.trim();
    const movimentos = [];
    for (const it of vinculados) {
      const p = await tx.product.update({
        where: { id: it.productId! },
        data: {
          estoque: { increment: it.quantidade },
          ...(it.valorUnit ? { precoCusto: it.valorUnit } : {}),
          ...(it.valorUnit && margem != null
            ? { precoVenda: Math.round(it.valorUnit * (1 + margem / 100) * 100) / 100 }
            : {}),
        },
        select: { id: true, estoque: true },
      });
      movimentos.push({
        companyId: user.companyId,
        productId: p.id,
        tipo: "ENTRADA",
        quantidade: it.quantidade,
        custoUnit: it.valorUnit,
        saldoApos: p.estoque,
        origem: "NFE_ENTRADA",
        origemId: doc.id,
        observacao,
      });
    }
    await tx.stockMovement.createMany({ data: movimentos });
    await tx.xmlDocument.update({
      where: { id: docId },
      data: { status: "LANCADO" },
    });

    const descricao = `Compra XML ${doc.numero ?? ""} - ${doc.emitenteNome ?? "fornecedor"}`;

    if (pagamento === "PAGO") {
      const conta = accountId
        ? await tx.cashAccount.findFirstOrThrow({ where: { id: accountId, ativo: true } })
        : await getDefaultCashAccount(user.companyId, tx);
      const agora = new Date();
      const entry = await tx.financialEntry.create({
        data: {
          companyId: user.companyId,
          tipo: "PAGAR",
          status: "PAGO",
          descricao,
          categoria: "Compras",
          valor: doc.valorTotal,
          valorPago: doc.valorTotal,
          vencimento: agora,
          pagoEm: agora,
          formaPagamento: forma,
        },
      });
      const settlement = await tx.settlement.create({
        data: {
          companyId: user.companyId,
          entryId: entry.id,
          accountId: conta.id,
          valor: doc.valorTotal,
          data: agora,
          formaPagamento: forma,
        },
      });
      await tx.cashTransaction.create({
        data: {
          companyId: user.companyId,
          accountId: conta.id,
          data: agora,
          tipo: "SAIDA",
          valor: doc.valorTotal,
          categoria: "Compras",
          descricao: `Baixa: ${descricao}`,
          origem: "BAIXA_TITULO",
          settlementId: settlement.id,
        },
      });
    } else if (duplicatas.length > 0) {
      for (const [i, d] of duplicatas.entries()) {
        await tx.financialEntry.create({
          data: {
            companyId: user.companyId,
            tipo: "PAGAR",
            status: "ABERTO",
            descricao: `${descricao} (parcela ${i + 1}/${duplicatas.length})`,
            categoria: "Compras",
            valor: d.valor,
            vencimento: d.vencimento ?? vencimento,
            formaPagamento: forma,
          },
        });
      }
    } else {
      await tx.financialEntry.create({
        data: {
          companyId: user.companyId,
          tipo: "PAGAR",
          status: "ABERTO",
          descricao,
          categoria: "Compras",
          valor: doc.valorTotal,
          vencimento,
          formaPagamento: forma,
        },
      });
    }
  }, { timeout: 120_000, maxWait: 10_000 });

  revalidatePath(`/xml/${docId}`);
  revalidatePath("/xml");
  revalidatePath("/produtos");
}

/**
 * Desfaz o lançamento de um XML de compra: tira do estoque o que a nota deu
 * entrada, apaga os produtos que só existiam por causa dela (sem outra
 * movimentação, venda, OS ou nota) e remove o financeiro gerado (títulos,
 * baixas e saídas de caixa). A nota volta para "importado" e pode ser excluída.
 */
export async function desfazerLancamento(docId: string) {
  const { user, db } = await requireDbPermission("xml");
  const doc = await db.xmlDocument.findUniqueOrThrow({
    where: { id: docId },
    include: { items: true },
  });
  if (doc.status !== "LANCADO") throw new Error("Este XML não está lançado.");

  await db.$transaction(
    async (tx) => {
      const movs = await tx.stockMovement.findMany({
        where: { origem: "NFE_ENTRADA", origemId: doc.id },
      });
      for (const m of movs) {
        const p = await tx.product.findUnique({ where: { id: m.productId } });
        if (!p) continue;
        const [outrosMovs, vendas, os, notas, outrosXml] = await Promise.all([
          tx.stockMovement.count({ where: { productId: p.id, id: { not: m.id } } }),
          tx.saleItem.count({ where: { productId: p.id } }),
          tx.serviceOrderItem.count({ where: { productId: p.id } }),
          tx.invoiceItem.count({ where: { productId: p.id } }),
          tx.xmlItem.count({ where: { productId: p.id, xmlDocumentId: { not: doc.id } } }),
        ]);
        if (outrosMovs + vendas + os + notas + outrosXml === 0) {
          // produto criado só por esta nota: some junto
          await tx.xmlItem.updateMany({
            where: { xmlDocumentId: doc.id, productId: p.id },
            data: { productId: null, vinculado: false },
          });
          await tx.product.delete({ where: { id: p.id } });
          if (p.imagemUrl?.startsWith("/api/files/"))
            await tx.uploadedFile.deleteMany({
              where: { id: p.imagemUrl.slice("/api/files/".length) },
            });
        } else {
          const saldo = p.estoque - m.quantidade;
          await tx.product.update({ where: { id: p.id }, data: { estoque: saldo } });
          await tx.stockMovement.create({
            data: {
              companyId: user.companyId,
              productId: p.id,
              tipo: "SAIDA",
              quantidade: m.quantidade,
              custoUnit: m.custoUnit,
              saldoApos: saldo,
              origem: "ESTORNO_NFE",
              origemId: doc.id,
              observacao: `Estorno XML ${doc.numero ?? ""} - ${doc.emitenteNome ?? ""}`.trim(),
            },
          });
        }
      }

      // financeiro gerado no lançamento (mesma descrição usada em lancarEstoque)
      const descricao = `Compra XML ${doc.numero ?? ""} - ${doc.emitenteNome ?? "fornecedor"}`;
      const titulos = await tx.financialEntry.findMany({
        where: {
          tipo: "PAGAR",
          categoria: "Compras",
          OR: [{ descricao }, { descricao: { startsWith: `${descricao} (parcela ` } }],
        },
        select: { id: true, settlements: { select: { id: true } } },
      });
      const idsBaixas = titulos.flatMap((t) => t.settlements.map((b) => b.id));
      if (idsBaixas.length > 0)
        await tx.cashTransaction.deleteMany({ where: { settlementId: { in: idsBaixas } } });
      await tx.financialEntry.deleteMany({
        where: { id: { in: titulos.map((t) => t.id) } },
      });

      await tx.xmlDocument.update({ where: { id: doc.id }, data: { status: "IMPORTADO" } });
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  revalidatePath(`/xml/${docId}`);
  revalidatePath("/xml");
  revalidatePath("/produtos");
  revalidatePath("/financeiro");
}

export async function deleteXml(docId: string) {
  const { db } = await requireDbPermission("xml");
  const doc = await db.xmlDocument.findUniqueOrThrow({
    where: { id: docId },
    include: { items: true },
  });
  if (doc.status === "LANCADO")
    throw new Error("Desfaça o lançamento antes de excluir este XML.");

  // produtos criados ao vincular itens desta nota ("criar novo") e nunca
  // usados em mais nada saem junto com ela
  const ids = [...new Set(doc.items.map((i) => i.productId).filter((x): x is string => !!x))];
  await db.$transaction(async (tx) => {
    await tx.xmlDocument.delete({ where: { id: docId } });
    for (const id of ids) {
      const p = await tx.product.findUnique({ where: { id } });
      if (!p || p.createdAt < doc.createdAt || p.estoque !== 0) continue;
      const usos =
        (await tx.stockMovement.count({ where: { productId: id } })) +
        (await tx.saleItem.count({ where: { productId: id } })) +
        (await tx.serviceOrderItem.count({ where: { productId: id } })) +
        (await tx.invoiceItem.count({ where: { productId: id } })) +
        (await tx.xmlItem.count({ where: { productId: id } }));
      if (usos > 0) continue;
      await tx.product.delete({ where: { id } });
      if (p.imagemUrl?.startsWith("/api/files/"))
        await tx.uploadedFile.deleteMany({
          where: { id: p.imagemUrl.slice("/api/files/".length) },
        });
    }
  }, { timeout: 120_000, maxWait: 10_000 });
  revalidatePath("/xml");
  redirect("/xml");
}
