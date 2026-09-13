import Link from "next/link";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { money, date } from "@/lib/format";
import { importXml } from "./actions";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, string> = {
  IMPORTADO: "bg-gray-100 text-gray-600",
  LANCADO: "bg-green-100 text-green-700",
  MANIFESTADO: "bg-blue-100 text-blue-700",
  IGNORADO: "bg-red-100 text-red-700",
};

export default async function XmlPage({
  searchParams,
}: {
  searchParams: Promise<{ direcao?: string; msg?: string }>;
}) {
  const { db } = await requireDb();
  const { direcao, msg } = await searchParams;
  const docs = await db.xmlDocument.findMany({
    where: direcao ? { direcao } : undefined,
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="XML"
        subtitle="Importação e gestão de documentos fiscais eletrônicos"
      />

      {msg && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {msg}
        </div>
      )}

      <section className="card mb-6 p-5">
        <h2 className="mb-3 font-semibold">Importar XML de entrada</h2>
        <form action={importXml} className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="arquivos"
            accept=".xml,text/xml,application/xml"
            multiple
            required
            className="text-sm"
          />
          <SubmitButton>Importar</SubmitButton>
          <span className="text-xs text-muted">
            NF-e (modelo 55/65) e NFS-e (padrão ABRASF). Vários arquivos de uma vez.
          </span>
        </form>
      </section>

      <div className="mb-4 flex gap-2">
        {[
          { label: "Todos", value: "" },
          { label: "Entrada (compras)", value: "ENTRADA" },
          { label: "Saída (emitidos)", value: "SAIDA" },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/xml?direcao=${f.value}` : "/xml"}
            className={`badge border ${
              (direcao ?? "") === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Emitente</th>
              <th className="th">Tipo / Nº</th>
              <th className="th">Emissão</th>
              <th className="th text-right">Itens</th>
              <th className="th text-right">Valor</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={6}>
                  Nenhum XML. Importe um arquivo acima ou emita uma nota.
                </td>
              </tr>
            )}
            {docs.map((d) => (
              <tr key={d.id} className="hover:bg-background">
                <td className="td">
                  <Link
                    href={`/xml/${d.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {d.direcao === "ENTRADA"
                      ? d.emitenteNome ?? "Fornecedor"
                      : d.destinatarioNome ?? "Consumidor"}
                  </Link>
                  {d.chaveAcesso && (
                    <span className="block font-mono text-[10px] text-muted">
                      {d.chaveAcesso}
                    </span>
                  )}
                </td>
                <td className="td">
                  {d.tipo} {d.numero ? `nº ${d.numero}` : ""}
                </td>
                <td className="td text-muted">{date(d.dataEmissao)}</td>
                <td className="td text-right">{d._count.items}</td>
                <td className="td text-right font-medium">{money(d.valorTotal)}</td>
                <td className="td">
                  <span className={`badge ${statusBadge[d.status] ?? ""}`}>
                    {d.status.toLowerCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
