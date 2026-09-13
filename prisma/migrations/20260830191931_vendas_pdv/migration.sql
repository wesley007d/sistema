-- CreateTable
CREATE TABLE "SalePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "forma" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "partnerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "desconto" REAL NOT NULL DEFAULT 0,
    "acrescimo" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "troco" REAL NOT NULL DEFAULT 0,
    "formaPagamento" TEXT,
    "observacao" TEXT,
    "operadorId" TEXT,
    "finalizadaEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("acrescimo", "createdAt", "desconto", "finalizadaEm", "formaPagamento", "id", "numero", "observacao", "partnerId", "status", "subtotal", "total", "updatedAt") SELECT "acrescimo", "createdAt", "desconto", "finalizadaEm", "formaPagamento", "id", "numero", "observacao", "partnerId", "status", "subtotal", "total", "updatedAt" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_numero_key" ON "Sale"("numero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
