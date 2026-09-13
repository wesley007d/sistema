-- CreateTable
CREATE TABLE "CobrancaPix" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "mpOrderId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "qrCode" TEXT,
    "qrCodeBase64" TEXT,
    "pagoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CobrancaPix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CobrancaPix_mpOrderId_key" ON "CobrancaPix"("mpOrderId");

-- CreateIndex
CREATE INDEX "CobrancaPix_companyId_idx" ON "CobrancaPix"("companyId");

-- AddForeignKey
ALTER TABLE "CobrancaPix" ADD CONSTRAINT "CobrancaPix_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
