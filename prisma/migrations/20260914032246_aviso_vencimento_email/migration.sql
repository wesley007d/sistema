-- CreateTable
CREATE TABLE "AvisoVencimento" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "venceRef" TIMESTAMP(3) NOT NULL,
    "destinatarios" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL DEFAULT true,
    "erro" TEXT,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvisoVencimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvisoVencimento_companyId_idx" ON "AvisoVencimento"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AvisoVencimento_companyId_tipo_venceRef_key" ON "AvisoVencimento"("companyId", "tipo", "venceRef");

-- AddForeignKey
ALTER TABLE "AvisoVencimento" ADD CONSTRAINT "AvisoVencimento_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
