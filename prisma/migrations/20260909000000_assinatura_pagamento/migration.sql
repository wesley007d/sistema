-- CreateTable
CREATE TABLE "AssinaturaPagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "pagoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venceAnterior" DATETIME,
    "venceNovo" DATETIME,
    "metodo" TEXT,
    "obs" TEXT,
    "registradoPor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssinaturaPagamento_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AssinaturaPagamento_companyId_idx" ON "AssinaturaPagamento"("companyId");
