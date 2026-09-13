-- CreateTable
CREATE TABLE "Sequence" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
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

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "placa" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "ano" TEXT,
    "cor" TEXT,
    "chassi" TEXT,
    "km" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vehicle_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "custoUnit" REAL NOT NULL DEFAULT 0,
    "saldoApos" REAL NOT NULL,
    "origem" TEXT,
    "origemId" TEXT,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "partnerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "desconto" REAL NOT NULL DEFAULT 0,
    "acrescimo" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "formaPagamento" TEXT,
    "observacao" TEXT,
    "finalizadaEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "precoUnit" REAL NOT NULL,
    "desconto" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceOrder" (
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
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceOrder_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceOrderId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "productId" TEXT,
    "serviceId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "precoUnit" REAL NOT NULL,
    "desconto" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    CONSTRAINT "ServiceOrderItem_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrderItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
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
    "xml" TEXT,
    "emitidaEm" DATETIME,
    "canceladaEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceServiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "InvoiceServiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceServiceItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "XmlDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "XmlItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "XmlItem_xmlDocumentId_fkey" FOREIGN KEY ("xmlDocumentId") REFERENCES "XmlDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "XmlItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "FinancialEntry_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_nome_key" ON "Category"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Service_codigo_key" ON "Service"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_numero_key" ON "Sale"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_numero_key" ON "ServiceOrder"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tipo_serie_numero_key" ON "Invoice"("tipo", "serie", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "XmlDocument_chaveAcesso_key" ON "XmlDocument"("chaveAcesso");
