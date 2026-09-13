-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CashAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'CAIXA',
    "saldoInicial" REAL NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CashAccount" ("ativo", "createdAt", "id", "nome", "saldoInicial", "tipo") SELECT "ativo", "createdAt", "id", "nome", "saldoInicial", "tipo" FROM "CashAccount";
DROP TABLE "CashAccount";
ALTER TABLE "new_CashAccount" RENAME TO "CashAccount";
CREATE INDEX "CashAccount_companyId_idx" ON "CashAccount"("companyId");
CREATE TABLE "new_CashRegisterSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
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
    CONSTRAINT "CashRegisterSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashRegisterSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashRegisterSession_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CashRegisterSession" ("abertoEm", "accountId", "createdAt", "diferenca", "fechadoEm", "id", "observacaoAbertura", "observacaoFechamento", "operadorId", "status", "valorAbertura", "valorContado") SELECT "abertoEm", "accountId", "createdAt", "diferenca", "fechadoEm", "id", "observacaoAbertura", "observacaoFechamento", "operadorId", "status", "valorAbertura", "valorContado" FROM "CashRegisterSession";
DROP TABLE "CashRegisterSession";
ALTER TABLE "new_CashRegisterSession" RENAME TO "CashRegisterSession";
CREATE INDEX "CashRegisterSession_accountId_status_idx" ON "CashRegisterSession"("accountId", "status");
CREATE INDEX "CashRegisterSession_companyId_idx" ON "CashRegisterSession"("companyId");
CREATE TABLE "new_CashTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "accountId" TEXT NOT NULL,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "categoria" TEXT,
    "descricao" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'MANUAL',
    "settlementId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashTransaction_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CashTransaction" ("accountId", "categoria", "createdAt", "data", "descricao", "id", "origem", "settlementId", "tipo", "valor") SELECT "accountId", "categoria", "createdAt", "data", "descricao", "id", "origem", "settlementId", "tipo", "valor" FROM "CashTransaction";
DROP TABLE "CashTransaction";
ALTER TABLE "new_CashTransaction" RENAME TO "CashTransaction";
CREATE INDEX "CashTransaction_companyId_idx" ON "CashTransaction"("companyId");
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "nome" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("createdAt", "id", "nome") SELECT "createdAt", "id", "nome" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_companyId_nome_key" ON "Category"("companyId", "nome");
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "razaoSocial" TEXT NOT NULL DEFAULT 'Minha Loja de Motopeças LTDA',
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL DEFAULT '',
    "ie" TEXT,
    "im" TEXT,
    "regimeTributario" TEXT NOT NULL DEFAULT 'SIMPLES',
    "crt" INTEGER NOT NULL DEFAULT 1,
    "email" TEXT,
    "telefone" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "codMunicipio" TEXT,
    "ambienteFiscal" TEXT NOT NULL DEFAULT 'HOMOLOGACAO',
    "serieNFe" INTEGER NOT NULL DEFAULT 1,
    "serieNFSe" INTEGER NOT NULL DEFAULT 1,
    "aliquotaSimples" REAL NOT NULL DEFAULT 4,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Company" ("aliquotaSimples", "ambienteFiscal", "bairro", "cep", "cnpj", "codMunicipio", "complemento", "createdAt", "crt", "email", "id", "ie", "im", "logradouro", "municipio", "nomeFantasia", "numero", "razaoSocial", "regimeTributario", "serieNFSe", "serieNFe", "telefone", "uf", "updatedAt") SELECT "aliquotaSimples", "ambienteFiscal", "bairro", "cep", "cnpj", "codMunicipio", "complemento", "createdAt", "crt", "email", "id", "ie", "im", "logradouro", "municipio", "nomeFantasia", "numero", "razaoSocial", "regimeTributario", "serieNFSe", "serieNFe", "telefone", "uf", "updatedAt" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE TABLE "new_FinancialEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "partnerId" TEXT,
    "saleId" TEXT,
    "serviceOrderId" TEXT,
    "valor" REAL NOT NULL,
    "valorPago" REAL NOT NULL DEFAULT 0,
    "vencimento" DATETIME NOT NULL,
    "pagoEm" DATETIME,
    "formaPagamento" TEXT,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FinancialEntry" ("categoria", "createdAt", "descricao", "formaPagamento", "id", "observacao", "pagoEm", "partnerId", "saleId", "serviceOrderId", "status", "tipo", "updatedAt", "valor", "valorPago", "vencimento") SELECT "categoria", "createdAt", "descricao", "formaPagamento", "id", "observacao", "pagoEm", "partnerId", "saleId", "serviceOrderId", "status", "tipo", "updatedAt", "valor", "valorPago", "vencimento" FROM "FinancialEntry";
