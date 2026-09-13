-- chaveAcesso deixa de ser única globalmente e passa a ser única por empresa
-- (evita vazamento cross-tenant na checagem de duplicidade do import de XML).
DROP INDEX "XmlDocument_chaveAcesso_key";
CREATE UNIQUE INDEX "XmlDocument_companyId_chaveAcesso_key" ON "XmlDocument"("companyId", "chaveAcesso");
