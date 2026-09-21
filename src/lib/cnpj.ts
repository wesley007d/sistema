export function limparCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

function digitoVerificador(nums: number[], pesos: number[]): number {
  const soma = nums.reduce((acc, n, i) => acc + n * pesos[i]!, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Valida o CNPJ pelo algoritmo oficial dos dígitos verificadores (sem consultar API nenhuma). */
export function validarCnpj(cnpjBruto: string): boolean {
  const cnpj = limparCnpj(cnpjBruto);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // todos os dígitos iguais nunca é válido

  const nums = cnpj.split("").map(Number);
  const d1 = digitoVerificador(nums.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== nums[12]) return false;
  const d2 = digitoVerificador(nums.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === nums[13];
}

export function formatarCnpj(cnpjBruto: string): string {
  const c = limparCnpj(cnpjBruto);
  if (c.length !== 14) return cnpjBruto;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`;
}
