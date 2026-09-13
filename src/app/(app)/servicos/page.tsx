import Link from "next/link";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { CatalogoTabs } from "@/components/CatalogoTabs";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ServicosPage() {
  const { db } = await requireDb();
  const servicos = await db.service.findMany({ orderBy: { nome: "asc" } });
  return (
    <div>
      <CatalogoTabs />
      <PageHeader
        title="Serviços / Mão de obra"
        subtitle={`${servicos.length} serviço(s) — o preço pode ser ajustado na hora da venda`}
        action={{ href: "/servicos/novo", label: "+ Novo serviço" }}
      />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Código</th>
              <th className="th">Serviço</th>
              <th className="th">Lista LC 116</th>
              <th className="th text-right">ISS %</th>
              <th className="th text-right">Preço</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {servicos.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={6}>
                  Nenhum serviço.{" "}
                  <Link href="/servicos/novo" className="text-primary">
                    Cadastrar o primeiro
                  </Link>
                </td>
              </tr>
            )}
            {servicos.map((s) => (
              <tr key={s.id} className="hover:bg-background">
                <td className="td font-mono text-xs">{s.codigo}</td>
                <td className="td">
                  <Link
                    href={`/servicos/${s.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {s.nome}
                  </Link>
                  {!s.ativo && (
                    <span className="badge ml-2 bg-gray-100 text-gray-500">
                      inativo
                    </span>
                  )}
                </td>
                <td className="td text-muted">{s.itemListaServico ?? "-"}</td>
                <td className="td text-right">{s.aliquotaIss}%</td>
                <td className="td text-right font-medium">{money(s.preco)}</td>
                <td className="td text-right">
                  <Link href={`/servicos/${s.id}`} className="text-xs text-primary">
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
