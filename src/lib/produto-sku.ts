import { nextSeq } from "@/lib/seq";
import type { ScopedTx } from "@/lib/tenant-db";

/**
 * Gera um código de produto sequencial e livre para a empresa: P0001, P0002...
 * Usa o contador `produto` (tabela Sequence). Pula códigos já ocupados (ex.:
 * cadastrados à mão antes). Deve ser chamado dentro de uma transação quando
 * possível, para evitar corrida na numeração.
 */
export async function gerarSkuProduto(
  tx: ScopedTx,
  companyId: string,
): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const n = await nextSeq(tx, companyId, "produto");
    const sku = `P${String(n).padStart(4, "0")}`;
    const existe = await tx.product.findUnique({
      where: { companyId_sku: { companyId, sku } },
    });
    if (!existe) return sku;
  }
  throw new Error("Não foi possível gerar um código automático para o produto.");
}
