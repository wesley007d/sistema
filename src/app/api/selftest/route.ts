import { prisma } from "@/lib/db";
import { getFiscalProvider } from "@/lib/fiscal";
import type { InvoiceFull } from "@/lib/fiscal/types";
import { parseNfeXml } from "@/lib/xml/parse-nfe";
import { mod11, gerarChaveAcesso } from "@/lib/fiscal/chave";
import {
  can,
  getCurrentUser,
  hashPassword,
  isOwner,
  permissionsOf,
  verifyPassword,
} from "@/lib/auth";

/**
 * Diagnóstico (somente desenvolvimento + dono da plataforma logado): chave de
 * acesso, emissão local, parser de XML e regras de permissão. Não muta o banco
 * e não confirma senhas de seed.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (process.env.NODE_ENV === "production" || !user || !isOwner(user)) {
    return new Response("Não encontrado.", { status: 404 });
  }
  const out: Record<string, unknown> = {};

  // --- fiscal: chave de acesso ---
  const chave = gerarChaveAcesso({
    uf: "35",
    dataEmissao: new Date("2026-08-01"),
    cnpj: "12345678000199",
    modelo: "55",
    serie: 1,
    numero: 123,
    codigoNumerico: 12345678,
  });
  out.chave = chave;
  out.chaveLen = chave.length;
  out.dvOk = mod11(chave.slice(0, 43)) === Number(chave[43]);

  // --- fiscal: emissão local + round-trip ---
  const company =
    (await prisma.company.findFirst({ where: { id: "default" } })) ??
    (await prisma.company.findFirst());
  if (!company) {
    return Response.json({ erro: "Nenhuma empresa cadastrada para o teste." });
  }
  const fakeInvoice = {
    id: "selftest",
    tipo: "NFE",
    numero: 999999,
    serie: 1,
    status: "RASCUNHO",
    ambiente: "HOMOLOGACAO",
    naturezaOperacao: "Venda de mercadoria",
    partnerId: null,
    partner: {
      nome: "Cliente Teste",
      cpfCnpj: "39053344705",
      logradouro: "Rua A",
      numero: "1",
      bairro: "Centro",
      municipio: "São Paulo",
      uf: "SP",
      cep: "01001000",
      codMunicipio: "3550308",
      indicadorIe: "9",
    },
    valorProdutos: 100,
    valorServicos: 0,
    valorDesconto: 0,
    valorFrete: 0,
    valorIcms: 0,
    valorIss: 0,
    valorPis: 0,
    valorCofins: 0,
    valorTotal: 100,
    items: [
      {
        id: "i1",
        codigo: "PST-125",
        descricao: "Pastilha de freio",
        ncm: "87141000",
        cfop: "5102",
        unidade: "UN",
        quantidade: 2,
        valorUnit: 50,
        desconto: 0,
        valorTotal: 100,
        cstIcms: "102",
        aliquotaIcms: 0,
        valorIcms: 0,
      },
    ],
    serviceItems: [],
  } as unknown as InvoiceFull;

  const provider = getFiscalProvider();
  out.fiscal = {
    provider: provider.name,
    ambiente: process.env.FISCAL_AMBIENTE ?? null,
    plugnotasTokenConfigurado: Boolean(process.env.PLUGNOTAS_TOKEN),
    suportaConsulta: typeof provider.consultar === "function",
  };

  const result = await provider.emitNfe(fakeInvoice, company);
  out.emit = {
    status: result.status,
    chave: result.chaveAcesso,
    motivo: result.motivoRejeicao,
    xmlLen: result.xml?.length ?? 0,
  };
  if (result.xml) {
    const parsed = parseNfeXml(result.xml);
    out.parse = {
      tipo: parsed.tipo,
      numero: parsed.numero,
      emitente: parsed.emitenteNome,
      itens: parsed.items.length,
      valorTotal: parsed.valorTotal,
    };
  }

  // --- auth (só checa o mecanismo de hash e a lógica de permissão; NÃO
  // confirma senhas de usuários de seed) ---
  const h = await hashPassword("segredo123");
  const admin = await prisma.user.findUnique({ where: { email: "admin@local" } });
  const func = await prisma.user.findUnique({ where: { email: "balcao@local" } });
  out.auth = {
    hashRoundTrip:
      (await verifyPassword("segredo123", h)) &&
      !(await verifyPassword("errada", h)),
    adminPerms: admin ? permissionsOf(admin).length : null,
    adminPodeNotas: admin ? can(admin, "notas") : null,
    funcPerms: func ? permissionsOf(func) : null,
    funcPodeNotas: func ? can(func, "notas") : null,
    funcPodeProdutos: func ? can(func, "produtos") : null,
    funcPodeDashboard: func ? can(func, "dashboard") : null,
  };

  return Response.json(out);
}
