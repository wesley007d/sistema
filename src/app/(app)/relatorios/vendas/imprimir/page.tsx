import { requireDb } from "@/lib/auth";
import { resolvePeriod } from "@/lib/period";
import { carregarRelatorioVendas } from "@/lib/relatorios";
import { money, num } from "@/lib/format";
import { ReportPrintLayout, ReportPrintSection } from "@/components/ReportPrintLayout";

export const dynamic = "force-dynamic";

export default async function ImprimirVendasPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; preset?: string }>;
}) {
  const { user, db } = await requireDb();
  const sp = await searchParams;
  const period = resolvePeriod(sp);
  const [rel, company] = await Promise.all([
    carregarRelatorioVendas(db, period),
    db.company.findUnique({ where: { id: user.companyId } }),
  ]);

  return (
    <ReportPrintLayout
      empresa={company}
      titulo="Relatório de vendas"
      subtitulo={period.label}
    >
      <ReportPrintSection titulo="Formas de pagamento">
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">Forma</th>
              <th className="border border-black p-1 text-right">Qtd</th>
              <th className="border border-black p-1 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rel.pagamentos.length === 0 && (
              <tr>
                <td className="border border-black p-1" colSpan={3}>
                  Sem pagamentos no período.
                </td>
              </tr>
            )}
            {rel.pagamentos.map((p) => (
              <tr key={p.forma}>
                <td className="border border-black p-1 capitalize">
                  {p.forma.toLowerCase()}
                </td>
                <td className="border border-black p-1 text-right">{num(p.qtd)}</td>
                <td className="border border-black p-1 text-right">{money(p.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportPrintSection>

      <ReportPrintSection titulo="Vendas por operador">
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">Operador</th>
              <th className="border border-black p-1 text-right">Qtd vendas</th>
              <th className="border border-black p-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rel.porOperador.length === 0 && (
              <tr>
                <td className="border border-black p-1" colSpan={3}>
                  Sem vendas no período.
                </td>
              </tr>
            )}
            {rel.porOperador.map((o) => (
              <tr key={o.nome}>
                <td className="border border-black p-1">{o.nome}</td>
                <td className="border border-black p-1 text-right">{num(o.qtd)}</td>
                <td className="border border-black p-1 text-right">{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportPrintSection>

      <ReportPrintSection titulo="Produtos mais vendidos">
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">Produto</th>
              <th className="border border-black p-1 text-left">SKU</th>
              <th className="border border-black p-1 text-right">Qtd</th>
              <th className="border border-black p-1 text-right">Receita</th>
              <th className="border border-black p-1 text-right">Custo</th>
              <th className="border border-black p-1 text-right">Margem</th>
            </tr>
          </thead>
          <tbody>
            {rel.maisVendidos.length === 0 && (
              <tr>
                <td className="border border-black p-1" colSpan={6}>
                  Sem vendas no período.
                </td>
              </tr>
            )}
            {rel.maisVendidos.map((p) => (
              <tr key={p.sku}>
                <td className="border border-black p-1">{p.nome}</td>
                <td className="border border-black p-1">{p.sku}</td>
                <td className="border border-black p-1 text-right">{num(p.qtd)}</td>
                <td className="border border-black p-1 text-right">{money(p.receita)}</td>
                <td className="border border-black p-1 text-right">{money(p.custo)}</td>
                <td className="border border-black p-1 text-right">
                  {p.margem.toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportPrintSection>

      {rel.maisServicos.length > 0 && (
        <ReportPrintSection titulo="Serviços mais executados (OS)">
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-left">Serviço</th>
                <th className="border border-black p-1 text-right">Qtd</th>
                <th className="border border-black p-1 text-right">Receita</th>
              </tr>
            </thead>
            <tbody>
              {rel.maisServicos.map((s) => (
                <tr key={s.nome}>
                  <td className="border border-black p-1">{s.nome}</td>
                  <td className="border border-black p-1 text-right">{num(s.qtd)}</td>
                  <td className="border border-black p-1 text-right">{money(s.receita)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportPrintSection>
      )}
    </ReportPrintLayout>
  );
}
