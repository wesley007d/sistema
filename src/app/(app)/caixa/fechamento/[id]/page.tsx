import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDb } from "@/lib/auth";
import { money, dateTime } from "@/lib/format";
import { resumoSessaoCaixa } from "@/lib/caixa";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function FechamentoCaixaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireDb();
  const { id } = await params;
  const session = await db.cashRegisterSession.findUnique({
    where: { id },
    include: { operador: true, account: true },
  });
  if (!session) notFound();

  const resumo = await resumoSessaoCaixa(db, session);
  const contado = session.valorContado ?? 0;
  const dif = session.diferenca ?? 0;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/caixa" className="text-sm text-primary">
          ← voltar ao caixa
        </Link>
        <PrintButton />
      </div>

      <div className="card p-6">
        <h1 className="text-lg font-bold">Fechamento de caixa</h1>
        <p className="mt-1 text-xs text-muted">
          {session.account.nome}
          {session.operador?.nome ? ` · ${session.operador.nome}` : ""}
        </p>
        <p className="text-xs text-muted">
          Abertura: {dateTime(session.abertoEm)}
          {session.fechadoEm ? ` · Fechamento: ${dateTime(session.fechadoEm)}` : ""}
        </p>

        <div className="mt-4 divide-y divide-border border-y border-border text-sm">
          <Row label="Fundo de abertura" value={money(resumo.abertura)} />
          <Row label="+ Entradas do caixa" value={money(resumo.entradas)} />
          <Row label="− Saídas (sangrias, despesas)" value={`- ${money(resumo.saidas)}`} />
          <Row label="= Esperado na gaveta" value={money(resumo.esperado)} bold />
          <Row label="Valor contado" value={money(contado)} bold />
          <Row
            label={dif > 0 ? "Sobra" : dif < 0 ? "Falta" : "Diferença"}
            value={money(Math.abs(dif))}
            bold
          />
        </div>

        {session.status !== "FECHADO" && (
          <p className="mt-3 text-xs text-amber-700">
            Esta sessão ainda está aberta.
          </p>
        )}
        {session.observacaoFechamento && (
          <p className="mt-3 text-sm">
            <span className="text-muted">Obs.: </span>
            {session.observacaoFechamento}
          </p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-6 text-center text-xs text-muted">
          <div className="border-t border-black/60 pt-1">Conferente</div>
          <div className="border-t border-black/60 pt-1">Responsável</div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between px-1 py-2 ${bold ? "font-bold" : ""}`}>
      <span className={bold ? "" : "text-muted"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

