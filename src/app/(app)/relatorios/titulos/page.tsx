import Link from "next/link";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ReportNav } from "@/components/ReportNav";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { money } from "@/lib/format";
import { carregarRelatorioTitulos, type AgingBucket } from "@/lib/relatorios";

export const dynamic = "force-dynamic";

export default async function RelatorioTitulosPage() {
  const { db } = await requireDb();
  const {
    hoje,
    receber,
    pagar,
    topReceber,
    topPagar,
    totalReceber,
    totalPagar,
    vencidoReceber,
    vencidoPagar,
  } = await carregarRelatorioTitulos(db);

  return (
    <div>
      <PageHeader
        title="Recebíveis e dívidas"
        subtitle={`Posição em ${hoje.toLocaleDateString("pt-BR")}`}
        action={
          <div className="flex gap-2">
            <ExportPdfButton href="/relatorios/titulos/imprimir" />
            <ExportCsvButton href="/relatorios/titulos/export" />
          </div>
        }
      />
      <ReportNav active="/relatorios/titulos" />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card title="Total a receber" value={money(totalReceber)} accent="text-green-700" />
        <Card
          title="Receber vencido"
          value={money(vencidoReceber)}
          accent="text-red-600"
        />
        <Card title="Total a pagar" value={money(totalPagar)} accent="text-red-600" />
        <Card title="Pagar vencido" value={money(vencidoPagar)} accent="text-red-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Aging titulo="Contas a receber" buckets={receber} total={totalReceber} />
        <Aging titulo="Contas a pagar" buckets={pagar} total={totalPagar} />
        <TopParceiros
          titulo="Maiores devedores (clientes)"
          lista={topReceber.slice(0, 10)}
          href="/financeiro/titulos?tipo=RECEBER"
        />
        <TopParceiros
          titulo="Maiores credores (fornecedores)"
          lista={topPagar.slice(0, 10)}
          href="/financeiro/titulos?tipo=PAGAR"
        />
      </div>
    </div>
  );
}

function Aging({
  titulo,
  buckets,
  total,
}: {
  titulo: string;
  buckets: AgingBucket[];
  total: number;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.valor));
  return (
    <section className="card">
      <header className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">{titulo}</h2>
      </header>
      <div className="space-y-2 p-4 text-sm">
        {buckets.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between">
              <span className={b.label === "Vencido" ? "text-red-600" : ""}>
                {b.label}
              </span>
              <span className="font-medium">{money(b.valor)}</span>
            </div>
            <div className="mt-1 h-2 rounded bg-background">
              <div
                className={`h-2 rounded ${
                  b.label === "Vencido" ? "bg-red-500" : "bg-primary"
                }`}
                style={{ width: `${(b.valor / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 font-bold">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
      </div>
    </section>
  );
}

function TopParceiros({
  titulo,
  lista,
  href,
}: {
  titulo: string;
  lista: { nome: string; valor: number }[];
  href: string;
}) {
  return (
    <section className="card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">{titulo}</h2>
        <Link href={href} className="text-sm text-primary">
          ver títulos
        </Link>
      </header>
      <div className="divide-y divide-border text-sm">
        {lista.length === 0 && <p className="px-4 py-6 text-muted">Nada em aberto.</p>}
        {lista.map((p) => (
          <div key={p.nome} className="flex justify-between px-4 py-2">
            <span>{p.nome}</span>
            <span className="font-medium">{money(p.valor)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Card({
  title,
  value,
  accent = "",
}: {
  title: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <p className={`mt-2 text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
