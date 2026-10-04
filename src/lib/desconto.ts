/**
 * Lubrificante não tem desconto (regra da loja). Reconhecido pelo NCM, não
 * pelo nome — "filtro de óleo" e "bomba de óleo" são peças e têm desconto.
 * 2710 = óleos lubrificantes; 3403 = preparações lubrificantes (graxa etc.).
 */
export function semDesconto(ncm: string | null | undefined): boolean {
  return /^(2710|3403)/.test((ncm ?? "").replace(/\D/g, ""));
}