DROP TABLE "FinancialEntry";
ALTER TABLE "new_FinancialEntry" RENAME TO "FinancialEntry";
CREATE INDEX "FinancialEntry_companyId_idx" ON "FinancialEntry"("companyId");
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
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
    CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("ambiente", "baixaEstoque", "canceladaEm", "chaveAcesso", "createdAt", "emitidaEm", "id", "motivoCancelamento", "motivoRejeicao", "naturezaOperacao", "numero", "partnerId", "protocolo", "saleId", "serie", "serviceOrderId", "status", "tipo", "updatedAt", "valorCofins", "valorDesconto", "valorFrete", "valorIcms", "valorIss", "valorPis", "valorProdutos", "valorServicos", "valorTotal", "xml") SELECT "ambiente", "baixaEstoque", "canceladaEm", "chaveAcesso", "createdAt", "emitidaEm", "id", "motivoCancelamento", "motivoRejeicao", "naturezaOperacao", "numero", "partnerId", "protocolo", "saleId", "serie", "serviceOrderId", "status", "tipo", "updatedAt", "valorCofins", "valorDesconto", "valorFrete", "valorIcms", "valorIss", "valorPis", "valorProdutos", "valorServicos", "valorTotal", "xml" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_companyId_tipo_serie_numero_key" ON "Invoice"("companyId", "tipo", "serie", "numero");
CREATE TABLE "new_InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ncm" TEXT,
    "cfop" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "valorUnit" REAL NOT NULL,
    "desconto" REAL NOT NULL DEFAULT 0,
    "valorTotal" REAL NOT NULL,
    "cstIcms" TEXT,
    "aliquotaIcms" REAL NOT NULL DEFAULT 0,
    "valorIcms" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "InvoiceItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InvoiceItem" ("aliquotaIcms", "cfop", "codigo", "cstIcms", "desconto", "descricao", "id", "invoiceId", "ncm", "productId", "quantidade", "unidade", "valorIcms", "valorTotal", "valorUnit") SELECT "aliquotaIcms", "cfop", "codigo", "cstIcms", "desconto", "descricao", "id", "invoiceId", "ncm", "productId", "quantidade", "unidade", "valorIcms", "valorTotal", "valorUnit" FROM "InvoiceItem";
DROP TABLE "InvoiceItem";
ALTER TABLE "new_InvoiceItem" RENAME TO "InvoiceItem";
CREATE INDEX "InvoiceItem_companyId_idx" ON "InvoiceItem"("companyId");
CREATE TABLE "new_InvoiceServiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "invoiceId" TEXT NOT NULL,
    "serviceId" TEXT,
    "descricao" TEXT NOT NULL,
    "itemListaServico" TEXT,
    "quantidade" REAL NOT NULL,
    "valorUnit" REAL NOT NULL,
    "valorTotal" REAL NOT NULL,
    "aliquotaIss" REAL NOT NULL DEFAULT 0,
    "valorIss" REAL NOT NULL DEFAULT 0,
    "issRetido" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "InvoiceServiceItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceServiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceServiceItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InvoiceServiceItem" ("aliquotaIss", "descricao", "id", "invoiceId", "issRetido", "itemListaServico", "quantidade", "serviceId", "valorIss", "valorTotal", "valorUnit") SELECT "aliquotaIss", "descricao", "id", "invoiceId", "issRetido", "itemListaServico", "quantidade", "serviceId", "valorIss", "valorTotal", "valorUnit" FROM "InvoiceServiceItem";
