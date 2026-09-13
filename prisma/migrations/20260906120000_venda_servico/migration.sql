-- RedefineTables: SaleItem passa a aceitar linha de SERVICO (mão de obra) —
-- productId vira opcional e entram `tipo` e `serviceId`.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PECA',
    "productId" TEXT,
    "serviceId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "precoUnit" REAL NOT NULL,
    "desconto" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    CONSTRAINT "SaleItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SaleItem" ("id", "companyId", "saleId", "productId", "descricao", "quantidade", "precoUnit", "desconto", "total")
SELECT "id", "companyId", "saleId", "productId", "descricao", "quantidade", "precoUnit", "desconto", "total" FROM "SaleItem";
DROP TABLE "SaleItem";
ALTER TABLE "new_SaleItem" RENAME TO "SaleItem";
CREATE INDEX "SaleItem_companyId_idx" ON "SaleItem"("companyId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
