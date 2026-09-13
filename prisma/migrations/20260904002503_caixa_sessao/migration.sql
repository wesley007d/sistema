-- CreateTable
CREATE TABLE "CashRegisterSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "operadorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "valorAbertura" REAL NOT NULL DEFAULT 0,
    "abertoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacaoAbertura" TEXT,
    "valorContado" REAL,
    "diferenca" REAL,
    "fechadoEm" DATETIME,
    "observacaoFechamento" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashRegisterSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashRegisterSession_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CashRegisterSession_accountId_status_idx" ON "CashRegisterSession"("accountId", "status");