DROP TABLE "InvoiceServiceItem";
ALTER TABLE "new_InvoiceServiceItem" RENAME TO "InvoiceServiceItem";
CREATE INDEX "InvoiceServiceItem_companyId_idx" ON "InvoiceServiceItem"("companyId");
CREATE TABLE "new_Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "tipo" TEXT NOT NULL DEFAULT 'CLIENTE',
    "pessoa" TEXT NOT NULL DEFAULT 'FISICA',
    "nome" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cpfCnpj" TEXT,
    "rgIe" TEXT,
    "im" TEXT,
    "indicadorIe" TEXT NOT NULL DEFAULT '9',
    "email" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "codMunicipio" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Partner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Partner" ("ativo", "bairro", "celular", "cep", "codMunicipio", "complemento", "cpfCnpj", "createdAt", "email", "id", "im", "indicadorIe", "logradouro", "municipio", "nome", "nomeFantasia", "numero", "observacoes", "pessoa", "rgIe", "telefone", "tipo", "uf", "updatedAt") SELECT "ativo", "bairro", "celular", "cep", "codMunicipio", "complemento", "cpfCnpj", "createdAt", "email", "id", "im", "indicadorIe", "logradouro", "municipio", "nome", "nomeFantasia", "numero", "observacoes", "pessoa", "rgIe", "telefone", "tipo", "uf", "updatedAt" FROM "Partner";
DROP TABLE "Partner";
ALTER TABLE "new_Partner" RENAME TO "Partner";
CREATE INDEX "Partner_companyId_idx" ON "Partner"("companyId");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "sku" TEXT NOT NULL,
    "codigoBarras" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "marca" TEXT,
    "categoryId" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "precoCusto" REAL NOT NULL DEFAULT 0,
    "precoVenda" REAL NOT NULL DEFAULT 0,
    "estoque" REAL NOT NULL DEFAULT 0,
    "estoqueMinimo" REAL NOT NULL DEFAULT 0,
    "localizacao" TEXT,
    "ncm" TEXT DEFAULT '87141000',
    "cest" TEXT,
    "cfopVenda" TEXT NOT NULL DEFAULT '5102',
    "origem" TEXT NOT NULL DEFAULT '0',
    "icmsCst" TEXT NOT NULL DEFAULT '102',
    "aliquotaIcms" REAL NOT NULL DEFAULT 0,
    "pisCst" TEXT NOT NULL DEFAULT '07',
    "cofinsCst" TEXT NOT NULL DEFAULT '07',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("aliquotaIcms", "ativo", "categoryId", "cest", "cfopVenda", "codigoBarras", "cofinsCst", "createdAt", "descricao", "estoque", "estoqueMinimo", "icmsCst", "id", "localizacao", "marca", "ncm", "nome", "origem", "pisCst", "precoCusto", "precoVenda", "sku", "unidade", "updatedAt") SELECT "aliquotaIcms", "ativo", "categoryId", "cest", "cfopVenda", "codigoBarras", "cofinsCst", "createdAt", "descricao", "estoque", "estoqueMinimo", "icmsCst", "id", "localizacao", "marca", "ncm", "nome", "origem", "pisCst", "precoCusto", "precoVenda", "sku", "unidade", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_companyId_sku_key" ON "Product"("companyId", "sku");
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
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
    CONSTRAINT "Sale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Sale_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("acrescimo", "createdAt", "desconto", "finalizadaEm", "formaPagamento", "id", "numero", "observacao", "operadorId", "partnerId", "status", "subtotal", "total", "troco", "updatedAt") SELECT "acrescimo", "createdAt", "desconto", "finalizadaEm", "formaPagamento", "id", "numero", "observacao", "operadorId", "partnerId", "status", "subtotal", "total", "troco", "updatedAt" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_companyId_numero_key" ON "Sale"("companyId", "numero");
CREATE TABLE "new_SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "precoUnit" REAL NOT NULL,
    "desconto" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    CONSTRAINT "SaleItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SaleItem" ("desconto", "descricao", "id", "precoUnit", "productId", "quantidade", "saleId", "total") SELECT "desconto", "descricao", "id", "precoUnit", "productId", "quantidade", "saleId", "total" FROM "SaleItem";
