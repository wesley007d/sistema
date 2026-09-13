import { notFound } from "next/navigation";
import { money, dateTime } from "@/lib/format";
import { requireDb } from "@/lib/auth";
import { AutoPrint } from "./AutoPrint";

export const dynamic = "force-dynamic";

export default async function CupomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { user, db } = await requireDb();
  const { id } = await params;
  const { print } = await searchParams;
  const [venda, company] = await Promise.all([
    db.sale.findUnique({
      where: { id },
      include: { partner: true, items: true, payments: true, operador: true },
    }),
    db.company.findUnique({ where: { id: user.companyId } }),
  ]);
  if (!venda) notFound();

  return (
    <div className="mx-auto max-w-xs bg-white p-4 font-mono text-[12px] text-black">
      {print === "1" && <AutoPrint />}
      <div className="text-center">
        {company?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt=""
            className="mx-auto mb-2 block max-h-24 w-auto max-w-full object-contain"
          />
        )}
        <p className="font-bold uppercase">{company?.nomeFantasia ?? company?.razaoSocial}</p>
        <p>{company?.razaoSocial}</p>
        <p>CNPJ {company?.cnpj}</p>
        <p>
          {company?.logradouro}, {company?.numero} — {company?.municipio}/
          {company?.uf}
        </p>
      </div>
      <hr className="my-2 border-dashed border-black" />
      <p>{venda.status === "ORCAMENTO" ? "ORÇAMENTO" : "CUPOM NÃO FISCAL"}</p>
      <p>
        {venda.status === "ORCAMENTO" ? "Orçamento" : "Venda"} nº {venda.numero}
      </p>
      <p>{dateTime(venda.finalizadaEm ?? venda.createdAt)}</p>
      {venda.status === "ORCAMENTO" && <p>Válido por 7 dias.</p>}
      <p>Operador: {venda.operador?.nome ?? "-"}</p>
      <p>Cliente: {venda.partner?.nome ?? "Consumidor"}</p>
      <hr className="my-2 border-dashed border-black" />
      {venda.items.map((it) => (
        <div key={it.id} className="mb-1">
          <p>
            {it.descricao}
            {it.tipo === "SERVICO" ? " (serviço)" : ""}
            {it.mecanico ? ` — ${it.mecanico}` : ""}
          </p>
          <p className="flex justify-between">
            <span>
              {it.quantidade} x {money(it.precoUnit)}
              {it.desconto > 0 ? ` -${money(it.desconto)}` : ""}
            </span>
            <span>{money(it.total)}</span>
          </p>
        </div>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <p className="flex justify-between">
        <span>Subtotal</span>
        <span>{money(venda.subtotal)}</span>
      </p>
      {venda.desconto > 0 && (
        <p className="flex justify-between">
          <span>Desconto</span>
          <span>-{money(venda.desconto)}</span>
        </p>
      )}
      {venda.acrescimo > 0 && (
        <p className="flex justify-between">
          <span>Acréscimo</span>
          <span>{money(venda.acrescimo)}</span>
        </p>
      )}
      <p className="flex justify-between text-sm font-bold">
        <span>TOTAL</span>
        <span>{money(venda.total)}</span>
      </p>
      <hr className="my-2 border-dashed border-black" />
      {venda.payments.map((p) => (
        <p key={p.id} className="flex justify-between">
          <span>{p.forma}</span>
          <span>{money(p.valor)}</span>
        </p>
      ))}
      {venda.troco > 0 && (
        <p className="flex justify-between">
          <span>TROCO</span>
          <span>{money(venda.troco)}</span>
        </p>
      )}
      <hr className="my-2 border-dashed border-black" />
      <p className="text-center">Obrigado pela preferência!</p>
      <p className="mt-4 text-center text-[10px] print:hidden">
        Ctrl+P para imprimir
      </p>
    </div>
  );
}
