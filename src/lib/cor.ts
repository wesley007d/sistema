/** Utilidades de cor para o tema por empresa. */

const HEX = /^#?([0-9a-fA-F]{6})$/;

/** Valida e normaliza um hex "#rrggbb"; devolve null se inválido. */
export function normalizarHex(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const m = HEX.exec(valor.trim());
  return m ? `#${m[1].toLowerCase()}` : null;
}

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mistura a cor com branco (t=1 → branco) ou preto (t=-1 → preto). */
function mix(hex: string, t: number): string {
  const [r, g, b] = toRgb(hex);
  const alvo = t >= 0 ? 255 : 0;
  const k = Math.abs(t);
  return toHex([r + (alvo - r) * k, g + (alvo - g) * k, b + (alvo - b) * k]);
}

export function escurecer(hex: string, t = 0.12): string {
  return mix(hex, -t);
}
export function clarear(hex: string, t = 0.88): string {
  return mix(hex, t);
}
export function rgba(hex: string, a: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Gera o bloco `:root { ... }` que reskina o sistema para a empresa:
 * cor de destaque + tema claro/escuro (troca a paleta inteira).
 * Retorna "" quando não há nada para personalizar.
 */
export function cssTemaEmpresa(opts: {
  cor?: string | null;
  tema?: string | null;
}): string {
  const hex = normalizarHex(opts.cor);
  const escuro = opts.tema === "escuro";
  if (!hex && !escuro) return "";

  const accent = hex ?? "#1f6feb";
  const linhas: string[] = [
    `--primary:${accent}`,
    `--primary-hover:${escuro ? clarear(accent, 0.14) : escurecer(accent, 0.12)}`,
    `--ring:${rgba(accent, 0.32)}`,
  ];

  if (escuro) {
    linhas.push(
      "--background:#0f1421",
      "--surface:#171d2c",
      "--surface-2:#1f2739",
      "--foreground:#e6eaf2",
      "--muted:#98a3b8",
      "--border:#2b3446",
      "--border-strong:#3b4660",
      `--primary-soft:${rgba(accent, 0.22)}`,
      "color-scheme:dark",
    );
  } else {
    linhas.push(`--primary-soft:${clarear(accent, 0.9)}`);
  }

  return `:root{${linhas.join(";")};}`;
}
