import { notFound } from "next/navigation";
import { money, dateTime } from "@/lib/format";
import { formatChave } from "@/lib/fiscal/chave";
import { requireDb } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ImprimirNotaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, db } = await requireDb();
  const { id } = await params;
  const [nf, company] = await Promise.all([
    db.invoice.findUnique({
      where: { id },
      include: { partner: true, items: true, serviceItems: true },
    }),
    db.company.findUnique({ where: { id: user.companyId } }),
  ]);
  if (!nf) notFound();

  const titulo =
    nf.tipo === "NFSE"
      ? "DANFSE - Documento Auxiliar da NFS-e"
      : "DANFE - Documento Auxiliar da NF-e";

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-[13px] text-black">
      <div className="mb-4 flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <h1 className="text-lg font-bold">{company?.razaoSocial}</h1>
          <p>{company?.nomeFantasia}</p>
          <p>
            CNPJ: {company?.cnpj} — IE: {company?.ie ?? "-"}
          </p>
          <p>
            {company?.logradouro}, {company?.numero} — {company?.bairro} —{" "}
            {company?.municipio}/{company?.uf}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold">{titulo}</p>
          <p>
            Nº {nf.numero} — Série {nf.serie}
          </p>
          <p>Emissão: {dateTime(nf.emitidaEm ?? nf.createdAt)}</p>
          <p className="text-xs">
            {nf.ambiente === "PRODUCAO" ? "" : "AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL"}
          </p>
        </div>
      </div>

      {nf.chaveAcesso && (
        <p className="mb-3 break-all border border-black p-2 text-center font-mono text-xs">
          CHAVE DE ACESSO: {formatChave(nf.chaveAcesso)}
          {nf.protocolo ? ` — Protocolo: ${nf.protocolo}` : ""}
        </p>
      )}

      <div className="mb-3 border border-black p-2">
        <p className="font-bold">
          {nf.tipo === "NFSE" ? "TOMADOR" : "DESTINATÁRIO"}
        </p>
        <p>{nf.partner?.nome ?? "Consumidor não identificado"}</p>
        {nf.partner && (
          <p>
            {nf.partner.cpfCnpj} — {nf.partner.logradouro}, {nf.partner.numero} —{" "}
            {nf.partner.municipio}/{nf.partner.uf}
          </p>
        )}
      </div>

      <table className="mb-3 w-full border-collapse border border-black">
        <thead>
          <tr className="border-b border-black bg-gray-100 text-left">
            <th className="border-r border-black p-1">Descrição</th>
            <th className="border-r border-black p-1 text-right">Qtd</th>
            <th className="border-r border-black p-1 text-right">Vlr unit.</th>
            <th className="p-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {[...nf.items, ...nf.serviceItems].map((it) => (
            <tr key={it.id} className="border-b border-black">
              <td className="border-r border-black p-1">{it.descricao}</td>
              <td className="border-r border-black p-1 text-right">
                {it.quantidade}
              </td>
              <td className="border-r border-black p-1 text-right">
                {money(it.valorUnit)}
              </td>
              <td className="p-1 text-right">{money(it.valorTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-64">
        <div className="flex justify-between">
          <span>Produtos</span>
          <span>{money(nf.valorProdutos)}</span>
        </div>
        <div className="flex justify-between">
          <span>Serviços</span>
          <span>{money(nf.valorServicos)}</span>
        </div>
        <div className="flex justify-between">
          <span>Desconto</span>
          <span>{money(nf.valorDesconto)}</span>
        </div>
        <div className="flex justify-between">
          <span>ISS</span>
          <span>{money(nf.valorIss)}</span>
        </div>
        <div className="flex justify-between border-t border-black pt-1 font-bold">
          <span>TOTAL</span>
          <span>{money(nf.valorTotal)}</span>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-gray-500 print:hidden">
        Use Ctrl+P para imprimir ou salvar em PDF.
      </p>
    </div>
  );
}
