import { onlyDigits } from "@/lib/format";

/** Digito verificador modulo 11 (NF-e / chave de acesso) */
export function mod11(base: string): number {
  let weight = 2;
  let sum = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    sum += Number(base[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  const dv = 11 - rest;
  return dv >= 10 ? 0 : dv;
}

export interface ChaveParams {
  uf: string; // codigo IBGE da UF (ex.: "35" SP)
  dataEmissao: Date;
  cnpj: string;
  modelo: string; // "55" NF-e, "65" NFC-e
  serie: number;
  numero: number;
  tpEmis?: string; // "1" normal
  codigoNumerico?: number; // cNF - 8 digitos
}

/** Monta a chave de acesso de 44 digitos com o DV calculado */
export function gerarChaveAcesso(p: ChaveParams): string {
  const uf = p.uf.padStart(2, "0");
  const aamm =
    p.dataEmissao.getFullYear().toString().slice(2) +
    String(p.dataEmissao.getMonth() + 1).padStart(2, "0");
  const cnpj = onlyDigits(p.cnpj).padStart(14, "0");
  const mod = p.modelo.padStart(2, "0");
  const serie = String(p.serie).padStart(3, "0");
  const numero = String(p.numero).padStart(9, "0");
  const tpEmis = (p.tpEmis ?? "1").padStart(1, "0");
  const cNF = String(
    p.codigoNumerico ?? Math.floor(Math.random() * 1e8),
  ).padStart(8, "0");

  const base = `${uf}${aamm}${cnpj}${mod}${serie}${numero}${tpEmis}${cNF}`;
  const dv = mod11(base);
  return `${base}${dv}`;
}

export function formatChave(chave: string): string {
  return (chave.match(/.{1,4}/g) ?? []).join(" ");
}

// Codigos IBGE das UFs (2 primeiros digitos da chave)
export const UF_IBGE: Record<string, string> = {
  RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17",
  MA: "21", PI: "22", CE: "23", RN: "24", PB: "25", PE: "26", AL: "27",
  SE: "28", BA: "29", MG: "31", ES: "32", RJ: "33", SP: "35", PR: "41",
  SC: "42", RS: "43", MS: "50", MT: "51", GO: "52", DF: "53",
};
