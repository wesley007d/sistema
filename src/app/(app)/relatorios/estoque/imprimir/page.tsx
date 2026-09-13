import { requireDb } from "@/lib/auth";
import { resolvePeriod } from "@/lib/period";
import { carregarRelatorioEstoque } from "@/lib/relatorios";
import { money, num } from "@/lib/format";
import { ReportPrintLayout, ReportPrintSection } from "@/components/ReportPrintLayout";

export const dynamic = "force-dynamic";

export default async function ImprimirEstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; preset?: string }>;
}) {
  const { user, db } = await requireDb();
  const sp = await searchParams;
  const period = resolvePeriod(sp);
  const [rel, company] = await Promise.all([
    carregarRelatorioEstoque(db, period),
    db.company.findUnique({ where: { id: user.companyId } }),
  ]);

  return (
    <ReportPrintLayout
      empresa={company}
      titulo="Relatório de estoque"
      subtitulo={`Posição atual · giro em ${period.label}`}
    >
      <ReportPrintSection titulo="Resumo">
        <table className="w-full border-collapse border border-black">
          <tbody>
            <tr>
              <td className="border border-black p-1">Itens ativos</td>
              <td className="border border-black p-1 text-right">
                {num(rel.resumo.ativos)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1">Com estoque</td>
              <td className="border border-black p-1 text-right">
                {num(rel.resumo.comEstoque)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1">Valor a custo</td>
              <td className="border border-black p-1 text-right">
                {money(rel.resumo.valorCusto)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1">Valor a preço de venda</td>
              <td className="border border-black p-1 text-right">
                {money(rel.resumo.valorVenda)}
              </td>
            </tr>
          </tbody>
        </table>
      </ReportPrintSection>

      <ReportPrintSection titulo={`Posição de estoque (${rel.produtos.length} itens ativos)`}>
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">SKU</th>
              <th className="border border-black p-1 text-left">Produto</th>
              <th className="border border-black p-1 text-right">Estoque</th>
              <th className="border border-black p-1 text-right">Mínimo</th>
              <th className="border border-black p-1 text-right">Custo unit.</th>
              <th className="border border-black p-1 text-right">Venda unit.</th>
              <th className="border border-black p-1 text-right">Valor custo</th>
              <th className="border border-black p-1 text-right">Valor venda</th>
            </tr>
          </thead>
          <tbody>
            {rel.produtos.map((p) => (
              <tr key={p.id}>
                <td className="border border-black p-1">{p.sku}</td>
                <td className="border border-black p-1">{p.nome}</td>
                <td className="border border-black p-1 text-right">{num(p.estoque)}</td>
                <td className="border border-black p-1 text-right">
                  {num(p.estoqueMinimo)}
                </td>
                <td className="border border-black p-1 text-right">
                  {money(p.precoCusto)}
                </td>
                <td className="border border-black p-1 text-right">
                  {money(p.precoVenda)}
                </td>
                <td className="border border-black p-1 text-right">
                  {money(p.estoque * p.precoCusto)}
                </td>
                <td className="border border-black p-1 text-right">
                  {money(p.estoque * p.precoVenda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportPrintSection>

      <ReportPrintSection titulo={`Abaixo do mínimo (${rel.abaixoMin.length})`}>
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">SKU</th>
              <th className="border border-black p-1 text-left">Produto</th>
              <th className="border border-black p-1 text-right">Estoque</th>
              <th className="border border-black p-1 text-right">Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {rel.abaixoMin.length === 0 && (
              <tr>
                <td className="border border-black p-1" colSpan={4}>
                  Tudo acima do mínimo.
                </td>
              </tr>
            )}
            {rel.abaixoMin.map((p) => (
              <tr key={p.id}>
                <td className="border border-black p-1">{p.sku}</td>
                <td className="border border-black p-1">{p.nome}</td>
                <td className="border border-black p-1 text-right">{num(p.estoque)}</td>
                <td className="border border-black p-1 text-right">
                  {num(p.estoqueMinimo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportPrintSection>

      <ReportPrintSection titulo={`Sem giro no período (${rel.semGiro.length})`}>
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">SKU</th>
              <th className="border border-black p-1 text-left">Produto</th>
              <th className="border border-black p-1 text-right">Estoque</th>
              <th className="border border-black p-1 text-right">Valor a custo</th>
            </tr>
          </thead>
          <tbody>
            {rel.semGiro.length === 0 && (
              <tr>
                <td className="border border-black p-1" colSpan={4}>
                  Todos os itens tiveram saída.
                </td>
              </tr>
            )}
            {rel.semGiro.map((p) => (
              <tr key={p.id}>
                <td className="border border-black p-1">{p.sku}</td>
                <td className="border border-black p-1">{p.nome}</td>
                <td className="border border-black p-1 text-right">{num(p.estoque)}</td>
                <td className="border border-black p-1 text-right">
                  {money(p.estoque * p.precoCusto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportPrintSection>

      <ReportPrintSection titulo="Mais movimentados (saídas no período)">
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">SKU</th>
              <th className="border border-black p-1 text-left">Produto</th>
              <th className="border border-black p-1 text-right">Saídas</th>
              <th className="border border-black p-1 text-right">Estoque atual</th>
              <th className="border border-black p-1 text-right">Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {rel.maisSaida.length === 0 && (
              <tr>
                <td className="border border-black p-1" colSpan={5}>
                  Sem saídas no período.
                </td>
              </tr>
            )}
            {rel.maisSaida.map(({ prod, qtd }) => {
              const porDia = qtd / rel.dias;
              const cobertura = porDia > 0 ? prod.estoque / porDia : Infinity;
              return (
                <tr key={prod.id}>
                  <td className="border border-black p-1">{prod.sku}</td>
                  <td className="border border-black p-1">{prod.nome}</td>
                  <td className="border border-black p-1 text-right">{num(qtd)}</td>
                  <td className="border border-black p-1 text-right">
                    {num(prod.estoque)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {Number.isFinite(cobertura) ? `${cobertura.toFixed(0)} dias` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ReportPrintSection>
    </ReportPrintLayout>
  );
}
