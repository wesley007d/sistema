/**
 * Uso de compute do banco (Neon, plano grátis = 100 CU-hora por mês; estourou,
 * o banco PARA até o mês seguinte). Consulta a API do Neon com NEON_API_KEY.
 *
 * Usado para: (1) mostrar o uso na Área do Dono; (2) desligar sozinho o
 * "manter acordado" (instrumentation.ts) quando o uso fica perto do limite;
 * (3) mandar e-mail de alerta para ALERTA_CADASTRO_EMAIL.
 */
import { enviarEmail } from "@/lib/email";

const API = "https://console.neon.tech/api/v2";
export const LIMITE_CU_HORAS = Number(process.env.NEON_LIMITE_CU_HORAS) || 100;
/** Acima disso o "manter acordado" para (o uso normal da loja continua). */
export const PARAR_ACORDADO_USADO = 0.7; // 70% do limite já gasto
export const PARAR_ACORDADO_PROJECAO = 0.85; // ou projeção do mês > 85%
const CACHE_MS = 60 * 60 * 1000; // consulta a API no máximo 1x por hora

export interface UsoNeon {
  usadoCuH: number;
  limiteCuH: number;
  pct: number; // 0..1
  projecaoCuH: number;
  pctProjecao: number;
  inicio: Date;
  fim: Date;
  consultadoEm: Date;
  /** false = o "manter acordado" está desligado para poupar a cota */
  acordadoLiberado: boolean;
}

type Estado = {
  uso: UsoNeon | null;
  erro: string | null;
  consultadoEmMs: number;
  projetoId: string | null;
  alertasEnviados: Set<string>;
};
const g = globalThis as unknown as { __neonUso?: Estado };
const estado: Estado = (g.__neonUso ??= {
  uso: null,
  erro: null,
  consultadoEmMs: 0,
  projetoId: null,
  alertasEnviados: new Set(),
});

export function neonConfigurado(): boolean {
  return !!process.env.NEON_API_KEY?.trim();
}

