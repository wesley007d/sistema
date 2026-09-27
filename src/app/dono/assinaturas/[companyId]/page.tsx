import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PLATAFORMA_COMPANY_ID, requireOwner } from "@/lib/auth";
import { ConfirmButton } from "@/components/ConfirmButton";
import { rotuloStatusAssinatura, situacaoAssinatura } from "@/lib/assinatura";
import { excluirPagamento } from "../../actions";
import { SenhaProvisoriaButton } from "./SenhaProvisoriaButton";

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

  const [pagamentos, usuarios] = await Promise.all([
    prisma.assinaturaPagamento.findMany({
      where: { companyId },
      orderBy: { pagoEm: "desc" },
    }),
    prisma.user.findMany({
      where: { companyId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        senhaProvisoria: true,
        ultimoLogin: true,
      },
    }),
  ]);

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

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Acessos ({usuarios.length})
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th text-left">Usuário</th>
                <th className="th text-left">Login (e-mail)</th>
                <th className="th text-left">Papel</th>
                <th className="th text-left">Último login</th>
                <th className="th text-left">Senha</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 && (
                <tr>
                  <td className="td text-muted" colSpan={5}>
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-border align-top">
                  <td className="td">
                    <div className="font-medium">{u.nome}</div>
                    {!u.ativo && <div className="text-xs text-red-600">inativo</div>}
                  </td>
                  <td className="td font-mono text-xs select-all">{u.email}</td>
                  <td className="td">{u.role === "ADMIN" ? "Admin" : "Funcionário"}</td>
                  <td className="td text-muted">
                    {u.ultimoLogin ? u.ultimoLogin.toLocaleString("pt-BR") : "nunca entrou"}
                  </td>
                  <td className="td">
                    {u.senhaProvisoria && (
                      <div className="mb-1 text-xs text-amber-700">
                        provisória (ainda não trocou)
                      </div>
                    )}
                    <SenhaProvisoriaButton userId={u.id} email={u.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          A senha que a pessoa criou não pode ser vista (fica guardada
          embaralhada). Para acessar, gere uma senha provisória — a senha antiga
          para de funcionar e, no próximo login, o sistema obriga a criar uma nova.
          Avise o cliente.
        </p>
      </section>

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
