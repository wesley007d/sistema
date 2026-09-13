"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { money } from "@/lib/format";
import { calcPagamento } from "@/lib/pagamento";

interface Item {
  descricao: string;
  quantidade: number;
  precoUnit: number;
  total: number;
  imagemUrl?: string | null;
  tipo?: string;
  mecanico?: string | null;
}
interface Pay {
  forma: string;
  valor: number;
}

const FORMAS: { key: string; label: string }[] = [
  { key: "DINHEIRO", label: "Dinheiro" },
  { key: "PIX", label: "Pix" },
  { key: "DEBITO", label: "Débito" },
  { key: "CREDITO", label: "Crédito" },
  { key: "CREDIARIO", label: "Crediário" },
];

function ReceberButton({ habilitado }: { habilitado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!habilitado || pending}
      className="btn-primary w-full py-4 text-lg"
    >
      {pending ? "Processando…" : "Receber e imprimir"}
    </button>
  );
}

export function CaixaReceber({
  action,
  numero,
  clienteNome,
  partnerId,
  descontoGeral,
  acrescimo,
  total,
  items,
  pagamentosIniciais,
}: {
  action: (formData: FormData) => void;
  numero: number;
  clienteNome: string;
  partnerId: string | null;
  descontoGeral: number;
  acrescimo: number;
  total: number;
  items: Item[];
  pagamentosIniciais?: Pay[];
}) {
  const [pagamentos, setPagamentos] = useState<Pay[]>(
    pagamentosIniciais ?? [],
  );
  const [emitirNfe, setEmitirNfe] = useState(false);

  const { pago, falta, troco } = calcPagamento(total, pagamentos);
  const podeReceber = pago + 0.001 >= total;

  function addPagamento(forma: string) {
    setPagamentos((p) => [...p, { forma, valor: falta }]);
  }
  const setValor = (i: number, valor: number) =>
    setPagamentos((ps) => ps.map((x, idx) => (idx === i ? { ...x, valor } : x)));
  const setForma = (i: number, forma: string) =>
    setPagamentos((ps) => ps.map((x, idx) => (idx === i ? { ...x, forma } : x)));
  const rm = (i: number) =>
    setPagamentos((ps) => ps.filter((_, idx) => idx !== i));

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <input
        type="hidden"
        name="pagamentos"
        value={JSON.stringify(pagamentos.filter((p) => Number(p.valor) > 0))}
      />
      <input type="hidden" name="descontoGeral" value={descontoGeral} />
      <input type="hidden" name="acrescimo" value={acrescimo} />
      <input type="hidden" name="partnerId" value={partnerId ?? ""} />
      <input type="hidden" name="emitirNfe" value={emitirNfe ? "1" : "0"} />

      {/* Itens (só leitura) */}
      <div className="card overflow-x-auto">
        <div className="border-b border-border px-4 py-2 text-sm text-muted">
          Venda nº {numero} · {clienteNome}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Produto</th>
              <th className="th w-20 text-right">Qtd</th>
              <th className="th w-28 text-right">Preço</th>
              <th className="th w-28 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td className="td">
                  <div className="flex items-center gap-2">
                    {it.imagemUrl && (
                      <a href={it.imagemUrl} target="_blank" rel="noopener noreferrer" title="Ver foto do produto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.imagemUrl} alt="" className="size-8 shrink-0 rounded object-cover" />
                      </a>
                    )}
                    <span>
                      {it.descricao}
                      {it.tipo === "SERVICO" && (
                        <span className="ml-2 text-xs text-primary">🔧 serviço</span>
                      )}
                      {it.mecanico && (
                        <span className="block text-xs text-muted">
                          Mecânico: {it.mecanico}
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="td text-right">{it.quantidade}</td>
                <td className="td text-right">{money(it.precoUnit)}</td>
                <td className="td text-right font-medium">{money(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagamento */}
      <aside className="space-y-4">
        <section className="card p-4">
          {(descontoGeral > 0 || acrescimo > 0) && (
            <div className="mb-2 space-y-1 border-b border-border pb-2 text-sm">
              {descontoGeral > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Desconto</span>
                  <span>- {money(descontoGeral)}</span>
                </div>
              )}
              {acrescimo > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Acréscimo</span>
                  <span>{money(acrescimo)}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-muted">Total</span>
            <span className="text-3xl font-bold">{money(total)}</span>
          </div>
        </section>

        <section className="card p-4">
          <p className="label">Forma de pagamento</p>
          {pagamentosIniciais && pagamentosIniciais.length > 0 && (
            <p className="mb-2 rounded-md bg-primary/5 px-2 py-1 text-xs text-muted">
              Forma indicada pelo vendedor — confira e ajuste se precisar.
            </p>
          )}
          <div className="mb-3 grid grid-cols-2 gap-2">
            {FORMAS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => addPagamento(f.key)}
                className="btn-ghost py-2 text-sm"
              >
                + {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {pagamentos.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  className="input py-1 text-xs"
                  value={p.forma}
                  onChange={(e) => setForma(i, e.target.value)}
                >
                  {FORMAS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="input py-1 text-right"
                  value={p.valor || ""}
                  onChange={(e) => setValor(i, Number(e.target.value) || 0)}
                />
                <button
                  type="button"
                  onClick={() => rm(i)}
                  className="text-red-500"
                  aria-label="Remover pagamento"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1 border-t border-border pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Pago</span>
              <span>{money(pago)}</span>
            </div>
            {falta > 0.001 ? (
              <div className="flex justify-between text-lg font-bold text-red-600">
                <span>Falta</span>
                <span>{money(falta)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-2xl font-bold text-green-700">
                <span>Troco (dinheiro)</span>
                <span>{money(troco)}</span>
              </div>
            )}
          </div>
        </section>

        <label className="flex items-center gap-2 px-1 text-sm">
          <input
            type="checkbox"
            checked={emitirNfe}
            onChange={(e) => setEmitirNfe(e.target.checked)}
          />
          Emitir NF-e ao receber
        </label>

        <ReceberButton habilitado={podeReceber} />
      </aside>
    </form>
  );
}
