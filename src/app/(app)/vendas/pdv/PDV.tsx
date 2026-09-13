"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { money } from "@/lib/format";
import { calcPagamento } from "@/lib/pagamento";
import { PasswordInput } from "@/components/PasswordInput";

function FinalizarButton({
  habilitado,
  total,
  rotulo,
}: {
  habilitado: boolean;
  total: number;
  rotulo: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!habilitado || pending}
      className="btn-primary w-full py-3 text-base"
    >
      {pending
        ? "Processando…"
        : habilitado
          ? `${rotulo} — ${money(total)}`
          : `${rotulo} venda`}
    </button>
  );
}

interface ProdResult {
  kind: "produto";
  id: string;
  sku: string;
  codigoBarras: string | null;
  nome: string;
  precoVenda: number;
  estoque: number;
  unidade: string;
  localizacao: string | null;
  imagemUrl: string | null;
}
interface ServResult {
  kind: "servico";
  id: string;
  codigo: string;
  nome: string;
  preco: number;
}
type BuscaResult = ProdResult | ServResult;

interface CartRow {
  tipo: "PECA" | "SERVICO";
  productId: string;
  serviceId?: string | null;
  mecanico?: string;
  sku: string;
  descricao: string;
  quantidade: number;
  precoUnit: number;
  desconto: number;
  estoque: number;
  localizacao?: string | null;
  imagemUrl?: string | null;
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

interface PreVenda {
  numero: number;
  operadorNome: string | null;
  partnerId: string | null;
  descontoGeral: number;
  acrescimo: number;
  observacao: string | null;
  itens: CartRow[];
}

export function PDV({
  partners,
  mecanicos = [],
  action,
  salvarPreVendaAction,
  salvarOrcamentoAction,
  preVenda,
  soPreVenda = false,
  limiteDesconto = 10,
}: {
  partners: { id: string; nome: string }[];
  /** Nomes de mecânicos já usados — sugestões no campo da linha de serviço. */
  mecanicos?: string[];
  action: (formData: FormData) => void;
  salvarPreVendaAction?: (formData: FormData) => void;
  salvarOrcamentoAction?: (formData: FormData) => void;
  preVenda?: PreVenda;
  /** Vendedor: só monta a venda e envia ao caixa (sem pagamento / finalizar). */
  soPreVenda?: boolean;
  /** Desconto máx. (%) que o vendedor dá sem autorização de admin. */
  limiteDesconto?: number;
}) {
  const recebendo = !!preVenda;
  const [cart, setCart] = useState<CartRow[]>(preVenda?.itens ?? []);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<BuscaResult[]>([]);
  const [aberto, setAberto] = useState(false);
  const [descontoPct, setDescontoPct] = useState(() => {
    if (!preVenda || !preVenda.descontoGeral) return 0;
    const sub = preVenda.itens.reduce(
      (s, r) => s + (r.quantidade * r.precoUnit - r.desconto),
      0,
    );
    return sub > 0
      ? Math.round((preVenda.descontoGeral / sub) * 10000) / 100
      : 0;
  });
  const [acrescimo, setAcrescimo] = useState(preVenda?.acrescimo ?? 0);
  const [partnerId, setPartnerId] = useState(preVenda?.partnerId ?? "");
  const [observacao, setObservacao] = useState(preVenda?.observacao ?? "");
  const [emitirNfe, setEmitirNfe] = useState(false);
  const [pagamentos, setPagamentos] = useState<Pay[]>([]);
  const buscaRef = useRef<HTMLInputElement>(null);

  // busca com debounce
  useEffect(() => {
    const termo = busca.trim();
    const t = setTimeout(async () => {
      if (termo.length < 2) {
        setResultados([]);
        setAberto(false);
        return;
      }
      try {
        const r = await fetch(
          `/vendas/pdv/buscar?q=${encodeURIComponent(termo)}`,
        );
        if (r.ok) {
          setResultados(await r.json());
          setAberto(true);
        }
      } catch {
        /* ignore */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [busca]);

  function addResultado(p: BuscaResult) {
    setCart((c) => {
      if (p.kind === "produto") {
        const i = c.findIndex(
          (x) => x.tipo === "PECA" && x.productId === p.id,
        );
        if (i >= 0) {
          const copy = [...c];
          copy[i] = { ...copy[i], quantidade: copy[i].quantidade + 1 };
          return copy;
        }
        return [
          ...c,
          {
            tipo: "PECA",
            productId: p.id,
            serviceId: null,
            sku: p.sku,
            descricao: p.nome,
            quantidade: 1,
            precoUnit: p.precoVenda,
            desconto: 0,
            estoque: p.estoque,
            localizacao: p.localizacao,
            imagemUrl: p.imagemUrl,
          },
        ];
      }
      // serviço do catálogo
      const i = c.findIndex(
        (x) => x.tipo === "SERVICO" && x.serviceId === p.id,
      );
      if (i >= 0) {
        const copy = [...c];
        copy[i] = { ...copy[i], quantidade: copy[i].quantidade + 1 };
        return copy;
      }
      return [
        ...c,
        {
          tipo: "SERVICO",
          productId: "",
          serviceId: p.id,
          sku: p.codigo,
          descricao: p.nome,
          quantidade: 1,
          precoUnit: p.preco,
          desconto: 0,
          estoque: 0,
        },
      ];
    });
    setBusca("");
    setResultados([]);
    setAberto(false);
    buscaRef.current?.focus();
  }

  function addMaoDeObra() {
    setCart((c) => [
      ...c,
      {
        tipo: "SERVICO",
        productId: "",
        serviceId: null,
        sku: "",
        descricao: "",
        quantidade: 1,
        precoUnit: 0,
        desconto: 0,
        estoque: 0,
      },
    ]);
  }

  function onBuscaKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      const termo = busca.trim().toLowerCase();
      const exato = resultados.find(
        (r) =>
          r.kind === "produto" &&
          (r.codigoBarras?.toLowerCase() === termo ||
            r.sku.toLowerCase() === termo),
      );
      const alvo = exato ?? resultados[0];
      if (alvo) addResultado(alvo);
    }
    if (e.key === "Escape") setAberto(false);
  }

  const up = (i: number, patch: Partial<CartRow>) =>
    setCart((c) => c.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const rm = (i: number) => setCart((c) => c.filter((_, idx) => idx !== i));

  const subtotal = useMemo(
    () =>
      cart.reduce((s, r) => s + (r.quantidade * r.precoUnit - r.desconto), 0),
    [cart],
  );
  const descontoValor =
    Math.round((subtotal * (descontoPct / 100) + Number.EPSILON) * 100) / 100;
  const total = Math.max(0, subtotal - descontoValor + acrescimo);
  const { pago, falta, troco } = calcPagamento(total, pagamentos);

  function addPagamento(forma: string) {
    setPagamentos((p) => [...p, { forma, valor: falta }]);
  }

  // linha de serviço precisa de descrição e valor
  const itensIncompletos = cart.some(
    (r) => r.tipo === "SERVICO" && (r.descricao.trim() === "" || r.precoUnit <= 0),
  );
  const carrinhoOk = cart.length > 0 && !itensIncompletos;
  const podeFinalizar = carrinhoOk && pago + 0.001 >= total;

  // Vendedor dando desconto acima do limite → precisa de liberação de admin.
  const precisaAprovacaoDesc =
    soPreVenda && descontoPct > limiteDesconto + 0.001;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      {recebendo && preVenda && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm lg:col-span-2">
          Recebendo a <strong>venda nº {preVenda.numero}</strong>
          {preVenda.operadorNome ? ` — vendedor: ${preVenda.operadorNome}` : ""}.
          {" "}Confira os itens, lance o pagamento e finalize.
        </div>
      )}
      <input type="hidden" name="itens" value={JSON.stringify(cart)} />
      <input
        type="hidden"
        name="pagamentos"
        value={JSON.stringify(pagamentos.filter((p) => Number(p.valor) > 0))}
      />
      <input type="hidden" name="partnerId" value={partnerId} />
      <input type="hidden" name="descontoGeral" value={descontoValor} />
      <input type="hidden" name="acrescimo" value={acrescimo} />
      <input type="hidden" name="observacao" value={observacao} />
      <input type="hidden" name="emitirNfe" value={emitirNfe ? "1" : "0"} />
      <datalist id="lista-mecanicos">
        {mecanicos.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      {/* Coluna esquerda: itens */}
      <div>
        <div className={`relative mb-2 ${recebendo ? "hidden" : ""}`}>
          <input
            ref={buscaRef}
            autoFocus={!recebendo}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={onBuscaKeyDown}
            onFocus={() => resultados.length && setAberto(true)}
            placeholder="Bipar código de barras, buscar peça ou serviço (nome / SKU)…"
            className="input text-base"
          />
          {aberto && resultados.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-surface shadow-lg">
              {resultados.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <button
                    type="button"
                    onClick={() => addResultado(r)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-background"
                  >
                    {r.kind === "produto" ? (
                      <>
                        <span className="flex min-w-0 items-center gap-2">
                          {r.imagemUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.imagemUrl}
                              alt=""
                              className="size-8 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <span className="size-8 shrink-0 rounded border border-dashed border-border" />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate">
                              <span className="font-mono text-xs text-muted">
                                {r.sku}
                              </span>{" "}
                              {r.nome}
                            </span>
                            <span className="block text-xs text-muted">
                              <span
                                className={
                                  r.estoque <= 0
                                    ? "text-red-600"
                                    : "text-green-700"
                                }
                              >
                                {r.estoque <= 0
                                  ? "sem estoque"
                                  : `${r.estoque} ${r.unidade} em estoque`}
                              </span>
                              {r.localizacao && <span> · 📍 {r.localizacao}</span>}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 font-medium">
                          {money(r.precoVenda)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded bg-primary-soft">
                            🔧
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate">
                              <span className="font-mono text-xs text-muted">
                                {r.codigo}
                              </span>{" "}
                              {r.nome}
                            </span>
                            <span className="block text-xs text-muted">
                              serviço / mão de obra
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 font-medium">
                          {money(r.preco)}
                        </span>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={`mb-4 ${recebendo ? "hidden" : ""}`}>
          <button
            type="button"
            onClick={addMaoDeObra}
            className="btn-ghost px-2 py-1 text-xs"
          >
            ＋ Mão de obra avulsa
          </button>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Produto</th>
                <th className="th w-24 text-right">Qtd</th>
                <th className="th w-28 text-right">Preço</th>
                <th className="th w-24 text-right">Desc.</th>
                <th className="th w-28 text-right">Total</th>
                <th className="th w-8"></th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 && (
                <tr>
                  <td className="td text-muted" colSpan={6}>
                    Carrinho vazio. Busque uma peça ou serviço acima.
                  </td>
                </tr>
              )}
              {cart.map((r, i) => {
                const linha = r.quantidade * r.precoUnit - r.desconto;
                const isServico = r.tipo === "SERVICO";
                // serviço não tem preço de tabela p/ travar — vendedor digita
                const precoEditavel = !recebendo && (!soPreVenda || isServico);
                return (
                  <tr key={i}>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        {r.imagemUrl && (
                          <a
                            href={r.imagemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver foto do produto"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={r.imagemUrl}
                              alt=""
                              className="size-8 shrink-0 rounded object-cover"
                            />
                          </a>
                        )}
                        <div className="min-w-0 flex-1">
                          {isServico && !recebendo ? (
                            <div className="space-y-1">
                              {r.serviceId ? (
                                // serviço do catálogo: nome fixo, não editável
                                <span className="block text-sm font-medium">
                                  {r.descricao}
                                </span>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Descrição da mão de obra (ex.: troca de óleo)"
                                  className="input py-1 text-sm"
                                  value={r.descricao}
                                  onChange={(e) =>
                                    up(i, { descricao: e.target.value })
                                  }
                                />
                              )}
                              <input
                                type="text"
                                list="lista-mecanicos"
                                placeholder="Mecânico (opcional)"
                                className="input py-1 text-xs"
                                value={r.mecanico ?? ""}
                                onChange={(e) =>
                                  up(i, { mecanico: e.target.value })
                                }
                              />
                            </div>
                          ) : (
                            <>
                              {r.descricao || "—"}
                              {isServico && r.mecanico && (
                                <span className="block text-xs text-muted">
                                  Mecânico: {r.mecanico}
                                </span>
                              )}
                            </>
                          )}
                          <span className="block font-mono text-xs text-muted">
                            {isServico ? (
                              <span className="text-primary">🔧 serviço</span>
                            ) : (
                              <>
                                {r.sku}
                                <span
                                  className={`ml-2 ${
                                    r.quantidade > r.estoque
                                      ? "text-red-600"
                                      : "text-muted"
                                  }`}
                                >
                                  estoque: {r.estoque}
                                </span>
                                {r.localizacao && (
                                  <span className="ml-2">📍 {r.localizacao}</span>
                                )}
                                {r.imagemUrl && (
                                  <a
                                    href={r.imagemUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-primary"
                                  >
                                    ver foto
                                  </a>
                                )}
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="td text-right">
                      {recebendo ? (
                        r.quantidade
                      ) : (
                        <input
                          type="number"
                          step="1"
                          min="1"
                          inputMode="numeric"
                          className="input text-right"
                          value={r.quantidade}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            up(i, {
                              quantidade:
                                Number.isFinite(n) && n > 0 ? n : 1,
                            });
                          }}
                        />
                      )}
                    </td>
                    <td className="td text-right">
                      {!precoEditavel ? (
                        money(r.precoUnit)
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          className="input text-right"
                          value={r.precoUnit}
                          onChange={(e) =>
                            up(i, { precoUnit: Number(e.target.value) })
                          }
                        />
                      )}
                    </td>
                    <td className="td text-right">
                      {recebendo || soPreVenda ? (
                        money(r.desconto)
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          className="input text-right"
                          value={r.desconto || ""}
                          onChange={(e) =>
                            up(i, { desconto: Number(e.target.value) || 0 })
                          }
                        />
                      )}
                    </td>
                    <td className="td text-right font-medium">{money(linha)}</td>
                    <td className="td">
                      {!recebendo && (
                        <button
                          type="button"
                          onClick={() => rm(i)}
                          className="text-red-500"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coluna direita: totais + pagamento */}
      <aside className="space-y-4">
        <section className="card p-4">
          <label className="label">Cliente (opcional)</label>
          <select
            className="input"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
          >
            <option value="">Consumidor</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </section>

        <section className="card p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-muted">Desconto (%)</span>
            <span className="flex items-center gap-2">
              {descontoValor > 0 && (
                <span className="text-xs text-muted">- {money(descontoValor)}</span>
              )}
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0"
                className="input w-20 text-right"
                value={descontoPct || ""}
                onChange={(e) =>
                  setDescontoPct(
                    Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                  )
                }
              />
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted">Acréscimo (R$)</span>
            <input
              type="number"
              step="0.01"
              placeholder="0"
              className="input w-28 text-right"
              value={acrescimo || ""}
              onChange={(e) => setAcrescimo(Number(e.target.value) || 0)}
            />
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-2 text-xl font-bold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </section>

        <section className={`card p-4 ${soPreVenda ? "hidden" : ""}`}>
          <p className="label">Pagamento</p>
          <div className="mb-2 flex flex-wrap gap-1">
            {FORMAS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => addPagamento(f.key)}
                className="btn-ghost px-2 py-1 text-xs"
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
                  onChange={(e) =>
                    setPagamentos((ps) =>
                      ps.map((x, idx) =>
                        idx === i ? { ...x, forma: e.target.value } : x,
                      ),
                    )
                  }
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
                  className="input py-1 text-right text-sm"
                  value={p.valor || ""}
                  onChange={(e) =>
                    setPagamentos((ps) =>
                      ps.map((x, idx) =>
                        idx === i
                          ? { ...x, valor: Number(e.target.value) || 0 }
                          : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setPagamentos((ps) => ps.filter((_, idx) => idx !== i))
                  }
                  className="text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-border pt-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Pago</span>
              <span>{money(pago)}</span>
            </div>
            {falta > 0.001 ? (
              <div className="flex justify-between font-medium text-red-600">
                <span>Falta</span>
                <span>{money(falta)}</span>
              </div>
            ) : (
              <div className="flex justify-between font-medium text-green-700">
                <span>Troco (dinheiro)</span>
                <span>{money(troco)}</span>
              </div>
            )}
          </div>
        </section>

        <section className="card p-4">
          <label className="label">Observação</label>
          <textarea
            className="input"
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emitirNfe}
              onChange={(e) => setEmitirNfe(e.target.checked)}
            />
            Emitir NF-e ao finalizar
          </label>
          <p className="mt-1 text-xs text-muted">
            A NF-e cobre só as peças. Serviços/mão de obra não entram na NF-e.
          </p>
        </section>

        {itensIncompletos && (
          <p className="text-center text-xs text-red-600">
            Preencha descrição e valor de cada linha de serviço.
          </p>
        )}

        {precisaAprovacaoDesc && (
          <section className="card border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-800">
              Desconto de {descontoPct.toFixed(1)}% acima do limite de{" "}
              {limiteDesconto}%
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Um administrador pode liberar agora informando e-mail e senha. Sem
              isso, a venda vai para a fila de aprovação e só segue para o caixa
              depois de aprovada.
            </p>
            <div className="mt-3 space-y-2">
              <input
                type="email"
                name="adminEmail"
                autoComplete="off"
                placeholder="E-mail do administrador (opcional)"
                className="input py-1 text-sm"
              />
              <PasswordInput
                name="adminSenha"
                autoComplete="off"
                placeholder="Senha do administrador (opcional)"
                className="input py-1 text-sm"
              />
            </div>
          </section>
        )}

        {soPreVenda ? (
          <>
            <button
              type="submit"
              formAction={salvarPreVendaAction}
              disabled={!carrinhoOk}
              className="btn-primary w-full py-3 text-base"
            >
              {!carrinhoOk
                ? "Enviar ao caixa"
                : precisaAprovacaoDesc
                  ? `Enviar (desconto p/ aprovação) — ${money(total)}`
                  : `Enviar ao caixa — ${money(total)}`}
            </button>
            <p className="text-center text-xs text-muted">
              {precisaAprovacaoDesc
                ? "Sem liberação de admin, a venda fica aguardando aprovação."
                : "A venda vai para o caixa concluir o pagamento."}
            </p>
            {salvarOrcamentoAction && (
              <button
                type="submit"
                formAction={salvarOrcamentoAction}
                disabled={!carrinhoOk}
                className="btn-ghost w-full"
              >
                Salvar como orçamento (não vai pro caixa)
              </button>
            )}
          </>
        ) : (
          <>
            <FinalizarButton
              habilitado={podeFinalizar}
              total={total}
              rotulo={recebendo ? "Receber" : "Finalizar"}
            />
            {!podeFinalizar && carrinhoOk && (
              <p className="text-center text-xs text-red-600">
                Informe o pagamento para concluir.
              </p>
            )}
            {!recebendo && salvarPreVendaAction && (
              <button
                type="submit"
                formAction={salvarPreVendaAction}
                disabled={!carrinhoOk}
                className="btn-ghost w-full"
              >
                Salvar p/ o caixa (sem receber)
              </button>
            )}
            {!recebendo && salvarOrcamentoAction && (
              <button
                type="submit"
                formAction={salvarOrcamentoAction}
                disabled={!carrinhoOk}
                className="btn-ghost w-full"
              >
                Salvar como orçamento
              </button>
            )}
          </>
        )}
      </aside>
    </form>
  );
}
