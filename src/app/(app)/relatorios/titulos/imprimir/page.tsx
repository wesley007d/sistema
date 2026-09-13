import { requireDb } from "@/lib/auth";
import { carregarRelatorioTitulos } from "@/lib/relatorios";
import { money, date } from "@/lib/format";
import { ReportPrintLayout, ReportPrintSection } from "@/components/ReportPrintLayout";

export const dynamic = "force-dynamic";

export default async function ImprimirTitulosPage() {
  const { user, db } = await requireDb();
  const [rel, company] = await Promise.all([
    carregarRelatorioTitulos(db),
    db.company.findUnique({ where: { id: user.companyId } }),
  ]);

  return (
    <ReportPrintLayout
      empresa={company}
      titulo="Recebíveis e dívidas"
      subtitulo={`Posição em ${rel.hoje.toLocaleDateString("pt-BR")}`}
    >
      <ReportPrintSection titulo="Resumo">
        <table className="w-full border-collapse border border-black">
          <tbody>
            <tr>
              <td className="border border-black p-1">Total a receber</td>
              <td className="border border-black p-1 text-right">
                {money(rel.totalReceber)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1">Receber vencido</td>
              <td className="border border-black p-1 text-right">
                {money(rel.vencidoReceber)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1">Total a pagar</td>
              <td className="border border-black p-1 text-right">
                {money(rel.totalPagar)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1">Pagar vencido</td>
              <td className="border border-black p-1 text-right">
                {money(rel.vencidoPagar)}
              </td>
            </tr>
          </tbody>
        </table>
      </ReportPrintSection>

      <ReportPrintSection titulo="Contas a receber (aging)">
        <AgingTable buckets={rel.receber} />
      </ReportPrintSection>

      <ReportPrintSection titulo="Contas a pagar (aging)">
        <AgingTable buckets={rel.pagar} />
      </ReportPrintSection>

      <ReportPrintSection titulo="Maiores devedores (clientes)">
        <ParceiroTable lista={rel.topReceber} />
      </ReportPrintSection>

      <ReportPrintSection titulo="Maiores credores (fornecedores)">
        <ParceiroTable lista={rel.topPagar} />
      </ReportPrintSection>

      <ReportPrintSection titulo={`Títulos em aberto (${rel.titulos.length})`}>
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">Tipo</th>
              <th className="border border-black p-1 text-left">Parceiro</th>
              <th className="border border-black p-1 text-left">Descrição</th>
              <th className="border border-black p-1 text-left">Categoria</th>
              <th className="border border-black p-1 text-right">Vencimento</th>
              <th className="border border-black p-1 text-right">Valor</th>
              <th className="border border-black p-1 text-right">Pago</th>
              <th className="border border-black p-1 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rel.titulos.length === 0 && (
              <tr>
                <td className="border border-black p-1" colSpan={8}>
                  Nada em aberto.
                </td>
              </tr>
            )}
            {rel.titulos.map((t, i) => (
              <tr key={i}>
                <td className="border border-black p-1">{t.tipo}</td>
                <td className="border border-black p-1">{t.parceiro}</td>
                <td className="border border-black p-1">{t.descricao}</td>
                <td className="border border-black p-1">{t.categoria}</td>
                <td className="border border-black p-1 text-right">
                  {date(t.vencimento)}
                </td>
                <td className="border border-black p-1 text-right">{money(t.valor)}</td>
                <td className="border border-black p-1 text-right">
                  {money(t.valorPago)}
                </td>
                <td className="border border-black p-1 text-right">{money(t.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportPrintSection>
    </ReportPrintLayout>
  );
}

function AgingTable({ buckets }: { buckets: { label: string; valor: number }[] }) {
  return (
    <table className="w-full border-collapse border border-black">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-black p-1 text-left">Faixa</th>
          <th className="border border-black p-1 text-right">Valor</th>
        </tr>
      </thead>
      <tbody>
        {buckets.map((b) => (
          <tr key={b.label}>
            <td className="border border-black p-1">{b.label}</td>
            <td className="border border-black p-1 text-right">{money(b.valor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ParceiroTable({ lista }: { lista: { nome: string; valor: number }[] }) {
  return (
    <table className="w-full border-collapse border border-black">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-black p-1 text-left">Parceiro</th>
          <th className="border border-black p-1 text-right">Saldo</th>
        </tr>
      </thead>
      <tbody>
        {lista.length === 0 && (
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              Nada em aberto.
            </td>
          </tr>
        )}
        {lista.map((p) => (
          <tr key={p.nome}>
            <td className="border border-black p-1">{p.nome}</td>
            <td className="border border-black p-1 text-right">{money(p.valor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
