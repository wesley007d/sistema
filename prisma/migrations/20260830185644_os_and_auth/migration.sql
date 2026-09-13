-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'FUNCIONARIO',
    "permissoes" TEXT NOT NULL DEFAULT '[]',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiraEm" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "serie" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "ambiente" TEXT NOT NULL DEFAULT 'HOMOLOGACAO',
    "naturezaOperacao" TEXT NOT NULL DEFAULT 'Venda de mercadoria',
    "partnerId" TEXT,
    "saleId" TEXT,
    "serviceOrderId" TEXT,
    "chaveAcesso" TEXT,
    "protocolo" TEXT,
    "motivoRejeicao" TEXT,
    "motivoCancelamento" TEXT,
    "valorProdutos" REAL NOT NULL DEFAULT 0,
    "valorServicos" REAL NOT NULL DEFAULT 0,
    "valorDesconto" REAL NOT NULL DEFAULT 0,
    "valorFrete" REAL NOT NULL DEFAULT 0,
    "valorIcms" REAL NOT NULL DEFAULT 0,
    "valorIss" REAL NOT NULL DEFAULT 0,
    "valorPis" REAL NOT NULL DEFAULT 0,
    "valorCofins" REAL NOT NULL DEFAULT 0,
    "valorTotal" REAL NOT NULL DEFAULT 0,
    "baixaEstoque" BOOLEAN NOT NULL DEFAULT true,
    "xml" TEXT,
    "emitidaEm" DATETIME,
    "canceladaEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("ambiente", "canceladaEm", "chaveAcesso", "createdAt", "emitidaEm", "id", "motivoCancelamento", "motivoRejeicao", "naturezaOperacao", "numero", "partnerId", "protocolo", "saleId", "serie", "serviceOrderId", "status", "tipo", "updatedAt", "valorCofins", "valorDesconto", "valorFrete", "valorIcms", "valorIss", "valorPis", "valorProdutos", "valorServicos", "valorTotal", "xml") SELECT "ambiente", "canceladaEm", "chaveAcesso", "createdAt", "emitidaEm", "id", "motivoCancelamento", "motivoRejeicao", "naturezaOperacao", "numero", "partnerId", "protocolo", "saleId", "serie", "serviceOrderId", "status", "tipo", "updatedAt", "valorCofins", "valorDesconto", "valorFrete", "valorIcms", "valorIss", "valorPis", "valorProdutos", "valorServicos", "valorTotal", "xml" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_tipo_serie_numero_key" ON "Invoice"("tipo", "serie", "numero");
CREATE TABLE "new_ServiceOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "partnerId" TEXT,
    "vehicleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ORCAMENTO',
    "tecnico" TEXT,
    "descricaoProblema" TEXT,
    "diagnostico" TEXT,
    "kmEntrada" INTEGER,
    "totalPecas" REAL NOT NULL DEFAULT 0,
    "totalServicos" REAL NOT NULL DEFAULT 0,
    "desconto" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "previsaoEntrega" DATETIME,
    "concluidaEm" DATETIME,
    "pecasBaixadas" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceOrder_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ServiceOrder" ("concluidaEm", "createdAt", "desconto", "descricaoProblema", "diagnostico", "id", "kmEntrada", "numero", "observacao", "partnerId", "previsaoEntrega", "status", "tecnico", "total", "totalPecas", "totalServicos", "updatedAt", "vehicleId") SELECT "concluidaEm", "createdAt", "desconto", "descricaoProblema", "diagnostico", "id", "kmEntrada", "numero", "observacao", "partnerId", "previsaoEntrega", "status", "tecnico", "total", "totalPecas", "totalServicos", "updatedAt", "vehicleId" FROM "ServiceOrder";
DROP TABLE "ServiceOrder";
ALTER TABLE "new_ServiceOrder" RENAME TO "ServiceOrder";
CREATE UNIQUE INDEX "ServiceOrder_numero_key" ON "ServiceOrder"("numero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
