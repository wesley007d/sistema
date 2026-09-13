import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

// Nunca semear dados de demonstração (com senhas conhecidas) em produção.
if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PROD !== "1") {
  console.error(
    "Seed bloqueado em produção. Defina SEED_ALLOW_PROD=1 se realmente quiser.",
  );
  process.exit(1);
}

// Senhas dos usuários de exemplo: use variáveis de ambiente em qualquer
// ambiente compartilhado. Os defaults só servem para dev local.
const ADMIN_SENHA = process.env.SEED_ADMIN_PASSWORD || "admin123";
const BALCAO_SENHA = process.env.SEED_BALCAO_PASSWORD || "balcao123";
if (!process.env.SEED_ADMIN_PASSWORD) {
  console.warn(
    "[seed] SEED_ADMIN_PASSWORD não definida — usando senha padrão de DEV. " +
      "Troque antes de expor este ambiente.",
  );
}

function hashPassword(senha) {
  const salt = randomBytes(16);
  const hash = scryptSync(senha, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

const ALL_MODULES = [
  "dashboard", "produtos", "servicos", "parceiros", "vendas",
  "ordens_servico", "notas", "xml", "financeiro", "configuracoes",
];

async function main() {
  const companyId = "default";

  await prisma.company.upsert({
    where: { id: companyId },
    update: {},
    create: {
      id: companyId,
      razaoSocial: "Moto Peças e Serviços Silva LTDA",
      nomeFantasia: "MotoSilva",
      cnpj: "12345678000199",
      ie: "1234567890",
      im: "987654",
      regimeTributario: "SIMPLES",
      crt: 1,
      email: "contato@motosilva.com.br",
      telefone: "1133224455",
      cep: "01001000",
      logradouro: "Praça da Sé",
      numero: "100",
      bairro: "Sé",
      municipio: "São Paulo",
      uf: "SP",
      codMunicipio: "3550308",
      ambienteFiscal: "HOMOLOGACAO",
    },
  });

  // conta de caixa padrão
  const contas = await prisma.cashAccount.count({ where: { companyId } });
  if (contas === 0) {
    await prisma.cashAccount.create({
      data: { companyId, nome: "Caixa", tipo: "CAIXA", saldoInicial: 0 },
    });
  }

  // usuário administrador padrão
  await prisma.user.upsert({
    where: { email: "admin@local" },
    update: {},
    create: {
      companyId,
      nome: "Administrador",
      email: "admin@local",
      senhaHash: hashPassword(ADMIN_SENHA),
      role: "ADMIN",
      permissoes: JSON.stringify(ALL_MODULES),
    },
  });

  // funcionário de exemplo: só balcão (produtos, OS, vendas)
  await prisma.user.upsert({
    where: { email: "balcao@local" },
    update: {},
    create: {
      companyId,
      nome: "Funcionário Balcão",
      email: "balcao@local",
      senhaHash: hashPassword(BALCAO_SENHA),
      role: "FUNCIONARIO",
      permissoes: JSON.stringify(["produtos", "parceiros", "ordens_servico", "vendas"]),
    },
  });

  const cats = {};
  for (const nome of ["Motor", "Freios", "Elétrica", "Transmissão", "Acessórios"]) {
    cats[nome] = await prisma.category.upsert({
      where: { companyId_nome: { companyId, nome } },
      update: {},
      create: { companyId, nome },
    });
  }

  const produtos = [
    ["PST-125", "Pastilha de freio dianteira CG 125", "Freios", 18, 39.9, 25, 5],
    ["VLA-0007", "Vela de ignição NGK", "Elétrica", 9.5, 24.9, 40, 10],
    ["OLE-1L", "Óleo motor 20W50 mineral 1L", "Motor", 14, 32.0, 60, 15],
    ["REL-428H", "Relação/kit transmissão 428H", "Transmissão", 85, 179.9, 8, 3],
    ["BAT-5AH", "Bateria 12V 5Ah selada", "Elétrica", 95, 189.0, 6, 2],
    ["FLT-AR01", "Filtro de ar esportivo", "Motor", 22, 54.9, 12, 4],
    ["ESP-RET", "Espelho retrovisor par universal", "Acessórios", 17, 44.9, 20, 5],
    ["CAB-ACL", "Cabo de acelerador CG/Fan", "Motor", 8, 21.9, 15, 5],
  ];
  for (const [sku, nome, cat, custo, venda, est, min] of produtos) {
    await prisma.product.upsert({
      where: { companyId_sku: { companyId, sku } },
      update: {},
      create: {
        companyId,
        sku,
        nome,
        categoryId: cats[cat].id,
        precoCusto: custo,
        precoVenda: venda,
        estoque: est,
        estoqueMinimo: min,
        unidade: "UN",
        ncm: "87141000",
        cfopVenda: "5102",
      },
    });
  }

  const servicos = [
    ["S01", "Troca de óleo e filtro", 45, "14.01", 3],
    ["S02", "Revisão completa 10.000 km", 180, "14.01", 3],
    ["S03", "Ajuste e lubrificação de relação", 35, "14.01", 3],
    ["S04", "Troca de pastilhas de freio (mão de obra)", 40, "14.01", 3],
  ];
  for (const [codigo, nome, preco, lc, iss] of servicos) {
    await prisma.service.upsert({
      where: { companyId_codigo: { companyId, codigo } },
      update: {},
      create: { companyId, codigo, nome, preco, itemListaServico: lc, aliquotaIss: iss },
    });
  }

  await prisma.partner.upsert({
    where: { id: "seed-cliente-1" },
    update: {},
    create: {
      id: "seed-cliente-1",
      companyId,
      tipo: "CLIENTE",
      pessoa: "FISICA",
      nome: "João da Moto",
      cpfCnpj: "39053344705",
      email: "joao@example.com",
      celular: "11999998888",
      cep: "01310000",
      logradouro: "Av. Paulista",
      numero: "1000",
      bairro: "Bela Vista",
      municipio: "São Paulo",
      uf: "SP",
      codMunicipio: "3550308",
      indicadorIe: "9",
    },
  });

  await prisma.partner.upsert({
    where: { id: "seed-fornecedor-1" },
    update: {},
    create: {
      id: "seed-fornecedor-1",
      companyId,
      tipo: "FORNECEDOR",
      pessoa: "JURIDICA",
      nome: "Distribuidora de Peças Brasil S/A",
      cpfCnpj: "60746948000112",
      municipio: "Guarulhos",
      uf: "SP",
      codMunicipio: "3518800",
      indicadorIe: "1",
    },
  });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