DROP TABLE "SaleItem";
ALTER TABLE "new_SaleItem" RENAME TO "SaleItem";
CREATE INDEX "SaleItem_companyId_idx" ON "SaleItem"("companyId");
CREATE TABLE "new_SalePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "saleId" TEXT NOT NULL,
    "forma" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    CONSTRAINT "SalePayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SalePayment" ("forma", "id", "saleId", "valor") SELECT "forma", "id", "saleId", "valor" FROM "SalePayment";
DROP TABLE "SalePayment";
ALTER TABLE "new_SalePayment" RENAME TO "SalePayment";
CREATE INDEX "SalePayment_companyId_idx" ON "SalePayment"("companyId");
CREATE TABLE "new_Sequence" (
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("companyId", "name"),
    CONSTRAINT "Sequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Sequence" ("name", "value") SELECT "name", "value" FROM "Sequence";
DROP TABLE "Sequence";
ALTER TABLE "new_Sequence" RENAME TO "Sequence";
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" REAL NOT NULL DEFAULT 0,
    "itemListaServico" TEXT,
    "codTributacaoMunicipio" TEXT,
    "aliquotaIss" REAL NOT NULL DEFAULT 3,
    "issRetido" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("aliquotaIss", "ativo", "codTributacaoMunicipio", "codigo", "createdAt", "descricao", "id", "issRetido", "itemListaServico", "nome", "preco", "updatedAt") SELECT "aliquotaIss", "ativo", "codTributacaoMunicipio", "codigo", "createdAt", "descricao", "id", "issRetido", "itemListaServico", "nome", "preco", "updatedAt" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE UNIQUE INDEX "Service_companyId_codigo_key" ON "Service"("companyId", "codigo");
CREATE TABLE "new_ServiceOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
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
    CONSTRAINT "ServiceOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrder_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ServiceOrder" ("concluidaEm", "createdAt", "desconto", "descricaoProblema", "diagnostico", "id", "kmEntrada", "numero", "observacao", "partnerId", "pecasBaixadas", "previsaoEntrega", "status", "tecnico", "total", "totalPecas", "totalServicos", "updatedAt", "vehicleId") SELECT "concluidaEm", "createdAt", "desconto", "descricaoProblema", "diagnostico", "id", "kmEntrada", "numero", "observacao", "partnerId", "pecasBaixadas", "previsaoEntrega", "status", "tecnico", "total", "totalPecas", "totalServicos", "updatedAt", "vehicleId" FROM "ServiceOrder";
DROP TABLE "ServiceOrder";
ALTER TABLE "new_ServiceOrder" RENAME TO "ServiceOrder";
CREATE UNIQUE INDEX "ServiceOrder_companyId_numero_key" ON "ServiceOrder"("companyId", "numero");
CREATE TABLE "new_ServiceOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "serviceOrderId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "productId" TEXT,
    "serviceId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "precoUnit" REAL NOT NULL,
    "desconto" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    CONSTRAINT "ServiceOrderItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrderItem_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrderItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ServiceOrderItem" ("desconto", "descricao", "id", "precoUnit", "productId", "quantidade", "serviceId", "serviceOrderId", "tipo", "total") SELECT "desconto", "descricao", "id", "precoUnit", "productId", "quantidade", "serviceId", "serviceOrderId", "tipo", "total" FROM "ServiceOrderItem";
DROP TABLE "ServiceOrderItem";
ALTER TABLE "new_ServiceOrderItem" RENAME TO "ServiceOrderItem";
CREATE INDEX "ServiceOrderItem_companyId_idx" ON "ServiceOrderItem"("companyId");
CREATE TABLE "new_Settlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor" REAL NOT NULL,
    "formaPagamento" TEXT,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Settlement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Settlement_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinancialEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Settlement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Settlement" ("accountId", "createdAt", "data", "entryId", "formaPagamento", "id", "observacao", "valor") SELECT "accountId", "createdAt", "data", "entryId", "formaPagamento", "id", "observacao", "valor" FROM "Settlement";
DROP TABLE "Settlement";
ALTER TABLE "new_Settlement" RENAME TO "Settlement";
CREATE INDEX "Settlement_companyId_idx" ON "Settlement"("companyId");
CREATE TABLE "new_StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "productId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "custoUnit" REAL NOT NULL DEFAULT 0,
    "saldoApos" REAL NOT NULL,
    "origem" TEXT,
    "origemId" TEXT,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StockMovement" ("createdAt", "custoUnit", "id", "observacao", "origem", "origemId", "productId", "quantidade", "saldoApos", "tipo") SELECT "createdAt", "custoUnit", "id", "observacao", "origem", "origemId", "productId", "quantidade", "saldoApos", "tipo" FROM "StockMovement";
DROP TABLE "StockMovement";
ALTER TABLE "new_StockMovement" RENAME TO "StockMovement";
CREATE INDEX "StockMovement_companyId_idx" ON "StockMovement"("companyId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'FUNCIONARIO',
    "permissoes" TEXT NOT NULL DEFAULT '[]',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("ativo", "createdAt", "email", "id", "nome", "permissoes", "role", "senhaHash", "ultimoLogin", "updatedAt") SELECT "ativo", "createdAt", "email", "id", "nome", "permissoes", "role", "senhaHash", "ultimoLogin", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE TABLE "new_Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "partnerId" TEXT NOT NULL,
    "placa" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "ano" TEXT,
    "cor" TEXT,
    "chassi" TEXT,
    "km" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Vehicle" ("ano", "chassi", "cor", "createdAt", "id", "km", "marca", "modelo", "partnerId", "placa") SELECT "ano", "chassi", "cor", "createdAt", "id", "km", "marca", "modelo", "partnerId", "placa" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE INDEX "Vehicle_companyId_idx" ON "Vehicle"("companyId");
CREATE TABLE "new_XmlDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "direcao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "chaveAcesso" TEXT,
    "numero" TEXT,
    "serie" TEXT,
    "emitenteNome" TEXT,
    "emitenteCnpj" TEXT,
    "destinatarioNome" TEXT,
    "destinatarioCnpj" TEXT,
    "dataEmissao" DATETIME,
    "valorTotal" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IMPORTADO',
    "conteudo" TEXT NOT NULL,
    "invoiceId" TEXT,
    "origemArquivo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "XmlDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_XmlDocument" ("chaveAcesso", "conteudo", "createdAt", "dataEmissao", "destinatarioCnpj", "destinatarioNome", "direcao", "emitenteCnpj", "emitenteNome", "id", "invoiceId", "numero", "origemArquivo", "serie", "status", "tipo", "updatedAt", "valorTotal") SELECT "chaveAcesso", "conteudo", "createdAt", "dataEmissao", "destinatarioCnpj", "destinatarioNome", "direcao", "emitenteCnpj", "emitenteNome", "id", "invoiceId", "numero", "origemArquivo", "serie", "status", "tipo", "updatedAt", "valorTotal" FROM "XmlDocument";
DROP TABLE "XmlDocument";
ALTER TABLE "new_XmlDocument" RENAME TO "XmlDocument";
CREATE UNIQUE INDEX "XmlDocument_chaveAcesso_key" ON "XmlDocument"("chaveAcesso");
CREATE INDEX "XmlDocument_companyId_idx" ON "XmlDocument"("companyId");
CREATE TABLE "new_XmlItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL DEFAULT 'default',
    "xmlDocumentId" TEXT NOT NULL,
    "codigo" TEXT,
    "descricao" TEXT NOT NULL,
    "ncm" TEXT,
    "cfop" TEXT,
    "unidade" TEXT,
    "quantidade" REAL NOT NULL DEFAULT 0,
    "valorUnit" REAL NOT NULL DEFAULT 0,
    "valorTotal" REAL NOT NULL DEFAULT 0,
    "productId" TEXT,
    "vinculado" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "XmlItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "XmlItem_xmlDocumentId_fkey" FOREIGN KEY ("xmlDocumentId") REFERENCES "XmlDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "XmlItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_XmlItem" ("cfop", "codigo", "descricao", "id", "ncm", "productId", "quantidade", "unidade", "valorTotal", "valorUnit", "vinculado", "xmlDocumentId") SELECT "cfop", "codigo", "descricao", "id", "ncm", "productId", "quantidade", "unidade", "valorTotal", "valorUnit", "vinculado", "xmlDocumentId" FROM "XmlItem";
DROP TABLE "XmlItem";
ALTER TABLE "new_XmlItem" RENAME TO "XmlItem";
CREATE INDEX "XmlItem_companyId_idx" ON "XmlItem"("companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

