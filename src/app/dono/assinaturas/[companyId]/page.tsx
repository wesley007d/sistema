import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PLATAFORMA_COMPANY_ID, requireOwner } from "@/lib/auth";
import { ConfirmButton } from "@/components/ConfirmButton";
import { rotuloStatusAssinatura, situacaoAssinatura } from "@/lib/assinatura";
import { excluirPagamento } from "../../actions";

export const dynamic = "force-dynamic";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("pt-BR") : "—";

export default async function HistoricoAssinaturaPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  await requireOwner();
  const { companyId } = await params;
  if (companyId === PLATAFORMA_COMPANY_ID) notFound();

  const empresa = await prisma.company.findUnique({ where: { id: companyId } });
  if (!empresa) notFound();

  const pagamentos = await prisma.assinaturaPagamento.findMany({
    where: { companyId },
    orderBy: { pagoEm: "desc" },
  });

  const s = situacaoAssinatura({
    assinaturaStatus: empresa.assinaturaStatus,
    assinaturaVence: empresa.assinaturaVence,
  });

  const total = pagamentos.reduce((a, p) => a + p.valor, 0);
  const agora = new Date();
  const ano = agora.getFullYear();
  const recebidoAno = pagamentos
    .filter((p) => p.pagoEm.getFullYear() === ano)
    .reduce((a, p) => a + p.valor, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {empresa.nomeFantasia || empresa.razaoSocial}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Histórico de pagamentos ·{" "}
            {s.bloqueada
              ? "Bloqueada"
              : s.emAtraso
                ? "Em atraso"
                : rotuloStatusAssinatura(s.status)}
            {" · "}
            {s.vence ? `vence ${fmtData(s.vence)}` : "sem vencimento"}
            {" · "}mensalidade {brl(empresa.assinaturaValor)}
          </p>
        </div>
        <Link
          href="/dono/assinaturas"
          className="text-sm text-primary hover:underline"
        >
          ← Assinaturas
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Pagamentos
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {pagamentos.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Total recebido
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{brl(total)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Recebido em {ano}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {brl(recebidoAno)}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        {pagamentos.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum pagamento registrado. Use “Registrar pagamento” na tela de
            assinaturas.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th text-left">Data</th>
                <th className="th text-right">Valor</th>
                <th className="th text-left">Forma</th>
                <th className="th text-left">Vencimento (antes → depois)</th>
                <th className="th text-left">Observação</th>
                <th className="th text-left">Lançado por</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2">{fmtData(p.pagoEm)}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {brl(p.valor)}
                  </td>
                  <td className="px-3 py-2">{p.metodo || "—"}</td>
                  <td className="px-3 py-2 text-muted">
                    {fmtData(p.venceAnterior)} → {fmtData(p.venceNovo)}
                  </td>
                  <td className="px-3 py-2 text-muted">{p.obs || "—"}</td>
                  <td className="px-3 py-2 text-muted">
                    {p.registradoPor || "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <form action={excluirPagamento.bind(null, p.id, companyId)}>
                      <ConfirmButton
                        message="Apagar este lançamento de pagamento? O vencimento não muda."
                        className="btn-ghost text-xs text-red-600"
                      >
                        excluir
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-muted">
        Cada “Registrar pagamento” marca a empresa como Ativa e empurra o
        vencimento em 1 mês. Excluir um lançamento aqui só remove o registro do
        histórico — não recalcula o vencimento.
      </p>
    </div>
  );
}
