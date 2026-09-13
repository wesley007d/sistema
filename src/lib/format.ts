const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NUM = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

export function money(value: number | null | undefined): string {
  return BRL.format(Number(value ?? 0));
}

export function num(value: number | null | undefined): string {
  return NUM.format(Number(value ?? 0));
}

export function date(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("pt-BR");
}

export function dateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Converte string vinda de formulario ("1.234,56" ou "1234.56") em number */
export function parseNumber(input: FormDataEntryValue | null | undefined): number {
  if (input == null) return 0;
  let s = String(input).trim();
  if (!s) return 0;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function str(input: FormDataEntryValue | null | undefined): string {
  return input == null ? "" : String(input).trim();
}

export function optStr(input: FormDataEntryValue | null | undefined): string | null {
  const s = str(input);
  return s === "" ? null : s;
}

export function bool(input: FormDataEntryValue | null | undefined): boolean {
  const s = str(input).toLowerCase();
  return s === "on" || s === "true" || s === "1";
}

export function onlyDigits(input: string | null | undefined): string {
  return (input ?? "").replace(/\D/g, "");
}

export function formatCpfCnpj(value: string | null | undefined): string {
  const d = onlyDigits(value);
  if (d.length === 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value ?? "";
}
