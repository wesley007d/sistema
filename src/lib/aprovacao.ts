import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { clientIp, esperaLegivel, hit, reset } from "@/lib/rate-limit";

/**
 * Desconto máximo (em %) que um Vendedor (perfil `pdv`, sem `vendas`) pode dar
 * numa venda sem autorização. Acima disto: precisa de um admin liberando na hora
 * ou a venda vai para a fila de aprovação (`AGUARDANDO_APROVACAO`).
 */
export const LIMITE_DESCONTO_VENDEDOR = 10;

/** Percentual de desconto sobre o bruto dos itens (0 se não houver bruto). */
export function pctDesconto(brutoItens: number, descontoTotal: number): number {
  if (brutoItens <= 0) return 0;
  return (descontoTotal / brutoItens) * 100;
}

/**
 * Confere e-mail + senha de um ADMIN ativo da empresa. Serve para "autorização
 * do gerente na hora" (cadastro de produto por funcionário, desconto acima do
 * limite, etc.). Retorna o admin autenticado ou `null`.
 *
 * Tem rate limit (12 tentativas / 10 min por empresa+IP) porque é um ponto de
 * adivinhação da senha de admin pelos formulários de autorização. Lança erro
 * quando o limite estoura.
 */
export async function conferirAdmin(
  companyId: string,
  email: string,
  senha: string,
) {
  const e = (email ?? "").trim().toLowerCase();
  if (!e || !senha) return null;

  const chave = `admincheck:${companyId}:${await clientIp()}`;
  const r = hit(chave, 12, 10 * 60_000);
  if (!r.ok)
    throw new Error(
      `Muitas tentativas de autorização. Aguarde ${esperaLegivel(r.retryAfterSec)}.`,
    );

  const admin = await prisma.user.findFirst({
    where: { companyId, email: e, role: "ADMIN", ativo: true },
  });
  if (!admin || !(await verifyPassword(senha, admin.senhaHash))) return null;

  reset(chave); // autorização válida: zera o contador
  return admin;
}
