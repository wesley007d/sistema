import Link from "next/link";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { formatCpfCnpj } from "@/lib/format";

export const dynamic = "force-dynamic";

const tipoBadge: Record<string, string> = {
  CLIENTE: "bg-blue-100 text-blue-700",
  FORNECEDOR: "bg-purple-100 text-purple-700",
  AMBOS: "bg-teal-100 text-teal-700",
};

export default async function ParceirosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { db } = await requireDb();
  const { q = "" } = await searchParams;
  const termo = q.trim();
  const parceiros = await db.partner.findMany({
    where: termo
      ? {
          OR: [
            { nome: { contains: termo } },
            { nomeFantasia: { contains: termo } },
            { cpfCnpj: { contains: termo } },
            { email: { contains: termo } },
          ],
        }
      : undefined,
    orderBy: { nome: "asc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Clientes e Fornecedores"
        subtitle={`${parceiros.length} cadastro(s)`}
        action={{ href: "/parceiros/novo", label: "+ Novo cadastro" }}
      />

      <form className="mb-4">
        <input
          name="q"
          defaultValue={termo}
          placeholder="Buscar por nome, documento ou e-mail…"
          className="input max-w-md"
        />
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Nome</th>
              <th className="th">Tipo</th>
              <th className="th">Documento</th>
              <th className="th">Cidade/UF</th>
              <th className="th">Telefone</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {parceiros.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={6}>
                  Nenhum cadastro.{" "}
                  <Link href="/parceiros/novo" className="text-primary">
                    Cadastrar o primeiro
                  </Link>
                </td>
              </tr>
            )}
            {parceiros.map((p) => (
              <tr key={p.id} className="hover:bg-background">
                <td className="td">
                  <Link
                    href={`/parceiros/${p.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {p.nome}
                  </Link>
                  {!p.ativo && (
                    <span className="badge ml-2 bg-gray-100 text-gray-500">
                      inativo
                    </span>
                  )}
                </td>
                <td className="td">
                  <span className={`badge ${tipoBadge[p.tipo] ?? ""}`}>
                    {p.tipo.toLowerCase()}
                  </span>
                </td>
                <td className="td">{formatCpfCnpj(p.cpfCnpj) || "-"}</td>
                <td className="td text-muted">
                  {p.municipio ? `${p.municipio}/${p.uf ?? ""}` : "-"}
                </td>
                <td className="td text-muted">{p.celular || p.telefone || "-"}</td>
                <td className="td text-right">
                  <Link href={`/parceiros/${p.id}`} className="text-xs text-primary">
                    editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
