import { prisma } from "./db";

/**
 * Modelos que pertencem a uma empresa (tenant). `Session` fica de fora
 * (amarrada a um usuário, não a uma empresa) e `Company` é tratado à
 * parte (o próprio id da empresa faz o papel de companyId).
 */
const TENANT_MODELS = new Set([
  "Category",
  "Product",
  "Service",
  "Partner",
  "Vehicle",
  "StockMovement",
  "Sale",
  "SalePayment",
  "SaleItem",
  "ServiceOrder",
  "ServiceOrderItem",
  "Invoice",
  "InvoiceItem",
  "InvoiceServiceItem",
  "XmlDocument",
  "XmlItem",
  "FinancialEntry",
  "CashAccount",
  "CashRegisterSession",
  "Settlement",
  "CashTransaction",
  "User",
  "Sequence",
]);

const FILTER_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

const UNIQUE_OPS = new Set(["findUnique", "findUniqueOrThrow", "update", "delete"]);

/**
 * Devolve um Prisma Client "escopado" a uma empresa: toda query em um
 * modelo de tenant recebe `companyId` automaticamente no `where`/`data`,
 * sem precisar espalhar o filtro manualmente em cada arquivo.
 *
 * Limite conhecido: operações que buscam por uma chave única de negócio
 * (não `id`) — ex. `category.upsert({ where: { nome } })` — precisam
 * passar o `where` já no formato de chave composta
 * (`{ companyId_nome: { companyId, nome } }`), pois a extensão só injeta
 * `companyId` automaticamente quando o `where` já identifica a linha
 * por `id` (uso do "extended where unique" do Prisma).
 */
export function scopedDb(companyId: string) {
  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const a = args as Record<string, unknown>;

          if (model === "Company") {
            if (operation === "findUnique" || operation === "findUniqueOrThrow" || operation === "update") {
              a.where = { ...(a.where as object | undefined), id: companyId };
            }
            return query(a as never);
          }

          if (!model || !TENANT_MODELS.has(model)) return query(args);

          if (FILTER_OPS.has(operation)) {
            a.where = { ...(a.where as object | undefined), companyId };
          } else if (UNIQUE_OPS.has(operation)) {
            const where = a.where as Record<string, unknown> | undefined;
            if (where && "id" in where) {
              a.where = { ...where, companyId };
            }
            // where por chave de negócio (ex.: companyId_nome): já deve
            // vir pronto do call site, não mexemos aqui.
          } else if (operation === "create") {
            a.data = { ...(a.data as object | undefined), companyId };
          } else if (operation === "createMany") {
            const data = a.data;
            a.data = Array.isArray(data)
              ? data.map((d: object) => ({ ...d, companyId }))
              : { ...(data as object | undefined), companyId };
          } else if (operation === "upsert") {
            const where = a.where as Record<string, unknown> | undefined;
            if (where && "id" in where) {
              a.where = { ...where, companyId };
            }
            a.create = { ...(a.create as object | undefined), companyId };
          }

          return query(a as never);
        },
      },
    },
  });
}

export type ScopedDb = ReturnType<typeof scopedDb>;

/** Tipo do client dentro de `db.$transaction(async (tx) => ...)`. */
export type ScopedTx = Omit<ScopedDb, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;
