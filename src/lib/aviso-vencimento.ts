import { prisma } from "@/lib/db";
import { situacaoAssinatura, TOLERANCIA_DIAS } from "@/lib/assinatura";
import { enviarEmail } from "@/lib/email";
import { PLATAFORMA_COMPANY_ID } from "@/lib/auth";

const MS_DIA = 86_400_000;

function diasEntre(vence: Date, agora: Date): number {
  const a = new Date(vence.toDateString()).getTime();
  const b = new Date(agora.toDateString()).getTime();
  return Math.round((a - b) / MS_DIA);
}

/** Qual aviso disparar hoje, dado o tanto de dias até o vencimento (negativo = já venceu). */
function tipoAviso(diasRestantes: number, bloqueada: boolean, emAtraso: boolean): string | null {
  if (diasRestantes === 3) return "lembrete_3d";
  if (diasRestantes === 0) return "vence_hoje";
  if (diasRestantes === -1 && emAtraso) return "atraso";
  if (bloqueada && diasRestantes === -(TOLERANCIA_DIAS + 1)) return "bloqueada";
  return null;
}

const ASSUNTOS: Record<string, string> = {
  lembrete_3d: "Sua assinatura vence em 3 dias",
  vence_hoje: "Sua assinatura vence hoje",
  atraso: "Assinatura vencida — regularize para evitar bloqueio",
  bloqueada: "Acesso bloqueado por falta de pagamento",
};

function corpoEmail(tipo: string, empresa: string, valor: number, vence: Date): string {
  const dataFmt = vence.toLocaleDateString("pt-BR", { timeZone: "America/Manaus" });
  const valorFmt = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const mensagens: Record<string, string> = {
    lembrete_3d: `A mensalidade do <b>Auto Peças System</b> da empresa <b>${empresa}</b> vence em <b>${dataFmt}</b> (${valorFmt}). Acesse o sistema e gere o Pix na tela "Assinatura" para regularizar antes do vencimento.`,
    vence_hoje: `A mensalidade (${valorFmt}) da empresa <b>${empresa}</b> vence <b>hoje</b> (${dataFmt}). Gere o Pix dentro do sistema para não perder o acesso.`,
    atraso: `A mensalidade da empresa <b>${empresa}</b> venceu em ${dataFmt} e ainda não identificamos o pagamento. Você tem alguns dias de tolerância antes do bloqueio automático do acesso.`,
    bloqueada: `O acesso da empresa <b>${empresa}</b> foi bloqueado por falta de pagamento da mensalidade vencida em ${dataFmt}. Gere o Pix assim que possível para reativar.`,
  };
  return `<div style="font-family:sans-serif;line-height:1.6;color:#111">${mensagens[tipo]}</div>`;
}

export type ResultadoAviso = { companyId: string; tipo: string; sucesso: boolean };

/**
 * Varre as empresas com vencimento próximo/passado e dispara e-mail pros
 * ADMINs, um único envio por (empresa, tipo, vencimento) — chamada pelo cron
 * externo em /api/cron/aviso-vencimento.
 */
export async function enviarAvisosVencimento(agora: Date = new Date()): Promise<ResultadoAviso[]> {
  const empresas = await prisma.company.findMany({
    where: {
      id: { not: PLATAFORMA_COMPANY_ID },
      assinaturaVence: { not: null },
      assinaturaStatus: { in: ["ATIVA", "TESTE"] },
    },
    include: { users: { where: { role: "ADMIN", ativo: true }, select: { email: true } } },
  });

  const resultados: ResultadoAviso[] = [];

  for (const empresa of empresas) {
    if (!empresa.assinaturaVence) continue;
    const sit = situacaoAssinatura(empresa, agora);
    const diasRestantes = diasEntre(empresa.assinaturaVence, agora);
    const tipo = tipoAviso(diasRestantes, sit.bloqueada, sit.emAtraso);
    if (!tipo) continue;

    const destinatarios = [...new Set(empresa.users.map((u) => u.email))];
    if (destinatarios.length === 0) continue;

    const jaEnviado = await prisma.avisoVencimento.findUnique({
      where: {
        companyId_tipo_venceRef: {
          companyId: empresa.id,
          tipo,
          venceRef: empresa.assinaturaVence,
        },
      },
    });
    if (jaEnviado) continue;

    let sucesso = true;
    let erro: string | undefined;
    try {
      const html = corpoEmail(
        tipo,
        empresa.nomeFantasia || empresa.razaoSocial,
        empresa.assinaturaValor,
        empresa.assinaturaVence,
      );
      for (const email of destinatarios) {
        await enviarEmail({ to: email, subject: ASSUNTOS[tipo], html });
      }
    } catch (e) {
      sucesso = false;
      erro = e instanceof Error ? e.message : String(e);
    }

    await prisma.avisoVencimento.create({
      data: {
        companyId: empresa.id,
        tipo,
        venceRef: empresa.assinaturaVence,
        destinatarios: destinatarios.join(","),
        sucesso,
        erro,
      },
    });
    resultados.push({ companyId: empresa.id, tipo, sucesso });
  }

  return resultados;
}
