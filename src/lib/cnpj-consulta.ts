import { limparCnpj } from "@/lib/cnpj";

export interface DadosCnpj {
  razaoSocial: string;
  nomeFantasia: string | null;
  /** Ex.: "ATIVA", "BAIXADA", "SUSPENSA", "INAPTA", "NULA". */
  situacao: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  /** Código IBGE do município (7 dígitos) — usado na emissão fiscal. */
  codMunicipio: string | null;
  telefone: string | null;
}

/**
 * Consulta os dados oficiais do CNPJ na Receita Federal via BrasilAPI (pública,
 * sem chave/custo — https://brasilapi.com.br). É a fonte de verdade do
 * cadastro de empresa: nunca deixamos passar razão social/CNPJ inventados.
 * Lança erro descritivo se o CNPJ não existir ou a consulta falhar.
 */
export async function consultarCnpjReceita(cnpjBruto: string): Promise<DadosCnpj> {
  const cnpj = limparCnpj(cnpjBruto);

  let res: Response;
  try {
    res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: AbortSignal.timeout(8000),
      // Sem User-Agent o Cloudflare na frente da BrasilAPI responde 403 (bloqueio de bot).
      headers: { "User-Agent": "AutoPecasSystem/1.0 (+https://sistemanegocios.com.br)" },
    });
  } catch {
    throw new Error("Não foi possível verificar o CNPJ agora. Tente novamente em instantes.");
  }

  if (res.status === 404) {
    throw new Error("CNPJ não encontrado na Receita Federal. Confira se digitou certo.");
  }
  if (!res.ok) {
    throw new Error("Não foi possível verificar o CNPJ agora. Tente novamente em instantes.");
  }

  const d = await res.json();
  if (!d.razao_social) {
    throw new Error("A Receita Federal não retornou a razão social desse CNPJ.");
  }

  return {
    razaoSocial: d.razao_social,
    nomeFantasia: d.nome_fantasia || null,
    situacao: d.descricao_situacao_cadastral || "",
    cep: d.cep ? String(d.cep) : null,
    logradouro: [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(" ") || null,
    numero: d.numero || null,
    complemento: d.complemento || null,
    bairro: d.bairro || null,
    municipio: d.municipio || null,
    uf: d.uf || null,
    codMunicipio: d.codigo_municipio_ibge ? String(d.codigo_municipio_ibge) : null,
    telefone: d.ddd_telefone_1 || null,
  };
}
