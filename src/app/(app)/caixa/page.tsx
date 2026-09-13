import Link from "next/link";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { money, dateTime } from "@/lib/format";
import { getOpenCashSession, resumoSessaoCaixa } from "@/lib/caixa";
import { receberVenda } from "../vendas/actions";
import { CaixaReceber } from "./CaixaReceber";
import { abrirCaixa } from "./actions";
import { FecharCaixaForm } from "./FecharCaixaForm";

export const dynamic = "force-dynamic";

export default async function CaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ venda?: string }>;
}) {
  const { db } = await requireDb();
  const { venda: vendaParam } = await searchParams;
  const sessao = await getOpenCashSession(db);

  // --- Modo receber: uma venda foi puxada pelo número ---
  if (vendaParam) {
    const numero = Number(vendaParam);
    const sale = Number.isFinite(numero)
      ? await db.sale.findFirst({
          where: { numero, status: "ABERTA" },
          include: {
            items: { include: { product: { select: { imagemUrl: true } } } },
            operador: true,
            partner: true,
            payments: true,
          },
        })
      : null;

    if (!sale) {
      return (
        <div>
          <PageHeader
            title="Caixa"
            action={
              <Link href="/caixa" className="btn-ghost">
                ← voltar
              </Link>
            }
          />
          <p className="card p-6 text-sm text-muted">
            Nenhuma venda <strong>aguardando o caixa</strong> com o número{" "}
            <strong>{vendaParam}</strong>. Peça ao vendedor para salvar a venda
            para o caixa, ou escolha uma da lista.
          </p>
        </div>
      );
    }

    return (
      <div>
        <PageHeader
          title={`Receber venda nº ${sale.numero}`}
          subtitle={sale.operador?.nome ? `Vendedor: ${sale.operador.nome}` : undefined}
          action={
            <Link href="/caixa" className="btn-ghost">
              ← voltar
            </Link>
          }
        />
        {!sessao && (
          <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            O caixa está <strong>fechado</strong>. Você pode receber, mas o ideal
            é <Link href="/caixa" className="underline">abrir o caixa</Link>{" "}
            antes de começar o turno.
          </p>
        )}
        <CaixaReceber
          action={receberVenda.bind(
            null,
            sale.id,
            `/vendas/${sale.id}/cupom?print=1`,
          )}
          numero={sale.numero}
          clienteNome={sale.partner?.nome ?? "Consumidor"}
          partnerId={sale.partnerId}
          descontoGeral={sale.desconto}
          acrescimo={sale.acrescimo}
          total={sale.total}
          pagamentosIniciais={sale.payments.map((p) => ({
            forma: p.forma,
            valor: p.valor,
          }))}
          items={sale.items.map((it) => ({
            descricao: it.descricao,
            quantidade: it.quantidade,
            precoUnit: it.precoUnit,
            total: it.total,
            imagemUrl: it.product?.imagemUrl ?? null,
            tipo: it.tipo,
            mecanico: it.mecanico,
          }))}
        />
      </div>
    );
  }

  // --- Modo lista: escolher venda a receber / reimprimir vendas do dia ---
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const [abertas, realizadas] = await Promise.all([
    db.sale.findMany({
      where: { status: "ABERTA" },
      include: { operador: true, partner: true },
      orderBy: { numero: "desc" },
    }),
    db.sale.findMany({
      where: { status: "FINALIZADA", finalizadaEm: { gte: inicioDia } },
      include: { operador: true },
      orderBy: { finalizadaEm: "desc" },
      take: 50,
    }),
  ]);
  const resumo = sessao ? await resumoSessaoCaixa(db, sessao) : null;

  return (
    <div>
      <PageHeader title="Caixa" subtitle="Receber vendas e imprimir cupons" />

      {sessao && resumo ? (
        <div className="mb-6 card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-green-700">● Caixa aberto</p>
              <p className="text-xs text-muted">
                desde {dateTime(sessao.abertoEm)}
                {sessao.operador?.nome ? ` · ${sessao.operador.nome}` : ""} ·
                fundo {money(sessao.valorAbertura)}
              </p>
            </div>
            <p className="text-right">
              <span className="block text-xs uppercase text-muted">
                Esperado na gaveta
              </span>
              <span className="text-xl font-bold">{money(resumo.esperado)}</span>
            </p>
          </div>
          <details className="mt-3 border-t border-border pt-3">
            <summary className="cursor-pointer text-sm font-medium">
              Fechar caixa
            </summary>
            <FecharCaixaForm
              abertura={resumo.abertura}
              entradas={resumo.entradas}
              saidas={resumo.saidas}
              esperado={resumo.esperado}
            />
          </details>
        </div>
      ) : (
        <div className="mb-6 card p-4">
          <p className="text-sm font-medium text-amber-700">○ Caixa fechado</p>
          <form
            action={abrirCaixa}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="label">Fundo de troco (abertura)</label>
              <input
                name="valorAbertura"
                type="number"
                step="0.01"
                inputMode="decimal"
                defaultValue="50"
                className="input w-40 text-lg"
              />
            </div>
            <div className="flex-1 min-w-[12rem]">
              <label className="label">Observação (opcional)</label>
              <input name="observacao" className="input" />
            </div>
            <button type="submit" className="btn-primary shrink-0">
              Abrir caixa
            </button>
          </form>
        </div>
      )}

      <form action="/caixa" className="mb-8 flex max-w-sm gap-2">
        <input
          name="venda"
          type="number"
          inputMode="numeric"
          autoFocus
          placeholder="Nº da venda"
          className="input text-lg"
          aria-label="Número da venda"
        />
        <button type="submit" className="btn-primary shrink-0">
          Puxar venda
        </button>
      </form>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold">
          Aguardando caixa ({abertas.length})
        </h2>
        {abertas.length === 0 ? (
          <p className="card p-4 text-sm text-muted">
            Nenhuma venda aguardando. As vendas que o vendedor salva “para o
            caixa” aparecem aqui.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {abertas.map((v) => (
              <Link
                key={v.id}
                href={`/caixa?venda=${v.numero}`}
                className="card flex items-center justify-between p-4 hover:border-primary"
              >
                <div>
                  <p className="text-lg font-bold">nº {v.numero}</p>
                  <p className="text-xs text-muted">
                    {v.partner?.nome ?? "Consumidor"}
                    {v.operador?.nome ? ` · ${v.operador.nome}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{money(v.total)}</p>
                  <span className="btn-primary mt-1 inline-block px-3 py-1 text-xs">
                    Receber
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Vendas realizadas hoje</h2>
        <div className="card divide-y divide-border">
          {realizadas.length === 0 && (
            <p className="p-4 text-sm text-muted">
              Nenhuma venda finalizada hoje.
            </p>
          )}
          {realizadas.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <span className="text-muted">
                nº <b className="text-foreground">{v.numero}</b> ·{" "}
                {dateTime(v.finalizadaEm ?? v.createdAt)}
                {v.operador?.nome ? ` · ${v.operador.nome}` : ""}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="font-medium">{money(v.total)}</span>
                <a
                  href={`/vendas/${v.id}/cupom?print=1`}
                  target="_blank"
                  className="btn-ghost px-3 py-1 text-xs"
                >
                  Imprimir
                </a>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
