import { notFound } from "next/navigation";
import { money, dateTime, date } from "@/lib/format";
import { requireDb } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ImprimirOSPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, db } = await requireDb();
  const { id } = await params;
  const [os, company] = await Promise.all([
    db.serviceOrder.findUnique({
      where: { id },
      include: { partner: true, vehicle: true, items: true },
    }),
    db.company.findUnique({ where: { id: user.companyId } }),
  ]);
  if (!os) notFound();

  const pecas = os.items.filter((i) => i.tipo === "PECA");
  const servicos = os.items.filter((i) => i.tipo === "SERVICO");
  const rascunho = os.status === "ORCAMENTO";

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-[13px] text-black">
      <div className="mb-4 flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <h1 className="text-lg font-bold">{company?.razaoSocial}</h1>
          <p>{company?.nomeFantasia}</p>
          <p>CNPJ: {company?.cnpj}</p>
          <p>
            {company?.logradouro}, {company?.numero} — {company?.municipio}/
            {company?.uf} — Tel: {company?.telefone}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold">
            {rascunho ? "ORÇAMENTO" : "ORDEM DE SERVIÇO"}
          </p>
          <p>Nº {os.numero}</p>
          <p>Abertura: {dateTime(os.createdAt)}</p>
          <p>Status: {os.status}</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="border border-black p-2">
          <p className="font-bold">CLIENTE</p>
          <p>{os.partner?.nome ?? "Não identificado"}</p>
          <p>{os.partner?.cpfCnpj}</p>
          <p>{os.partner?.telefone ?? os.partner?.celular}</p>
        </div>
        <div className="border border-black p-2">
          <p className="font-bold">VEÍCULO</p>
          <p>
            {[os.vehicle?.marca, os.vehicle?.modelo, os.vehicle?.ano]
              .filter(Boolean)
              .join(" ") || "—"}
          </p>
          <p>Placa: {os.vehicle?.placa ?? "—"} · Cor: {os.vehicle?.cor ?? "—"}</p>
          <p>KM entrada: {os.kmEntrada ?? "—"}</p>
        </div>
      </div>

      <div className="mb-3 border border-black p-2">
        <p>
          <b>Problema relatado:</b> {os.descricaoProblema ?? "—"}
        </p>
        <p>
          <b>Diagnóstico:</b> {os.diagnostico ?? "—"}
        </p>
        <p>
          <b>Técnico:</b> {os.tecnico ?? "—"} · <b>Previsão:</b>{" "}
          {os.previsaoEntrega ? date(os.previsaoEntrega) : "—"}
        </p>
      </div>

      {[
        { titulo: "SERVIÇOS", list: servicos },
        { titulo: "PEÇAS", list: pecas },
      ].map(
        (grp) =>
          grp.list.length > 0 && (
            <table
              key={grp.titulo}
              className="mb-3 w-full border-collapse border border-black"
            >
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="border border-black p-1" colSpan={4}>
                    {grp.titulo}
                  </th>
                </tr>
                <tr className="text-left">
                  <th className="border border-black p-1">Descrição</th>
                  <th className="border border-black p-1 text-right">Qtd</th>
                  <th className="border border-black p-1 text-right">Unit.</th>
                  <th className="border border-black p-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {grp.list.map((it) => (
                  <tr key={it.id}>
                    <td className="border border-black p-1">{it.descricao}</td>
                    <td className="border border-black p-1 text-right">
                      {it.quantidade}
                    </td>
                    <td className="border border-black p-1 text-right">
                      {money(it.precoUnit)}
                    </td>
                    <td className="border border-black p-1 text-right">
                      {money(it.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ),
      )}

      <div className="ml-auto w-64">
        <div className="flex justify-between">
          <span>Peças</span>
          <span>{money(os.totalPecas)}</span>
        </div>
        <div className="flex justify-between">
          <span>Serviços</span>
          <span>{money(os.totalServicos)}</span>
        </div>
        <div className="flex justify-between">
          <span>Desconto</span>
          <span>- {money(os.desconto)}</span>
        </div>
        <div className="flex justify-between border-t border-black pt-1 font-bold">
          <span>TOTAL</span>
          <span>{money(os.total)}</span>
        </div>
      </div>

      <div className="mt-12 flex justify-between">
        <div className="w-64 border-t border-black pt-1 text-center">
          Assinatura do cliente
        </div>
        <div className="w-64 border-t border-black pt-1 text-center">
          Responsável técnico
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-500 print:hidden">
        Ctrl+P para imprimir ou salvar em PDF.
      </p>
    </div>
  );
}
