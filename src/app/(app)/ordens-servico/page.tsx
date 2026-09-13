import Link from "next/link";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { money, date } from "@/lib/format";
import { OSStatusBadge } from "./OSStatusBadge";

export const dynamic = "force-dynamic";

export default async function OrdensServicoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { db } = await requireDb();
  const { status } = await searchParams;
  const ordens = await db.serviceOrder.findMany({
    where: status ? { status } : undefined,
    include: { partner: true, vehicle: true, _count: { select: { items: true } } },
    orderBy: { numero: "desc" },
    take: 200,
  });

  const filtros = [
    { label: "Todas", value: "" },
    { label: "Orçamento", value: "ORCAMENTO" },
    { label: "Aprovada", value: "APROVADA" },
    { label: "Em execução", value: "EM_EXECUCAO" },
    { label: "Concluída", value: "CONCLUIDA" },
    { label: "Entregue", value: "ENTREGUE" },
  ];

  return (
    <div>
      <PageHeader
        title="Ordens de Serviço"
        subtitle={`${ordens.length} OS`}
        action={{ href: "/ordens-servico/nova", label: "+ Nova OS" }}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {filtros.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/ordens-servico?status=${f.value}` : "/ordens-servico"}
            className={`badge border ${
              (status ?? "") === f.value
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
              <th className="th">Nº</th>
              <th className="th">Cliente</th>
              <th className="th">Veículo</th>
              <th className="th">Abertura</th>
              <th className="th text-right">Itens</th>
              <th className="th text-right">Total</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {ordens.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={7}>
                  Nenhuma OS.{" "}
                  <Link href="/ordens-servico/nova" className="text-primary">
                    Abrir a primeira
                  </Link>
                </td>
              </tr>
            )}
            {ordens.map((os) => (
              <tr key={os.id} className="hover:bg-background">
                <td className="td">
                  <Link
                    href={`/ordens-servico/${os.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {os.numero}
                  </Link>
                </td>
                <td className="td">{os.partner?.nome ?? "—"}</td>
                <td className="td text-muted">
                  {os.vehicle
                    ? `${os.vehicle.marca ?? ""} ${os.vehicle.modelo ?? ""} ${
                        os.vehicle.placa ? `(${os.vehicle.placa})` : ""
                      }`.trim()
                    : "—"}
                </td>
                <td className="td text-muted">{date(os.createdAt)}</td>
                <td className="td text-right">{os._count.items}</td>
                <td className="td text-right font-medium">{money(os.total)}</td>
                <td className="td">
                  <OSStatusBadge status={os.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
