-- CreateTable
CREATE TABLE "AtividadeDia" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "acoes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtividadeDia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtividadeModulo" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "modulo" TEXT NOT NULL,
    "acoes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtividadeModulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtividadeDia_companyId_dia_idx" ON "AtividadeDia"("companyId", "dia");

-- CreateIndex
CREATE UNIQUE INDEX "AtividadeDia_userId_dia_key" ON "AtividadeDia"("userId", "dia");

-- CreateIndex
CREATE INDEX "AtividadeModulo_companyId_dia_idx" ON "AtividadeModulo"("companyId", "dia");

-- CreateIndex
CREATE INDEX "AtividadeModulo_companyId_modulo_idx" ON "AtividadeModulo"("companyId", "modulo");

-- CreateIndex
CREATE UNIQUE INDEX "AtividadeModulo_userId_dia_modulo_key" ON "AtividadeModulo"("userId", "dia", "modulo");

-- AddForeignKey
ALTER TABLE "AtividadeDia" ADD CONSTRAINT "AtividadeDia_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeDia" ADD CONSTRAINT "AtividadeDia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeModulo" ADD CONSTRAINT "AtividadeModulo_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeModulo" ADD CONSTRAINT "AtividadeModulo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
