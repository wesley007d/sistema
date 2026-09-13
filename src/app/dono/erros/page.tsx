import { prisma } from "@/lib/db";
import { PLATAFORMA_COMPANY_ID } from "@/lib/auth";
import { ConfirmButton } from "@/components/ConfirmButton";
import { limparErrosAntigos, excluirErro } from "./actions";

export const dynamic = "force-dynamic";

function fmtData(d: Date) {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ErrosPage() {
  const erros = await prisma.errorLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const companyIds = [...new Set(erros.map((e) => e.companyId).filter((v): v is string => !!v))];
  const userIds = [...new Set(erros.map((e) => e.userId).filter((v): v is string => !!v))];
  const [empresas, usuarios] = await Promise.all([
    companyIds.length
      ? prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: { id: true, nomeFantasia: true, razaoSocial: true },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nome: true } })
      : Promise.resolve([]),
  ]);
  const nomeEmpresa = new Map(
    empresas.map((e) => [
      e.id,
      e.id === PLATAFORMA_COMPANY_ID ? "Plataforma" : e.nomeFantasia || e.razaoSocial,
    ]),
  );
  const nomeUsuario = new Map(usuarios.map((u) => [u.id, u.nome]));

  const agoraMs = new Date().getTime();
  const total24h = erros.filter(
    (e) => e.createdAt.getTime() >= agoraMs - 86_400_000,
  ).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Erros do sistema
          </h1>
          <p className="mt-1 text-sm text-muted">
            Exceções capturadas em produção (últimos {erros.length}, máx. 200).
          </p>
        </div>
        <form action={limparErrosAntigos} className="flex items-center gap-2">
          <label className="text-sm text-muted" htmlFor="dias">
            Limpar com mais de
          </label>
          <input
            id="dias"
            name="dias"
            type="number"
            min={1}
            defaultValue={30}
            className="input w-20"
          />
          <span className="text-sm text-muted">dias</span>
          <ConfirmButton
            message="Apagar erros antigos permanentemente?"
            className="btn-ghost"
          >
            Limpar
          </ConfirmButton>
        </form>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-surface-2 px-4 py-2.5 text-sm">
        <span>
          <span className="text-muted">Nas últimas 24h: </span>
          <span className="font-semibold">{total24h}</span>
        </span>
        <span>
          <span className="text-muted">Total listado: </span>
          <span className="font-semibold">{erros.length}</span>
        </span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Quando</th>
              <th className="th">Origem</th>
              <th className="th">Rota</th>
              <th className="th">Mensagem</th>
              <th className="th">Empresa</th>
              <th className="th">Usuário</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {erros.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={7}>
                  Nenhum erro registrado. 🎉
                </td>
              </tr>
            )}
            {erros.map((e) => (
              <tr key={e.id} className="align-top">
                <td className="td whitespace-nowrap text-muted">
                  {fmtData(e.createdAt)}
                </td>
                <td className="td">
                  <span
                    className={`badge ${
                      e.origem === "SERVIDOR"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {e.origem === "SERVIDOR" ? "Servidor" : "Cliente"}
                  </span>
                </td>
                <td className="td text-muted">{e.rota ?? "—"}</td>
                <td className="td max-w-md">
                  <p className="truncate font-medium" title={e.mensagem}>
                    {e.mensagem}
                  </p>
                  {e.stack && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-primary">
                        stack
                      </summary>
                      <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap text-[11px] text-muted">
                        {e.stack}
                      </pre>
                    </details>
                  )}
                </td>
                <td className="td text-muted">
                  {e.companyId ? nomeEmpresa.get(e.companyId) ?? e.companyId : "—"}
                </td>
                <td className="td text-muted">
                  {e.userId ? nomeUsuario.get(e.userId) ?? e.userId : "—"}
                </td>
                <td className="td">
                  <form action={excluirErro.bind(null, e.id)}>
                    <button type="submit" className="text-xs text-muted hover:text-red-600">
                      excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
