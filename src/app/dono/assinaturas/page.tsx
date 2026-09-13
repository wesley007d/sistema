import Link from "next/link";
import { prisma } from "@/lib/db";
import { PLATAFORMA_COMPANY_ID, requireOwner } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";
import {
  MENSALIDADE_PADRAO,
  rotuloStatusAssinatura,
  situacaoAssinatura,
} from "@/lib/assinatura";
import { atualizarAssinatura, registrarPagamento } from "../actions";

export const dynamic = "force-dynamic";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const isoDate = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";
const fmtData = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("pt-BR") : "—";

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

const STATUS_OPCOES = [
  { v: "TESTE", label: "Período de teste" },
  { v: "ATIVA", label: "Ativa (pagando)" },
  { v: "VENCIDA", label: "Vencida (bloquear)" },
  { v: "CANCELADA", label: "Cancelada (bloquear)" },
];

export default async function DonoAssinaturasPage() {
  await requireOwner();
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioProxMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  const empresas = await prisma.company.findMany({
    where: { id: { not: PLATAFORMA_COMPANY_ID } },
    orderBy: { createdAt: "asc" },
  });

  const ids = empresas.map((e) => e.id);

  // último pagamento de cada empresa (volume baixo — 1 query, reduz em memória)
  const pagamentos = await prisma.assinaturaPagamento.findMany({
    where: { companyId: { in: ids } },
    orderBy: { pagoEm: "desc" },
  });
  const ultimoPgto = new Map<string, (typeof pagamentos)[number]>();
  for (const p of pagamentos)
    if (!ultimoPgto.has(p.companyId)) ultimoPgto.set(p.companyId, p);

  const recebidoMes = pagamentos
    .filter((p) => p.pagoEm >= inicioMes && p.pagoEm < inicioProxMes)
    .reduce((a, p) => a + p.valor, 0);

  const linhas = empresas.map((e) => ({
    e,
    s: situacaoAssinatura(
      { assinaturaStatus: e.assinaturaStatus, assinaturaVence: e.assinaturaVence },
      agora,
    ),
  }));

  const mrr = linhas
    .filter((l) => l.s.status === "ATIVA")
    .reduce((a, l) => a + l.e.assinaturaValor, 0);
  const previstoMes = linhas
    .filter((l) => l.s.status === "ATIVA" || l.s.status === "TESTE")
    .reduce((a, l) => a + l.e.assinaturaValor, 0);
  const nAtivas = linhas.filter((l) => l.s.status === "ATIVA").length;
  const nTeste = linhas.filter((l) => l.s.status === "TESTE").length;
  const nBloqueadas = linhas.filter((l) => l.s.bloqueada).length;
  const aVencer7 = linhas.filter(
    (l) =>
      l.s.diasRestantes !== null &&
      l.s.diasRestantes >= 0 &&
      l.s.diasRestantes <= 7,
  ).length;

  const badge = (l: (typeof linhas)[number]) => {
    if (l.s.bloqueada) return "bg-red-100 text-red-700";
    if (l.s.emAtraso) return "bg-amber-100 text-amber-700";
    if (l.s.status === "ATIVA") return "bg-green-100 text-green-700";
    return "bg-surface-2 text-muted";
  };

  // ordena: bloqueadas e em atraso primeiro, depois por vencimento mais próximo
  const ord = [...linhas].sort((a, b) => {
    const pa = a.s.bloqueada ? 0 : a.s.emAtraso ? 1 : 2;
    const pb = b.s.bloqueada ? 0 : b.s.emAtraso ? 1 : 2;
    if (pa !== pb) return pa - pb;
    return (a.s.diasRestantes ?? 1e9) - (b.s.diasRestantes ?? 1e9);
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Assinaturas e mensalidades
          </h1>
          <p className="mt-1 text-sm text-muted">
            Controle o pagamento de cada empresa. Vencida ou cancelada bloqueia o
            acesso da equipe (você continua com acesso normal).
          </p>
        </div>
        <Link href="/dono" className="text-sm text-primary hover:underline">
          ← Visão geral
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Receita mensal (MRR)" valor={brl(mrr)} hint={`${nAtivas} ativas`} />
        <Kpi label="Recebido no mês" valor={brl(recebidoMes)} hint="pagamentos lançados" />
        <Kpi label="Previsto no mês" valor={brl(previstoMes)} hint="ativas + em teste" />
        <Kpi label="Em teste" valor={String(nTeste)} />
        <Kpi label="Bloqueadas" valor={String(nBloqueadas)} hint="vencidas / canceladas" />
        <Kpi label="Vencem em 7 dias" valor={String(aVencer7)} />
      </div>

      <div className="mt-8 space-y-4">
        {ord.map(({ e, s }) => {
          const ult = ultimoPgto.get(e.id);
          return (
            <section key={e.id} className="card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">
                    {e.nomeFantasia || e.razaoSocial}{" "}
                    <span className={`badge ${badge({ e, s })}`}>
                      {s.bloqueada
                        ? "Bloqueada"
                        : s.emAtraso
                          ? "Em atraso"
                          : rotuloStatusAssinatura(s.status)}
                    </span>
                  </h3>
                  <p className="text-xs text-muted">
                    {e.cnpj || "sem CNPJ"} ·{" "}
                    {s.vence
                      ? `vence ${fmtData(s.vence)}${
                          s.diasRestantes !== null
                            ? s.diasRestantes < 0
                              ? ` (há ${Math.abs(s.diasRestantes)} d)`
                              : ` (em ${s.diasRestantes} d)`
                            : ""
                        }`
                      : "sem vencimento definido"}
                    {" · "}mensalidade {brl(e.assinaturaValor)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {ult
                      ? `Último pagamento: ${brl(ult.valor)} em ${fmtData(ult.pagoEm)}`
                      : "Nenhum pagamento registrado ainda"}
                    {" · "}
                    <Link
                      href={`/dono/assinaturas/${e.id}`}
                      className="text-primary hover:underline"
                    >
                      ver histórico
                    </Link>
                  </p>
                  {e.assinaturaObs && (
                    <p className="mt-1 text-xs text-muted">Obs.: {e.assinaturaObs}</p>
                  )}
                </div>

                <details className="w-full sm:w-auto">
                  <summary className="btn-primary inline-block cursor-pointer select-none px-3 py-1.5 text-sm [&::-webkit-details-marker]:hidden">
                    Registrar pagamento
                  </summary>
                  <form
                    action={registrarPagamento.bind(null, e.id)}
                    className="mt-3 grid gap-2 rounded-lg border border-border bg-surface-2 p-3 sm:w-80"
                  >
                    <div>
                      <label className="label">Valor recebido (R$)</label>
                      <input
                        name="valor"
                        inputMode="decimal"
                        defaultValue={String(e.assinaturaValor || MENSALIDADE_PADRAO)}
                        placeholder={String(e.assinaturaValor || MENSALIDADE_PADRAO)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Data do pagamento</label>
                      <input
                        name="pagoEm"
                        type="date"
                        defaultValue={isoDate(agora)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Forma (opcional)</label>
                      <input
                        name="metodo"
                        placeholder="PIX, dinheiro, transferência…"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Observação (opcional)</label>
                      <input name="obs" className="input" />
                    </div>
                    <p className="text-xs text-muted">
                      Marca a empresa como <strong>Ativa</strong> e adia o
                      vencimento em 1 mês.
                    </p>
                    <SubmitButton className="btn-primary text-sm">
                      Confirmar pagamento
                    </SubmitButton>
                  </form>
                </details>
              </div>

              <form
                action={atualizarAssinatura.bind(null, e.id)}
                className="grid gap-3 border-t border-border pt-3 sm:grid-cols-4"
              >
                <div>
                  <label className="label">Situação</label>
                  <select name="status" defaultValue={s.status} className="input">
                    {STATUS_OPCOES.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Mensalidade (R$)</label>
                  <input
                    name="valor"
                    inputMode="decimal"
                    defaultValue={String(e.assinaturaValor || MENSALIDADE_PADRAO)}
                    placeholder={String(MENSALIDADE_PADRAO)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Próximo vencimento</label>
                  <input
                    name="vence"
                    type="date"
                    defaultValue={isoDate(e.assinaturaVence)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Observação</label>
                  <input
                    name="obs"
                    defaultValue={e.assinaturaObs ?? ""}
                    className="input"
                  />
                </div>
                <div className="sm:col-span-4">
                  <SubmitButton className="btn-ghost">Salvar assinatura</SubmitButton>
                </div>
              </form>
            </section>
          );
        })}
        {ord.length === 0 && (
          <p className="text-sm text-muted">Nenhuma empresa cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}
