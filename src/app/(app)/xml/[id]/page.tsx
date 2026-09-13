import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { money, date, num } from "@/lib/format";
import { deleteXml, lancarEstoque, vincularItem } from "../actions";

export const dynamic = "force-dynamic";

export default async function XmlDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireDb();
  const { id } = await params;
  const [doc, produtos] = await Promise.all([
    db.xmlDocument.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    }),
    db.product.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);
  if (!doc) notFound();

  const vinculados = doc.items.filter((i) => i.vinculado).length;
  const podeEntrada = doc.direcao === "ENTRADA" && doc.status !== "LANCADO";

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
              <form action={lancarEstoque.bind(null, id)}>
                <SubmitButton>Lançar em estoque</SubmitButton>
              </form>
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

      <section className="card overflow-x-auto">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Itens do documento</h2>
          {podeEntrada && (
            <p className="text-xs text-muted">
              Vincule cada item a um produto do catálogo (ou crie um novo) antes de
              lançar em estoque.
            </p>
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
