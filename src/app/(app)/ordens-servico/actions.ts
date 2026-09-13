"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDbPermission } from "@/lib/auth";
import type { ScopedTx } from "@/lib/tenant-db";
import { nextSeq } from "@/lib/seq";
import { optStr, parseNumber, str } from "@/lib/format";
import { parseArrayJson, zIdOpc, zMoeda, zQtd } from "@/lib/parse-json";

type Tx = ScopedTx;

const itemRowSchema = z.object({
  tipo: z.enum(["PECA", "SERVICO"]),
  productId: zIdOpc,
  serviceId: zIdOpc,
  descricao: z.string().max(300),
  quantidade: zQtd,
  precoUnit: zMoeda,
  desconto: zMoeda.optional(),
});

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const FLUXO: Record<string, string[]> = {
  ORCAMENTO: ["APROVADA", "CANCELADA"],
  APROVADA: ["EM_EXECUCAO", "CANCELADA"],
  EM_EXECUCAO: ["CONCLUIDA", "CANCELADA"],
  CONCLUIDA: ["ENTREGUE", "CANCELADA"],
  ENTREGUE: [],
  CANCELADA: ["ORCAMENTO"],
};

/** Baixa as peças da OS no estoque (uma única vez) */
async function baixarPecasOS(tx: Tx, companyId: string, osId: string) {
  const os = await tx.serviceOrder.findUniqueOrThrow({
    where: { id: osId },
    include: { items: true },
  });
  if (os.pecasBaixadas) return;
  for (const it of os.items) {
    if (it.tipo !== "PECA" || !it.productId) continue;
    const p = await tx.product.findUnique({ where: { id: it.productId } });
    if (!p) continue;
    const saldo = p.estoque - it.quantidade;
    await tx.product.update({ where: { id: p.id }, data: { estoque: saldo } });
    await tx.stockMovement.create({
      data: {
        companyId,
        productId: p.id,
        tipo: "SAIDA",
        quantidade: it.quantidade,
        custoUnit: p.precoCusto,
        saldoApos: saldo,
        origem: "OS",
        origemId: os.id,
        observacao: `OS nº ${os.numero}`,
      },
    });
  }
  await tx.serviceOrder.update({
    where: { id: osId },
    data: { pecasBaixadas: true },
  });
}

async function estornarPecasOS(tx: Tx, companyId: string, osId: string) {
  const os = await tx.serviceOrder.findUniqueOrThrow({
    where: { id: osId },
    include: { items: true },
  });
  if (!os.pecasBaixadas) return;
  for (const it of os.items) {
    if (it.tipo !== "PECA" || !it.productId) continue;
    const p = await tx.product.findUnique({ where: { id: it.productId } });
    if (!p) continue;
    const saldo = p.estoque + it.quantidade;
    await tx.product.update({ where: { id: p.id }, data: { estoque: saldo } });
    await tx.stockMovement.create({
      data: {
        companyId,
        productId: p.id,
        tipo: "ENTRADA",
        quantidade: it.quantidade,
        custoUnit: p.precoCusto,
        saldoApos: saldo,
        origem: "DEVOLUCAO",
        origemId: os.id,
        observacao: `Cancelamento OS nº ${os.numero}`,
      },
    });
  }
  await tx.serviceOrder.update({
    where: { id: osId },
    data: { pecasBaixadas: false },
  });
}

export async function createServiceOrder(formData: FormData) {
  const { user, db } = await requireDbPermission("ordens_servico");
  const partnerId = optStr(formData.get("partnerId"));
  const descricaoProblema = optStr(formData.get("descricaoProblema"));
  const tecnico = optStr(formData.get("tecnico"));
  const kmEntradaRaw = str(formData.get("kmEntrada"));
  const previsao = optStr(formData.get("previsaoEntrega"));

  const os = await db.$transaction(async (tx) => {
    const numero = await nextSeq(tx, user.companyId, "os");
    return tx.serviceOrder.create({
      data: {
        companyId: user.companyId,
        numero,
        partnerId,
        descricaoProblema,
        tecnico,
        kmEntrada: kmEntradaRaw ? Number(kmEntradaRaw) : null,
        previsaoEntrega: previsao ? new Date(previsao) : null,
      },
    });
  });

  revalidatePath("/ordens-servico");
  redirect(`/ordens-servico/${os.id}`);
}