async function api<T>(caminho: string): Promise<T> {
  const r = await fetch(`${API}${caminho}`, {
    headers: {
      Authorization: `Bearer ${process.env.NEON_API_KEY!.trim()}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`API do Neon respondeu ${r.status}`);
  return r.json() as Promise<T>;
}

/** Acha o projeto do banco que o sistema usa (pelo host do DATABASE_URL). */
async function projetoId(): Promise<string> {
  if (process.env.NEON_PROJECT_ID?.trim()) return process.env.NEON_PROJECT_ID.trim();
  if (estado.projetoId) return estado.projetoId;
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").hostname;
    } catch {
      return "";
    }
  })();
  const endpointId = host.split(".")[0].replace(/-pooler$/, "");
  const { projects } = await api<{ projects: { id: string }[] }>("/projects");
  if (!projects?.length) throw new Error("Nenhum projeto encontrado nessa chave do Neon.");
  let achado = projects.length === 1 ? projects[0].id : null;
  if (!achado) {
    for (const p of projects) {
      const { endpoints } = await api<{ endpoints: { id: string }[] }>(
        `/projects/${p.id}/endpoints`,
      );
      if (endpoints?.some((e) => e.id === endpointId)) {
        achado = p.id;
        break;
      }
    }
  }
  if (!achado) throw new Error("Não achei o projeto do Neon deste banco (DATABASE_URL).");
  estado.projetoId = achado;
  return achado;
}

async function consultarApi(): Promise<UsoNeon> {
  const id = await projetoId();
  const { project } = await api<{
    project: {
      compute_time_seconds?: number;
      consumption_period_start?: string;
      consumption_period_end?: string;
    };
  }>(`/projects/${id}`);
  const usadoCuH = (project.compute_time_seconds ?? 0) / 3600;
  const agora = new Date();
  const inicio = project.consumption_period_start
    ? new Date(project.consumption_period_start)
    : new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
  const fim =
    project.consumption_period_end && !project.consumption_period_end.startsWith("0001")
      ? new Date(project.consumption_period_end)
      : new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1));
  const total = Math.max(1, fim.getTime() - inicio.getTime());
  const decorrido = Math.min(total, Math.max(1, agora.getTime() - inicio.getTime()));
  // projeção linear; nos 2 primeiros dias é instável, usa no mínimo o já gasto
  const projecaoCuH = Math.max(usadoCuH, (usadoCuH * total) / decorrido);
  const pct = usadoCuH / LIMITE_CU_HORAS;
  const pctProjecao = projecaoCuH / LIMITE_CU_HORAS;
  return {
    usadoCuH,
    limiteCuH: LIMITE_CU_HORAS,
    pct,
    projecaoCuH,
    pctProjecao,
    inicio,
    fim,
    consultadoEm: agora,
    acordadoLiberado:
      pct < PARAR_ACORDADO_USADO &&
      (decorrido / total < 0.1 || pctProjecao < PARAR_ACORDADO_PROJECAO),
  };
}

async function alertar(uso: UsoNeon) {
  const para = process.env.ALERTA_CADASTRO_EMAIL;
  if (!para || !process.env.RESEND_API_KEY) return;
  const periodo = uso.inicio.toISOString().slice(0, 10);
  const nivel = uso.pct >= 0.9 ? "90" : uso.pct >= 0.7 ? "70" : !uso.acordadoLiberado ? "proj" : null;
  if (!nivel) return;
  const chave = `${periodo}:${nivel}`;
  if (estado.alertasEnviados.has(chave)) return;
  estado.alertasEnviados.add(chave);
  const h = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  try {
    await enviarEmail({
      to: para,
      subject: `Banco de dados: ${Math.round(uso.pct * 100)}% da cota do mês usada`,
      html: `<div style="font-family:sans-serif;line-height:1.6;color:#111">
        <p>O banco do Auto Peças System (Neon, plano grátis) já usou
        <b>${h(uso.usadoCuH)} de ${h(uso.limiteCuH)} horas</b> de processamento neste mês
        (projeção para o fim do mês: <b>${h(uso.projecaoCuH)} h</b>).</p>
        <p>O "manter o banco acordado" foi <b>desligado automaticamente</b> para poupar a cota —
        o sistema continua funcionando, só o primeiro clique depois de um tempo parado fica
        um pouco mais lento.</p>
        <p>Se a cota chegar a 100%, o banco para até o próximo mês. Para evitar: plano pago
        do Neon (Launch) em console.neon.tech.</p>
      </div>`,
    });
  } catch (e) {
    estado.alertasEnviados.delete(chave);
    console.error("Falha ao mandar alerta de uso do Neon:", e);
  }
}

/**
 * Uso atual (cache de 1 h). Sem NEON_API_KEY devolve null. Nunca lança: em
 * erro guarda a mensagem em `erroUsoNeon()` e devolve o último valor conhecido.
 */
export async function usoNeon(forcar = false): Promise<UsoNeon | null> {
  if (!neonConfigurado()) return null;
  if (!forcar && estado.uso && Date.now() - estado.consultadoEmMs < CACHE_MS) {
    return estado.uso;
  }
  estado.consultadoEmMs = Date.now(); // evita martelar a API se ela falhar
  try {
    estado.uso = await consultarApi();
    estado.erro = null;
    await alertar(estado.uso);
  } catch (e) {
    estado.erro = e instanceof Error ? e.message : String(e);
  }
  return estado.uso;
}

export function erroUsoNeon(): string | null {
  return estado.erro;
}

/** Pode mandar o "select 1" para manter o banco acordado? */
export async function podeManterAcordado(): Promise<boolean> {
  const uso = await usoNeon();
  // sem chave/sem dado: segue (o horário 8h–19h já limita a ~72 h no pior caso)
  return uso ? uso.acordadoLiberado : true;
}
