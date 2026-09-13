/**
 * Geração de CSV compatível com Excel em português:
 * separador ";", quebra de linha CRLF, BOM UTF-8 e decimal com vírgula.
 */

export type CsvCell = string | number | null | undefined;

const BOM = String.fromCharCode(0xfeff);

function campo(v: CsvCell): string {
  if (v == null) return "";
  let s: string;
  if (typeof v === "number") {
    // sem separador de milhar (Excel-BR não interpreta como número se tiver)
    s = Number.isFinite(v) ? String(v).replace(".", ",") : "";
  } else {
    s = String(v);
  }
  if (/[";\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(linhas: CsvCell[][]): string {
  return BOM + linhas.map((l) => l.map(campo).join(";")).join("\r\n") + "\r\n";
}

/** Remove o que não for seguro num nome de arquivo dentro de header HTTP. */
export function nomeSeguroArquivo(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120) || "relatorio";
}

/** Monta a resposta HTTP de download de um CSV. */
export function csvResponse(nome: string, linhas: CsvCell[][]): Response {
  return new Response(toCsv(linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeSeguroArquivo(nome)}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Sufixo de data pro nome do arquivo, ex. "2026-09-09". */
export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Arredonda pra 2 casas (valores em R$). */
export const r2 = (n: number): number => Math.round(n * 100) / 100;
/** Arredonda pra 1 casa (percentuais). */
export const r1 = (n: number): number => Math.round(n * 10) / 10;

/** Data no formato dd/mm/aaaa pra célula de CSV. */
export const dataBR = (d: Date | null | undefined): string =>
  d ? d.toLocaleDateString("pt-BR") : "";
