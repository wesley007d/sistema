/**
 * Assinatura / mensalidade da empresa.
 *
 * O sistema é vendido por mensalidade. `Company.assinaturaStatus` é a alavanca
 * manual que a dona controla na Área do Dono; além disso há um vencimento
 * automático a partir de `assinaturaVence`.
 */

/** Dias de tolerância depois do vencimento antes de bloquear o acesso. */
export const TOLERANCIA_DIAS = 5;

/**
 * Mensalidade padrão (R$) — usada em toda empresa nova e como sugestão na
 * Área do Dono. Cobrada quando a implantação foi feita para o cliente; o
 * valor real de cada empresa fica em `Company.assinaturaValor` e pode ser
 * ajustado individualmente (ex.: sem implantação).
 */
export const MENSALIDADE_PADRAO = 170;

/** Dias de teste grátis para toda empresa nova. */
export const DIAS_TESTE_GRATIS = 7;

const MS_DIA = 86_400_000;

export type AssinaturaInput = {
  assinaturaStatus: string | null | undefined;
  assinaturaVence: Date | null | undefined;
};

export type SituacaoAssinatura = {
  status: string;
  vence: Date | null;
  /** dias até vencer (negativo = já venceu). null quando não há vencimento. */
  diasRestantes: number | null;
  /** true = acesso ao sistema deve ser bloqueado. */
  bloqueada: boolean;
  /** true = venceu mas ainda dentro da tolerância (avisa, não bloqueia). */
  emAtraso: boolean;
};

export function situacaoAssinatura(
  c: AssinaturaInput,
  agora: Date = new Date(),
): SituacaoAssinatura {
  const status = (c.assinaturaStatus || "TESTE").toUpperCase();
  const vence = c.assinaturaVence ?? null;
  const diasRestantes = vence
    ? Math.ceil((vence.getTime() - agora.getTime()) / MS_DIA)
    : null;

  let bloqueada = false;
  let emAtraso = false;

  if (status === "CANCELADA" || status === "VENCIDA") {
    bloqueada = true;
  } else if (diasRestantes !== null && diasRestantes < 0) {
    if (diasRestantes < -TOLERANCIA_DIAS) bloqueada = true;
    else emAtraso = true;
  }

  return { status, vence, diasRestantes, bloqueada, emAtraso };
}

const ROTULOS: Record<string, string> = {
  TESTE: "Período de teste",
  ATIVA: "Ativa",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
};

export function rotuloStatusAssinatura(status: string): string {
  return ROTULOS[status.toUpperCase()] ?? status;
}
