import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { money, date, num } from "@/lib/format";
import { FORMAS_TPAG, parseNfeXml, sugestaoPagamento } from "@/lib/xml/parse-nfe";
import {
  criarTodosNovos,
  deleteXml,
  desfazerLancamento,
  lancarEstoque,
  vincularItem,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function XmlDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireDb();
  const { id } = await params;
  const [doc, produtos, contas] = await Promise.all([
    db.xmlDocument.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    }),
    db.product.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.cashAccount.findMany({ where: { ativo: true }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!doc) notFound();

  const vinculados = doc.items.filter((i) => i.vinculado).length;
  const naoVinculados = doc.items.length - vinculados;
  const podeEntrada = doc.direcao === "ENTRADA" && doc.status !== "LANCADO";

  // como a nota diz que a compra foi paga (parcelas / forma de pagamento)
  const parsed = podeEntrada && doc.conteudo ? parseNfeXml(doc.conteudo) : null;
  const duplicatas = parsed?.duplicatas ?? [];
  const formasNota = (parsed?.formasPagamento ?? [])
    .map((f) => FORMAS_TPAG[f] ?? `código ${f}`)
    .join(", ");
  const sugestao = parsed ? sugestaoPagamento(parsed) : "PRAZO";
  const hoje = new Date().toLocaleDateString("en-CA"); // yyyy-mm-dd

  return (
    <div>
      <PageHeader
        title={`${doc.tipo} ${doc.numero ? `nº ${doc.numero}` : ""}`}
        subtitle={
          doc.direcao === "ENTRADA"
            ? `Entrada · ${doc.emitenteNome ?? ""}`
            : `Saída · ${doc.destinatarioNome ?? ""}`
        }
        action={
          <div className="flex flex-wrap gap-2">
            <a href={`/xml/${doc.id}/download`} className="btn-ghost">
              Baixar XML
            </a>
            {podeEntrada && (
              <a href="#lancar" className="btn-primary">
                Lançar em estoque
              </a>
            )}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Info label="Chave de acesso" value={doc.chaveAcesso ?? "—"} mono />
        <Info label="Emissão" value={date(doc.dataEmissao)} />
        <Info label="Valor total" value={money(doc.valorTotal)} />
        <Info
          label="Status"
          value={doc.status.toLowerCase()}
        />
        <Info label="Emitente" value={`${doc.emitenteNome ?? "—"} (${doc.emitenteCnpj ?? "-"})`} />
        <Info
          label="Destinatário"
          value={`${doc.destinatarioNome ?? "—"} (${doc.destinatarioCnpj ?? "-"})`}
        />
        <Info label="Arquivo" value={doc.origemArquivo ?? "gerado pelo sistema"} />
        <Info label="Itens vinculados" value={`${vinculados} / ${doc.items.length}`} />
      </div>

      {podeEntrada && (
        <section id="lancar" className="card mb-6 p-4">
          <h2 className="font-semibold">Lançar em estoque e no financeiro</h2>
          <p className="mt-1 text-xs text-muted">
            {formasNota ? `A nota informa pagamento: ${formasNota}. ` : "A nota não informa a forma de pagamento. "}
            {duplicatas.length > 0
              ? `Tem ${duplicatas.length} parcela(s) de cobrança.`
              : "Não tem parcelas de cobrança."}
          </p>
          <form action={lancarEstoque.bind(null, id)} className="mt-4 space-y-4">
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="pagamento"
                value="PAGO"
                defaultChecked={sugestao === "PAGO"}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="font-medium">Já paguei (à vista)</span>
                <span className="block text-xs text-muted">
                  Lança como pago e registra a saída de {money(doc.valorTotal)} na conta:
                </span>
                <select name="accountId" className="input mt-1 max-w-xs" defaultValue={contas[0]?.id ?? ""}>
                  {contas.length === 0 && <option value="">Caixa (será criado)</option>}
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="pagamento"
                value="PRAZO"
                defaultChecked={sugestao === "PRAZO"}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="font-medium">Vou pagar depois (a prazo)</span>
                {duplicatas.length > 0 ? (
                  <span className="block text-xs text-muted">
                    Cria uma conta a pagar por parcela da nota:{" "}
                    {duplicatas
                      .map((d) => `${money(d.valor)} em ${date(d.vencimento)}`)
                      .join(" · ")}
                  </span>
                ) : (
                  <>
                    <span className="block text-xs text-muted">
                      Cria uma conta a pagar de {money(doc.valorTotal)} com vencimento em:
                    </span>
                    <input
                      type="date"
                      name="vencimento"
                      defaultValue={hoje}
                      className="input mt-1 max-w-xs"
                    />
                  </>
                )}
              </span>
            </label>
            <label className="block border-t border-border pt-4">
              <span className="font-medium">Preço de venda: margem de lucro (%)</span>
              <span className="block text-xs text-muted">
                Ao lançar, o preço de venda de cada produto da nota é calculado para que
                esta porcentagem do preço seja lucro (ex.: custo R$ 10,00 com 70% de
                margem = venda R$ 33,33). Deixe em branco para não mexer nos preços.
              </span>
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  name="margem"
                  min={0}
                  max={99}
                  step="0.01"
                  defaultValue={40}
                  className="input max-w-28"
                />
                <span className="text-sm">%</span>
              </span>
            </label>
            <SubmitButton>Lançar em estoque</SubmitButton>
          </form>
        </section>
      )}

      <section className="card overflow-x-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="font-semibold">Itens do documento</h2>
            {podeEntrada && (
              <p className="text-xs text-muted">
                Vincule cada item a um produto do catálogo (ou crie um novo) antes de
                lançar em estoque.
              </p>
            )}
          </div>
          {podeEntrada && naoVinculados > 0 && (
            <form action={criarTodosNovos.bind(null, id)}>
              <ConfirmButton
                className="btn-primary"
                message={`Criar ${naoVinculados} produto(s) novo(s), um para cada item ainda não vinculado? Itens cujo código já existe no catálogo são ligados ao produto existente.`}
              >
                Criar novo para todos ({naoVinculados})
              </ConfirmButton>
            </form>
          )}
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Cód.</th>
              <th className="th">Descrição</th>
              <th className="th text-right">Qtd</th>
              <th className="th text-right">Vlr unit.</th>
              <th className="th">Produto vinculado</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it) => (
              <tr key={it.id} className="align-top">
                <td className="td font-mono text-xs">{it.codigo ?? "-"}</td>
                <td className="td">
                  {it.descricao}
                  <span className="block text-xs text-muted">
                    NCM {it.ncm ?? "-"} · CFOP {it.cfop ?? "-"}
                  </span>
                </td>
                <td className="td text-right">
                  {num(it.quantidade)} {it.unidade}
                </td>
                <td className="td text-right">{money(it.valorUnit)}</td>
                <td className="td">
                  {it.vinculado && it.product ? (
                    <span className="badge bg-green-100 text-green-700">
                      {it.product.nome}
                    </span>
                  ) : podeEntrada ? (
                    <form
                      action={vincularItem.bind(null, it.id)}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <select
                        name="productId"
                        className="input max-w-52 py-1 text-xs"
                        defaultValue=""
                      >
                        <option value="">— escolher produto —</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} · {p.nome}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" name="criarNovo" value="1" />
                        criar novo
                      </label>
                      <button type="submit" className="btn-ghost px-2 py-1 text-xs">
                        vincular
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-muted">não vinculado</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <Link href="/xml" className="text-sm text-primary">
          ← voltar
        </Link>
        {doc.status === "LANCADO" && doc.direcao === "ENTRADA" && (
          <form action={desfazerLancamento.bind(null, id)}>
            <ConfirmButton message="Desfazer o lançamento desta nota? O estoque que ela deu entrada sai, os produtos criados só por ela são apagados (menos os que você já completou com foto, descrição ou marca) e as contas a pagar/pagamentos gerados são removidos.">
              Desfazer lançamento
            </ConfirmButton>
          </form>
        )}
        {doc.status !== "LANCADO" && (
          <form action={deleteXml.bind(null, id)}>
            <ConfirmButton message="Excluir este XML?">Excluir XML</ConfirmButton>
          </form>
        )}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="card p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 break-all ${mono ? "font-mono text-xs" : "text-sm"}`}>
        {value}
      </p>
    </div>
  );
}
