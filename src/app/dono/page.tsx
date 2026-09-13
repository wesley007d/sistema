import Link from "next/link";
import { prisma } from "@/lib/db";
import { MODULES, ONLINE_JANELA_MS, PLATAFORMA_COMPANY_ID } from "@/lib/auth";
import { situacaoAssinatura } from "@/lib/assinatura";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (d: Date) =>
  d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

function diasAtras(d: Date, agoraMs: number): number {
  return Math.floor((agoraMs - d.getTime()) / 86_400_000);
}

function tempoRelativo(d: Date | null, agoraMs: number): string {
  if (!d) return "nunca";
  const s = Math.floor((agoraMs - d.getTime()) / 1000);
  if (s < 60) return "agora mesmo";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 30) return `há ${dias} d`;
  return `há ${Math.floor(dias / 30)} m`;
}

function maxData(...ds: (Date | null | undefined)[]): Date | null {
  let r: Date | null = null;
  for (const d of ds) if (d && (!r || d > r)) r = d;
  return r;
}

function Kpi({ label, valor, hint }: { label: string; valor: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{valor}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Gráfico de barras verticais simples, sem biblioteca. */
function Barras({ dados }: { dados: { rotulo: string; valor: number }[] }) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  return (
    <div className="flex h-36 items-end gap-1.5">
      {dados.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t-sm bg-primary"
              style={{ height: `${(d.valor / max) * 100}%` }}
              title={`${d.rotulo}: ${d.valor}`}
            />
          </div>
          <span className="text-[10px] leading-none text-muted">{d.valor}</span>
          <span className="text-[10px] leading-tight text-muted">{d.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

export default async function DonoPage() {
  const agora = new Date();
  const agoraMs = agora.getTime();
  const limiteOnline = new Date(agoraMs - ONLINE_JANELA_MS);
  const d1 = new Date(agoraMs - 1 * 86_400_000);
  const d7 = new Date(agoraMs - 7 * 86_400_000);
  const d14 = new Date(agoraMs - 14 * 86_400_000);
  const d30 = new Date(agoraMs - 30 * 86_400_000);

  const [
    empresas,
    usuarios,
    sessoesAtivas,
    sessoesTodas,
    prodPorEmpresa,
    vendasPorEmpresa,
    osPorEmpresa,
    ultVendaPorEmpresa,
    ultOsPorEmpresa,
    ultNotaPorEmpresa,
    acoesVenda7,
    acoesOs7,
    acoesNota7,
    acoesEstoque7,
    atividadeDia14,
    atividadeModulo30,
  ] = await Promise.all([
    prisma.company.findMany({
      where: { id: { not: PLATAFORMA_COMPANY_ID } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        companyId: true,
        ativo: true,
        ultimoLogin: true,
        createdAt: true,
      },
    }),
    prisma.session.findMany({
      where: { expiraEm: { gt: agora } },
      orderBy: { ultimaAtividade: "desc" },
      include: {
        user: { select: { nome: true, email: true, role: true, companyId: true } },
      },
    }),
    prisma.session.findMany({
      select: { ultimaAtividade: true, user: { select: { companyId: true } } },
    }),
    prisma.product.groupBy({ by: ["companyId"], _count: { _all: true } }),
    prisma.sale.groupBy({
      by: ["companyId"],
      where: { status: "FINALIZADA" },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.serviceOrder.groupBy({ by: ["companyId"], _count: { _all: true } }),
    prisma.sale.groupBy({ by: ["companyId"], _max: { createdAt: true } }),
    prisma.serviceOrder.groupBy({ by: ["companyId"], _max: { createdAt: true } }),
    prisma.invoice.groupBy({ by: ["companyId"], _max: { createdAt: true } }),
    prisma.sale.groupBy({
      by: ["companyId"],
      where: { createdAt: { gte: d7 } },
      _count: { _all: true },
    }),
    prisma.serviceOrder.groupBy({
      by: ["companyId"],
      where: { createdAt: { gte: d7 } },
      _count: { _all: true },
    }),
    prisma.invoice.groupBy({
      by: ["companyId"],
      where: { createdAt: { gte: d7 } },
      _count: { _all: true },
    }),
    prisma.stockMovement.groupBy({
      by: ["companyId"],
      where: { createdAt: { gte: d7 } },
      _count: { _all: true },
    }),
    prisma.atividadeDia.findMany({
      where: { dia: { gte: d14 } },
      select: { dia: true, userId: true },
    }),
    prisma.atividadeModulo.groupBy({
      by: ["modulo"],
      where: { dia: { gte: d30 } },
      _sum: { acoes: true },
      _count: { _all: true },
    }),
  ]);

  const num = (rows: { companyId: string; _count: { _all: number } }[]) =>
    new Map(rows.map((r) => [r.companyId, r._count._all]));
  const maxCreated = (rows: { companyId: string; _max: { createdAt: Date | null } }[]) =>
    new Map(rows.map((r) => [r.companyId, r._max.createdAt]));

  const pCount = num(prodPorEmpresa);
  const vCount = num(vendasPorEmpresa);
  const vSum = new Map(vendasPorEmpresa.map((r) => [r.companyId, r._sum.total ?? 0]));
  const oCount = num(osPorEmpresa);
  const ultVenda = maxCreated(ultVendaPorEmpresa);
  const ultOs = maxCreated(ultOsPorEmpresa);
  const ultNota = maxCreated(ultNotaPorEmpresa);

  const acoes7 = new Map<string, number>();
  for (const rows of [acoesVenda7, acoesOs7, acoesNota7, acoesEstoque7])
    for (const r of rows)
      acoes7.set(r.companyId, (acoes7.get(r.companyId) ?? 0) + r._count._all);

  // --- usuários por empresa + "visto por último" por usuário ---
  const usuariosPorEmpresa = new Map<string, number>();
  for (const u of usuarios)
    usuariosPorEmpresa.set(u.companyId, (usuariosPorEmpresa.get(u.companyId) ?? 0) + 1);

  const vistoPorUsuario = new Map<string, Date | null>();
  for (const u of usuarios) vistoPorUsuario.set(u.id, u.ultimoLogin);

  // sessões (todas) contribuem com atividade mais recente por usuário e por empresa
  const atividadePorEmpresa = new Map<string, Date | null>();
  for (const s of sessoesTodas) {
    const cid = s.user.companyId;
    const atual = atividadePorEmpresa.get(cid) ?? null;
    if (!atual || s.ultimaAtividade > atual)
      atividadePorEmpresa.set(cid, s.ultimaAtividade);
  }

  // usuários ativos (DAU/WAU/MAU) — aproximado: último login OU sessão ativa recente
  const sessaoRecentePorUsuario = new Map<string, Date>();
  for (const s of sessoesAtivas) {
    const cur = sessaoRecentePorUsuario.get(s.userId);
    if (!cur || s.ultimaAtividade > cur)
      sessaoRecentePorUsuario.set(s.userId, s.ultimaAtividade);
  }
  let dau = 0;
  let wau = 0;
  let mau = 0;
  for (const u of usuarios) {
    if (u.companyId === PLATAFORMA_COMPANY_ID) continue;
    const visto = maxData(u.ultimoLogin, sessaoRecentePorUsuario.get(u.id) ?? null);
    if (!visto) continue;
    if (visto >= d1) dau++;
    if (visto >= d7) wau++;
    if (visto >= d30) mau++;
  }

  // --- histórico real de usuários ativos por dia (Fase 2, tabela AtividadeDia) ---
  const diasHist: { rotulo: string; valor: number; chave: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(agoraMs - i * 86_400_000);
    const chave = dt.toISOString().slice(0, 10);
    diasHist.push({
      chave,
      rotulo: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      valor: 0,
    });
  }
  const idxDia = new Map(diasHist.map((d, i) => [d.chave, i]));
  const usuariosPorDia = new Map<string, Set<string>>();
  for (const a of atividadeDia14) {
    const chave = a.dia.toISOString().slice(0, 10);
    const set = usuariosPorDia.get(chave) ?? new Set<string>();
    set.add(a.userId);
    usuariosPorDia.set(chave, set);
  }
  for (const [chave, set] of usuariosPorDia) {
    const i = idxDia.get(chave);
    if (i !== undefined) diasHist[i].valor = set.size;
  }
  const temHistoricoAtividade = atividadeDia14.length > 0;

  // --- funcionalidades mais usadas (30 dias, tabela AtividadeModulo) ---
  const rotuloModulo = new Map(MODULES.map((m) => [m.key, m.label]));
  const topModulos = atividadeModulo30
    .map((m) => ({
      modulo: m.modulo,
      label: rotuloModulo.get(m.modulo) ?? m.modulo,
      acoes: m._sum.acoes ?? 0,
    }))
    .sort((a, b) => b.acoes - a.acoes)
    .slice(0, 10);

  // --- sessões online agora (exclui donos da plataforma) ---
  const sessoes = sessoesAtivas.filter(
    (s) => s.user.companyId !== PLATAFORMA_COMPANY_ID,
  );
  const online = sessoes.filter((s) => s.ultimaAtividade >= limiteOnline);
  const onlinePorEmpresa = new Map<string, Set<string>>();
  for (const s of online) {
    const set = onlinePorEmpresa.get(s.user.companyId) ?? new Set<string>();
    set.add(s.userId);
    onlinePorEmpresa.set(s.user.companyId, set);
  }
  const onlineUnico = new Map<string, (typeof online)[number]>();
  for (const s of online) if (!onlineUnico.has(s.userId)) onlineUnico.set(s.userId, s);

  const nomeEmpresa = new Map(
    empresas.map((e) => [e.id, e.nomeFantasia || e.razaoSocial]),
  );
  nomeEmpresa.set(PLATAFORMA_COMPANY_ID, "Plataforma (dono)");

  // --- linha por empresa, com status derivado ---
  type Linha = {
    id: string;
    nome: string;
    sub: string | null;
    cnpj: string;
    contato: string;
    criadaEm: Date;
    usuarios: number;
    produtos: number;
    os: number;
    vendas: number;
    faturamento: number;
    acoes7: number;
    online: number;
    ultAtividade: Date | null;
    diasParada: number | null;
    status: "ativa" | "sumindo" | "parada" | "nunca";
  };
  const linhas: Linha[] = empresas.map((e) => {
    const ult = maxData(
      atividadePorEmpresa.get(e.id) ?? null,
      ultVenda.get(e.id) ?? null,
      ultOs.get(e.id) ?? null,
      ultNota.get(e.id) ?? null,
    );
    const dias = ult ? diasAtras(ult, agoraMs) : null;
    let status: Linha["status"];
    if (!ult) status = diasAtras(e.createdAt, agoraMs) <= 3 ? "ativa" : "nunca";
    else if (dias! <= 7) status = "ativa";
    else if (dias! <= 30) status = "sumindo";
    else status = "parada";
    return {
      id: e.id,
      nome: e.nomeFantasia || e.razaoSocial,
      sub: e.nomeFantasia && e.razaoSocial ? e.razaoSocial : null,
      cnpj: e.cnpj || "—",
      contato: [e.email, e.telefone].filter(Boolean).join(" · ") || "—",
      criadaEm: e.createdAt,
      usuarios: usuariosPorEmpresa.get(e.id) ?? 0,
      produtos: pCount.get(e.id) ?? 0,
      os: oCount.get(e.id) ?? 0,
      vendas: vCount.get(e.id) ?? 0,
      faturamento: vSum.get(e.id) ?? 0,
      acoes7: acoes7.get(e.id) ?? 0,
      online: onlinePorEmpresa.get(e.id)?.size ?? 0,
      ultAtividade: ult,
      diasParada: dias,
      status,
    };
  });

  const totalUsuarios = linhas.reduce((a, l) => a + l.usuarios, 0);
  const totalProdutos = linhas.reduce((a, l) => a + l.produtos, 0);
  const totalOs = linhas.reduce((a, l) => a + l.os, 0);
  const totalVendas = linhas.reduce((a, l) => a + l.vendas, 0);
  const totalFat = linhas.reduce((a, l) => a + l.faturamento, 0);
  const nAtivas = linhas.filter((l) => l.status === "ativa").length;
  const nSumindo = linhas.filter((l) => l.status === "sumindo").length;
  const nParadas = linhas.filter(
    (l) => l.status === "parada" || l.status === "nunca",
  ).length;

  // --- crescimento: novas empresas por mês (12 meses) ---
  const meses: { rotulo: string; valor: number; chave: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    meses.push({
      chave: `${dt.getFullYear()}-${dt.getMonth()}`,
      rotulo: dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      valor: 0,
    });
  }
  const idxMes = new Map(meses.map((m, i) => [m.chave, i]));
  for (const e of empresas) {
    const k = `${e.createdAt.getFullYear()}-${e.createdAt.getMonth()}`;
    const i = idxMes.get(k);
    if (i !== undefined) meses[i].valor++;
  }
  const novas30 = empresas.filter((e) => e.createdAt >= d30).length;

  // --- assinaturas: resumo rápido (detalhe em /dono/assinaturas) ---
  const assinaturas = empresas.map((e) =>
    situacaoAssinatura(
      { assinaturaStatus: e.assinaturaStatus, assinaturaVence: e.assinaturaVence },
      agora,
    ),
  );
  const mrr = empresas.reduce(
    (a, e, i) => a + (assinaturas[i].status === "ATIVA" ? e.assinaturaValor : 0),
    0,
  );
  const nBloqueadas = assinaturas.filter((s) => s.bloqueada).length;
  const nAtraso = assinaturas.filter((s) => s.emAtraso).length;

  // ordena a tabela: mais recentemente ativas primeiro
  const linhasOrd = [...linhas].sort(
    (a, b) => (b.ultAtividade?.getTime() ?? 0) - (a.ultAtividade?.getTime() ?? 0),
  );
  const atencao = linhas
    .filter((l) => l.status === "parada" || l.status === "nunca")
    .sort((a, b) => (b.diasParada ?? 1e9) - (a.diasParada ?? 1e9));

  const badgeStatus: Record<Linha["status"], string> = {
    ativa: "bg-green-100 text-green-700",
    sumindo: "bg-amber-100 text-amber-700",
    parada: "bg-red-100 text-red-700",
    nunca: "bg-surface-2 text-muted",
  };
  const rotuloStatus: Record<Linha["status"], string> = {
    ativa: "Ativa",
    sumindo: "Sumindo",
    parada: "Parada",
    nunca: "Nunca usou",
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Visão geral da plataforma
          </h1>
          <p className="mt-1 text-sm text-muted">
            Todas as empresas cadastradas, uso e quem está no sistema agora.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dono/assinaturas"
            className="text-sm font-medium text-primary hover:underline"
          >
            Assinaturas →
          </Link>
          <Link
            href="/dono/erros"
            className="text-sm font-medium text-primary hover:underline"
          >
            Erros →
          </Link>
          <AutoRefresh segundos={20} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-surface-2 px-4 py-2.5 text-sm">
        <span>
          <span className="text-muted">Receita mensal (MRR): </span>
          <span className="font-semibold">{brl(mrr)}</span>
        </span>
        <span>
          <span className="text-muted">Bloqueadas: </span>
          <span className="font-semibold">{nBloqueadas}</span>
        </span>
        <span>
          <span className="text-muted">Em atraso: </span>
          <span className="font-semibold">{nAtraso}</span>
        </span>
        <Link href="/dono/assinaturas" className="text-primary hover:underline">
          gerenciar
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Empresas"
          valor={String(empresas.length)}
          hint={`${nAtivas} ativas · ${nSumindo} sumindo · ${nParadas} paradas`}
        />
        <Kpi
          label="Online agora"
          valor={String(onlineUnico.size)}
          hint={`atividade nos últimos ${Math.round(ONLINE_JANELA_MS / 60000)} min`}
        />
        <Kpi label="Sessões ativas" valor={String(sessoes.length)} hint="logins não expirados" />
        <Kpi
          label="Novas empresas"
          valor={String(novas30)}
          hint="nos últimos 30 dias"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Usuários ativos hoje" valor={String(dau)} hint="login/atividade em 24 h" />
        <Kpi label="Ativos na semana" valor={String(wau)} hint="últimos 7 dias" />
        <Kpi label="Ativos no mês" valor={String(mau)} hint="últimos 30 dias" />
        <Kpi
          label="Usuários"
          valor={String(totalUsuarios)}
          hint="somando todas as empresas"
        />
      </div>

      {/* Crescimento */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Novas empresas por mês (12 meses)
        </h2>
        <div className="card p-5">
          <Barras dados={meses} />
        </div>
      </section>

      {/* Atividade real (Fase 2) */}
      <section className="mt-8 grid gap-3 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Usuários ativos por dia (14 dias)
          </h2>
          <div className="card p-5">
            {temHistoricoAtividade ? (
              <Barras dados={diasHist} />
            ) : (
              <p className="text-sm text-muted">
                Ainda sem histórico — começa a ser registrado a partir de agora
                (cada acesso a um módulo grava o dia). Volte em alguns dias pra
                ver o gráfico preenchido.
              </p>
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Funcionalidades mais usadas (30 dias)
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="th">Módulo</th>
                  <th className="th text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {topModulos.length === 0 && (
                  <tr>
                    <td className="td text-muted" colSpan={2}>
                      Ainda sem dados suficientes.
                    </td>
                  </tr>
                )}
                {topModulos.map((m) => (
                  <tr key={m.modulo}>
                    <td className="td">{m.label}</td>
                    <td className="td text-right">{m.acoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Online agora */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Online agora ({onlineUnico.size})
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Usuário</th>
                <th className="th">Empresa</th>
                <th className="th">Papel</th>
                <th className="th">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {onlineUnico.size === 0 && (
                <tr>
                  <td className="td text-muted" colSpan={4}>
                    Ninguém online nos últimos {Math.round(ONLINE_JANELA_MS / 60000)}{" "}
                    minutos.
                  </td>
                </tr>
              )}
              {[...onlineUnico.values()].map((s) => (
                <tr key={s.userId}>
                  <td className="td">
                    <div className="font-medium">{s.user.nome}</div>
                    <div className="text-xs text-muted">{s.user.email}</div>
                  </td>
                  <td className="td">
                    {nomeEmpresa.get(s.user.companyId) ?? s.user.companyId}
                  </td>
                  <td className="td">
                    <span
                      className={`badge ${
                        s.user.role === "ADMIN"
                          ? "bg-primary-soft text-primary"
                          : "bg-surface-2 text-muted"
                      }`}
                    >
                      {s.user.role === "ADMIN" ? "Admin" : "Funcionário"}
                    </span>
                  </td>
                  <td className="td text-muted">
                    {tempoRelativo(s.ultimaAtividade, agoraMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Empresas */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Empresas ({empresas.length})
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Empresa</th>
                <th className="th">Status</th>
                <th className="th">Último acesso</th>
                <th className="th text-right">Ações 7d</th>
                <th className="th text-right">Online</th>
                <th className="th text-right">Usuários</th>
                <th className="th text-right">Produtos</th>
                <th className="th text-right">OS</th>
                <th className="th text-right">Vendas</th>
                <th className="th text-right">Faturamento</th>
                <th className="th">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {linhasOrd.map((l) => (
                <tr key={l.id}>
                  <td className="td">
                    <div className="font-medium">{l.nome}</div>
                    {l.sub && <div className="text-xs text-muted">{l.sub}</div>}
                  </td>
                  <td className="td">
                    <span className={`badge ${badgeStatus[l.status]}`}>
                      {rotuloStatus[l.status]}
                    </span>
                  </td>
                  <td className="td text-muted">
                    {tempoRelativo(l.ultAtividade, agoraMs)}
                  </td>
                  <td className="td text-right">{l.acoes7}</td>
                  <td className="td text-right">
                    {l.online > 0 ? (
                      <span className="badge bg-green-100 text-green-700">
                        {l.online}
                      </span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="td text-right">{l.usuarios}</td>
                  <td className="td text-right">{l.produtos}</td>
                  <td className="td text-right">{l.os}</td>
                  <td className="td text-right">{l.vendas}</td>
                  <td className="td text-right">{brl(l.faturamento)}</td>
                  <td className="td text-muted">{fmtData(l.criadaEm)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-strong font-medium">
                <td className="td" colSpan={5}>
                  Total
                </td>
                <td className="td text-right">{totalUsuarios}</td>
                <td className="td text-right">{totalProdutos}</td>
                <td className="td text-right">{totalOs}</td>
                <td className="td text-right">{totalVendas}</td>
                <td className="td text-right">{brl(totalFat)}</td>
                <td className="td" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Precisam de atenção */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Precisam de atenção ({atencao.length})
        </h2>
        <p className="mb-3 text-xs text-muted">
          Cadastraram e não usam há mais de 30 dias (ou nunca usaram). Bom momento
          para um contato.
        </p>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Empresa</th>
                <th className="th">Parada</th>
                <th className="th">Contato</th>
                <th className="th text-right">Usuários</th>
                <th className="th text-right">Vendas (total)</th>
                <th className="th">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {atencao.length === 0 && (
                <tr>
                  <td className="td text-muted" colSpan={6}>
                    Nenhuma empresa parada. 🎉
                  </td>
                </tr>
              )}
              {atencao.map((l) => (
                <tr key={l.id}>
                  <td className="td font-medium">{l.nome}</td>
                  <td className="td text-muted">
                    {l.diasParada === null
                      ? "nunca usou"
                      : `há ${l.diasParada} dias`}
                  </td>
                  <td className="td text-muted">{l.contato}</td>
                  <td className="td text-right">{l.usuarios}</td>
                  <td className="td text-right">{l.vendas}</td>
                  <td className="td text-muted">{fmtData(l.criadaEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-xs text-muted">
        &quot;Online agora&quot; = atividade real nos últimos{" "}
        {Math.round(ONLINE_JANELA_MS / 60000)} min. Os KPIs &quot;usuários
        ativos hoje/semana/mês&quot; são aproximados (último login + sessões
        abertas); o gráfico de 14 dias e as funcionalidades mais usadas já vêm
        do histórico real. A página se atualiza sozinha a cada 20&nbsp;s.
      </p>
    </div>
  );
}
