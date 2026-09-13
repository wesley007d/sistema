-- AlterTable
ALTER TABLE "Session" ADD COLUMN "ultimaAtividade" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Session_ultimaAtividade_idx" ON "Session"("ultimaAtividade");
