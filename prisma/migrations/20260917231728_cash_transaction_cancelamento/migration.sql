-- AlterTable
ALTER TABLE "CashTransaction" ADD COLUMN     "cancelado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "canceladoMotivo" TEXT,
ADD COLUMN     "canceladoPor" TEXT;
