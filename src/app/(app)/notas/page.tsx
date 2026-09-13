import Link from "next/link";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { money, dateTime } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

export const dynamic = "force-dynamic";

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { db } = await requireDb();
  const { tipo } = await searchParams;
  const notas = await db.invoice.findMany({
    where: tipo ? { tipo } : undefined,
    include: { partner: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const filtros = [
    { label: "Todas", value: "" },
    { label: "NF-e (produto)", value: "NFE" },
    { label: "NFS-e (serviço)", value: "NFSE" },
  ];

  return (
    <div>
      <PageHeader
        title="Notas Fiscais"
        subtitle={`${notas.length} nota(s)`}
        action={
          <div className="flex gap-2">
            <Link href="/notas/nova-nfe" className="btn-primary">
              + NF-e produto
            </Link>
            <Link href="/notas/nova-nfse" className="btn-ghost">
              + NFS-e serviço
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex gap-2">
        {filtros.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/notas?tipo=${f.value}` : "/notas"}
            className={`badge border ${
              (tipo ?? "") === f.value
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
              <th className="th">Nº / Série</th>
              <th className="th">Tipo</th>
              <th className="th">Destinatário</th>
              <th className="th">Emissão</th>
              <th className="th text-right">Valor</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {notas.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={6}>
                  Nenhuma nota emitida ainda.
                </td>
              </tr>
            )}
            {notas.map((nf) => (
              <tr key={nf.id} className="hover:bg-background">
                <td className="td">
                  <Link
                    href={`/notas/${nf.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {nf.numero}
                  </Link>
                  <span className="text-muted"> / {nf.serie}</span>
                </td>
                <td className="td">{nf.tipo}</td>
                <td className="td">{nf.partner?.nome ?? "Consumidor"}</td>
                <td className="td text-muted">
                  {nf.emitidaEm ? dateTime(nf.emitidaEm) : "—"}
                </td>
                <td className="td text-right font-medium">{money(nf.valorTotal)}</td>
                <td className="td">
                  <StatusBadge status={nf.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
