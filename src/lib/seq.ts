import type { ScopedTx } from "@/lib/tenant-db";

type Tx = ScopedTx;

/**
 * Retorna o proximo numero sequencial de uma empresa para um dado nome
 * (ex.: "sale", "os", "nfe"). Deve ser chamado dentro de uma transacao
 * para evitar numeros duplicados.
 */
export async function nextSeq(tx: Tx, companyId: string, name: string): Promise<number> {
  const row = await tx.sequence.upsert({
    where: { companyId_name: { companyId, name } },
    create: { companyId, name, value: 1 },
    update: { value: { increment: 1 } },
  });
  return row.value;
}