export async function saveServiceOrder(id: string, formData: FormData) {
  const { user, db } = await requireDbPermission("ordens_servico");
  const os = await db.serviceOrder.findUniqueOrThrow({ where: { id } });
  if (os.status === "ENTREGUE" || os.status === "CANCELADA")
    throw new Error("OS finalizada não pode ser editada.");

  const rows = parseArrayJson(str(formData.get("itens")), itemRowSchema, "itens");

  let totalPecas = 0;
  let totalServicos = 0;
  const items = rows.map((r) => {
    const total = round(r.quantidade * r.precoUnit - (r.desconto ?? 0));
    if (r.tipo === "PECA") totalPecas += total;
    else totalServicos += total;
    return {
      tipo: r.tipo,
      productId: r.productId || null,
      serviceId: r.serviceId || null,
      descricao: r.descricao,
      quantidade: r.quantidade,
      precoUnit: r.precoUnit,
      desconto: round(r.desconto ?? 0),
      total,
    };
  });

  const desconto = parseNumber(formData.get("desconto"));
  const total = round(totalPecas + totalServicos - desconto);

  // veículo
  let vehicleId = optStr(formData.get("vehicleId"));
  const vMarca = optStr(formData.get("veiculoMarca"));
  const vModelo = optStr(formData.get("veiculoModelo"));
  const vPlaca = optStr(formData.get("veiculoPlaca"));
  if (!vehicleId && (vMarca || vModelo || vPlaca) && os.partnerId) {
    const novo = await db.vehicle.create({
      data: {
        companyId: user.companyId,
        partnerId: os.partnerId,
        marca: vMarca,
        modelo: vModelo,
        placa: vPlaca,
        ano: optStr(formData.get("veiculoAno")),
        cor: optStr(formData.get("veiculoCor")),
        km: optStr(formData.get("veiculoKm"))
          ? Number(str(formData.get("veiculoKm")))
          : null,
      },
    });
    vehicleId = novo.id;
  }

  const kmEntradaRaw = str(formData.get("kmEntrada"));

  await db.$transaction(async (tx) => {
    await tx.serviceOrderItem.deleteMany({ where: { serviceOrderId: id } });
    await tx.serviceOrder.update({
      where: { id },
      data: {
        vehicleId,
        tecnico: optStr(formData.get("tecnico")),
        descricaoProblema: optStr(formData.get("descricaoProblema")),
        diagnostico: optStr(formData.get("diagnostico")),
        kmEntrada: kmEntradaRaw ? Number(kmEntradaRaw) : null,
        previsaoEntrega: optStr(formData.get("previsaoEntrega"))
          ? new Date(str(formData.get("previsaoEntrega")))
          : null,
        observacao: optStr(formData.get("observacao")),
        desconto,
        totalPecas: round(totalPecas),
        totalServicos: round(totalServicos),
        total,
        items: { create: items.map((it) => ({ ...it, companyId: user.companyId })) },
      },
    });
  });

  revalidatePath(`/ordens-servico/${id}`);
  revalidatePath("/ordens-servico");
}

export async function setOSCliente(id: string, formData: FormData) {
  const { db } = await requireDbPermission("ordens_servico");
  const partnerId = optStr(formData.get("partnerId"));
  const os = await db.serviceOrder.findUniqueOrThrow({ where: { id } });
  if (os.status !== "ORCAMENTO")
    throw new Error("O cliente só pode ser alterado enquanto a OS está em orçamento.");
  await db.serviceOrder.update({
    where: { id },
    data: {
      partnerId,
      vehicleId: partnerId === os.partnerId ? undefined : null,
    },
  });
  revalidatePath(`/ordens-servico/${id}`);
}

export async function setOSStatus(id: string, novo: string) {
  const { user, db } = await requireDbPermission("ordens_servico");
  const os = await db.serviceOrder.findUniqueOrThrow({ where: { id } });
  if (!(FLUXO[os.status] ?? []).includes(novo))
    throw new Error(`Transição inválida: ${os.status} → ${novo}.`);

  await db.$transaction(async (tx) => {
    if (novo === "CONCLUIDA") {
      await baixarPecasOS(tx, user.companyId, id);
      await tx.serviceOrder.update({
        where: { id },
        data: { status: novo, concluidaEm: new Date() },
      });
    } else if (novo === "CANCELADA") {
      await estornarPecasOS(tx, user.companyId, id);
      await tx.serviceOrder.update({ where: { id }, data: { status: novo } });
    } else {
      await tx.serviceOrder.update({ where: { id }, data: { status: novo } });
    }
  });

  revalidatePath(`/ordens-servico/${id}`);
  revalidatePath("/ordens-servico");
  revalidatePath("/");
}

