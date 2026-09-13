-- AlterTable
ALTER TABLE "Company" ADD COLUMN "assinaturaStatus" TEXT NOT NULL DEFAULT 'TESTE';
ALTER TABLE "Company" ADD COLUMN "assinaturaValor" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "assinaturaVence" DATETIME;
ALTER TABLE "Company" ADD COLUMN "assinaturaObs" TEXT;