/** Gera nota(s) fiscal(is) a partir da OS (em rascunho, vinculadas à OS) */
export async function faturarOS(id: string, formData: FormData) {
  const { user, db } = await requireDbPermission("ordens_servico");
  const gerarNfse = str(formData.get("gerarNfse")) === "1";
  const gerarNfe = str(formData.get("gerarNfe")) === "1";
  if (!gerarNfse && !gerarNfe)
    throw new Error("Escolha ao menos um tipo de nota para gerar.");

  const os = await db.serviceOrder.findUniqueOrThrow({
    where: { id },
    include: { items: true, partner: true },
  });
  const company = await db.company.findUniqueOrThrow({ where: { id: user.companyId } });

  const servicos = os.items.filter((i) => i.tipo === "SERVICO");
  const pecas = os.items.filter((i) => i.tipo === "PECA");

  const criadas: string[] = [];

  await db.$transaction(async (tx) => {
    if (gerarNfse && servicos.length > 0) {
      const jaTem = await tx.invoice.findFirst({
        where: { serviceOrderId: id, tipo: "NFSE", status: { not: "CANCELADA" } },
      });
      if (!jaTem) {
        const serviceIds = servicos.map((s) => s.serviceId).filter(Boolean) as string[];
        const svcCat = await tx.service.findMany({ where: { id: { in: serviceIds } } });
        let valorServicos = 0;
        let valorIss = 0;
        const serviceItems = servicos.map((s) => {
          const svc = svcCat.find((x) => x.id === s.serviceId);
          const aliq = svc?.aliquotaIss ?? 0;
          const iss = round((s.total * aliq) / 100);
          valorServicos += s.total;
          valorIss += iss;
          return {
            serviceId: s.serviceId,
            descricao: s.descricao,
            itemListaServico: svc?.itemListaServico ?? null,
            quantidade: s.quantidade,
            valorUnit: s.precoUnit,
            valorTotal: s.total,
            aliquotaIss: aliq,
            valorIss: iss,
            issRetido: svc?.issRetido ?? false,
          };
        });
        const numero = await nextSeq(tx, user.companyId, `nfse-serie-${company.serieNFSe}`);
        const nf = await tx.invoice.create({
          data: {
            companyId: user.companyId,
            tipo: "NFSE",
            numero,
            serie: company.serieNFSe,
            status: "RASCUNHO",
            ambiente: company.ambienteFiscal,
            naturezaOperacao: "Prestação de serviço",
            partnerId: os.partnerId,
            serviceOrderId: id,
            valorServicos: round(valorServicos),
            valorIss: round(valorIss),
            valorTotal: round(valorServicos),
            serviceItems: {
              create: serviceItems.map((it) => ({ ...it, companyId: user.companyId })),
            },
          },
        });
        criadas.push(nf.id);
      }
    }

    if (gerarNfe && pecas.length > 0) {
      const jaTem = await tx.invoice.findFirst({
        where: { serviceOrderId: id, tipo: "NFE", status: { not: "CANCELADA" } },
      });
      if (!jaTem) {
        const prodIds = pecas.map((p) => p.productId).filter(Boolean) as string[];
        const prodCat = await tx.product.findMany({ where: { id: { in: prodIds } } });
        let valorProdutos = 0;
        const items = pecas.map((p) => {
          const prod = prodCat.find((x) => x.id === p.productId);
          valorProdutos += p.total;
          return {
            productId: p.productId,
            codigo: prod?.sku ?? "SEM-COD",
            descricao: p.descricao,
            ncm: prod?.ncm ?? null,
            cfop: prod?.cfopVenda ?? "5102",
            unidade: prod?.unidade ?? "UN",
            quantidade: p.quantidade,
            valorUnit: p.precoUnit,
            desconto: p.desconto,
            valorTotal: p.total,
            cstIcms: prod?.icmsCst ?? "102",
            aliquotaIcms: 0,
            valorIcms: 0,
          };
        });
        const numero = await nextSeq(tx, user.companyId, `nfe-serie-${company.serieNFe}`);
        const nf = await tx.invoice.create({
          data: {
            companyId: user.companyId,
            tipo: "NFE",
            numero,
            serie: company.serieNFe,
            status: "RASCUNHO",
            ambiente: company.ambienteFiscal,
            naturezaOperacao: "Venda de mercadoria (OS)",
            partnerId: os.partnerId,
            serviceOrderId: id,
            baixaEstoque: false, // estoque controlado pela OS
            valorProdutos: round(valorProdutos),
            valorTotal: round(valorProdutos),
            items: { create: items.map((it) => ({ ...it, companyId: user.companyId })) },
          },
        });
        criadas.push(nf.id);
        // garante baixa de estoque das peças
        await baixarPecasOS(tx, user.companyId, id);
      }
    }
  });

  revalidatePath(`/ordens-servico/${id}`);
  revalidatePath("/notas");
  if (criadas.length === 1) redirect(`/notas/${criadas[0]}`);
  redirect(`/ordens-servico/${id}`);
}

export async function deleteServiceOrder(id: string) {
  const { db } = await requireDbPermission("ordens_servico");
  const os = await db.serviceOrder.findUniqueOrThrow({ where: { id } });
  if (!["ORCAMENTO", "CANCELADA"].includes(os.status))
    throw new Error("Só é possível excluir OS em orçamento ou cancelada.");
  const notas = await db.invoice.count({ where: { serviceOrderId: id } });
  if (notas > 0)
    throw new Error("Existem notas vinculadas a esta OS. Cancele-as antes.");
  await db.serviceOrder.delete({ where: { id } });
  revalidatePath("/ordens-servico");
  redirect("/ordens-servico");
}
