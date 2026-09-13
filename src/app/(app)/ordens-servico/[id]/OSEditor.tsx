"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { SubmitButton } from "@/components/SubmitButton";

interface CatProduct {
  id: string;
  sku: string;
  nome: string;
  precoVenda: number;
  estoque: number;
  unidade: string;
}
interface CatService {
  id: string;
  codigo: string;
  nome: string;
  preco: number;
}
interface VehicleOpt {
  id: string;
  label: string;
}
interface ExistingItem {
  tipo: string;
  productId: string | null;
  serviceId: string | null;
  descricao: string;
  quantidade: number;
  precoUnit: number;
  desconto: number;
}
interface OSData {
  status: string;
  tecnico: string | null;
  descricaoProblema: string | null;
  diagnostico: string | null;
  kmEntrada: number | null;
  previsaoEntrega: string | null; // ISO ou ""
  observacao: string | null;
  desconto: number;
  vehicleId: string | null;
  temCliente: boolean;
  items: ExistingItem[];
}

interface Row {
  tipo: "PECA" | "SERVICO";
  refId: string; // catalog id ou "manual"
  descricao: string;
  quantidade: number;
  precoUnit: number;
  desconto: number;
  estoque?: number;
}

export function OSEditor({
  action,
  os,
  vehicles,
  produtos,
  servicos,
}: {
  action: (formData: FormData) => void;
  os: OSData;
  vehicles: VehicleOpt[];
  produtos: CatProduct[];
  servicos: CatService[];
}) {
  const readOnly = os.status === "ENTREGUE" || os.status === "CANCELADA";

  const [rows, setRows] = useState<Row[]>(
    os.items.map((i) => ({
      tipo: i.tipo === "SERVICO" ? "SERVICO" : "PECA",
      refId: i.productId || i.serviceId || "manual",
      descricao: i.descricao,
      quantidade: i.quantidade,
      precoUnit: i.precoUnit,
      desconto: i.desconto,
      estoque: produtos.find((p) => p.id === i.productId)?.estoque,
    })),
  );
  const [desconto, setDesconto] = useState(os.desconto);
  const [novoVeiculo, setNovoVeiculo] = useState(false);
  const [pickProd, setPickProd] = useState("");
  const [pickServ, setPickServ] = useState("");

  function addProduto(id: string) {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;
    setRows((r) => [
      ...r,
      {
        tipo: "PECA",
        refId: p.id,
        descricao: p.nome,
        quantidade: 1,
        precoUnit: p.precoVenda,
        desconto: 0,
        estoque: p.estoque,
      },
    ]);
    setPickProd("");
  }
  function addServico(id: string) {
    const s = servicos.find((x) => x.id === id);
    if (!s) return;
    setRows((r) => [
      ...r,
      {
        tipo: "SERVICO",
        refId: s.id,
        descricao: s.nome,
        quantidade: 1,
        precoUnit: s.preco,
        desconto: 0,
      },
    ]);
    setPickServ("");
  }
  function addManual(tipo: "PECA" | "SERVICO") {
    setRows((r) => [
      ...r,
      { tipo, refId: "manual", descricao: "", quantidade: 1, precoUnit: 0, desconto: 0 },
    ]);
  }
  function update(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function remove(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  const totals = useMemo(() => {
    let pecas = 0;
    let serv = 0;
    for (const r of rows) {
      const t = r.quantidade * r.precoUnit - r.desconto;
      if (r.tipo === "PECA") pecas += t;
      else serv += t;
    }
    return { pecas, serv, total: pecas + serv - desconto };
  }, [rows, desconto]);

  const payload = rows.map((r) => ({
    tipo: r.tipo,
    productId: r.tipo === "PECA" && r.refId !== "manual" ? r.refId : null,
    serviceId: r.tipo === "SERVICO" && r.refId !== "manual" ? r.refId : null,
    descricao: r.descricao,
    quantidade: r.quantidade,
    precoUnit: r.precoUnit,
    desconto: r.desconto,
  }));

  const prevLocal = os.previsaoEntrega
    ? new Date(os.previsaoEntrega).toISOString().slice(0, 16)
    : "";

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="itens" value={JSON.stringify(payload)} />

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Veículo</h2>
        {os.temCliente ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {!novoVeiculo && (
              <div>
                <label className="label">Veículo do cliente</label>
                <select
                  name="vehicleId"
                  className="input"
                  defaultValue={os.vehicleId ?? ""}
                  disabled={readOnly}
                >
                  <option value="">— nenhum —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
                {!readOnly && (
                  <button
                    type="button"
                    className="mt-2 text-xs text-primary"
                    onClick={() => setNovoVeiculo(true)}
                  >
                    + cadastrar novo veículo
                  </button>
                )}
              </div>
            )}
            {novoVeiculo && (
              <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
                <input type="hidden" name="vehicleId" value="" />
                <input name="veiculoMarca" placeholder="Marca" className="input" />
                <input name="veiculoModelo" placeholder="Modelo" className="input" />
                <input name="veiculoPlaca" placeholder="Placa" className="input" />
                <input name="veiculoAno" placeholder="Ano" className="input" />
                <input name="veiculoCor" placeholder="Cor" className="input" />
                <input
                  name="veiculoKm"
                  type="number"
                  placeholder="KM"
                  className="input"
                />
                <button
                  type="button"
                  className="text-xs text-muted"
                  onClick={() => setNovoVeiculo(false)}
                >
                  usar veículo já cadastrado
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Defina o cliente da OS (abaixo) para vincular um veículo.
          </p>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Atendimento</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Técnico</label>
            <input
              name="tecnico"
              defaultValue={os.tecnico ?? ""}
              className="input"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="label">KM de entrada</label>
            <input
              name="kmEntrada"
              type="number"
              defaultValue={os.kmEntrada ?? ""}
              className="input"
              disabled={readOnly}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Previsão de entrega</label>
            <input
              name="previsaoEntrega"
              type="datetime-local"
              defaultValue={prevLocal}
              className="input"
              disabled={readOnly}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Problema relatado</label>
            <textarea
              name="descricaoProblema"
              rows={2}
              defaultValue={os.descricaoProblema ?? ""}
              className="input"
              disabled={readOnly}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Diagnóstico técnico</label>
            <textarea
              name="diagnostico"
              rows={2}
              defaultValue={os.diagnostico ?? ""}
              className="input"
              disabled={readOnly}
            />
          </div>
          <div className="sm:col-span-4">
            <label className="label">Observações</label>
            <textarea
              name="observacao"
              rows={2}
              defaultValue={os.observacao ?? ""}
              className="input"
              disabled={readOnly}
            />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Peças e serviços</h2>
        {!readOnly && (
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <label className="label">Adicionar peça</label>
              <select
                className="input"
                value={pickProd}
                onChange={(e) => {
                  setPickProd(e.target.value);
                  if (e.target.value) addProduto(e.target.value);
                }}
              >
                <option value="">Selecione…</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.nome} — {money(p.precoVenda)} (est. {p.estoque})
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-56 flex-1">
              <label className="label">Adicionar serviço</label>
              <select
                className="input"
                value={pickServ}
                onChange={(e) => {
                  setPickServ(e.target.value);
                  if (e.target.value) addServico(e.target.value);
                }}
              >
                <option value="">Selecione…</option>
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.codigo} · {s.nome} — {money(s.preco)}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => addManual("PECA")} className="btn-ghost">
              + peça avulsa
            </button>
            <button
              type="button"
              onClick={() => addManual("SERVICO")}
              className="btn-ghost"
            >
              + serviço avulso
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th w-16">Tipo</th>
                <th className="th">Descrição</th>
                <th className="th w-20 text-right">Qtd</th>
                <th className="th w-28 text-right">Vlr unit.</th>
                <th className="th w-24 text-right">Desc.</th>
                <th className="th w-28 text-right">Total</th>
                {!readOnly && <th className="th w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className="td text-muted" colSpan={7}>
                    Nenhum item.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const total = r.quantidade * r.precoUnit - r.desconto;
                const semEstoque =
                  r.tipo === "PECA" &&
                  r.estoque !== undefined &&
                  r.quantidade > r.estoque;
                return (
                  <tr key={i}>
                    <td className="td">
                      <span
                        className={`badge ${
                          r.tipo === "PECA"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-teal-100 text-teal-700"
                        }`}
                      >
                        {r.tipo === "PECA" ? "peça" : "serv."}
                      </span>
                    </td>
                    <td className="td">
                      <input
                        className="input"
                        value={r.descricao}
                        disabled={readOnly}
                        onChange={(e) => update(i, { descricao: e.target.value })}
                      />
                      {semEstoque && (
                        <span className="text-xs text-red-600">
                          estoque disponível: {r.estoque}
                        </span>
                      )}
                    </td>
                    <td className="td">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        inputMode="numeric"
                        className="input text-right"
                        value={r.quantidade}
                        disabled={readOnly}
                        onChange={(e) => {
                          const n = Math.floor(Number(e.target.value));
                          update(i, { quantidade: n >= 1 ? n : 1 });
                        }}
                      />
                    </td>
                    <td className="td">
                      <input
                        type="number"
                        step="0.01"
                        className="input text-right"
                        value={r.precoUnit}
                        disabled={readOnly}
                        onChange={(e) =>
                          update(i, { precoUnit: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="td">
                      <input
                        type="number"
                        step="0.01"
                        className="input text-right"
                        value={r.desconto}
                        disabled={readOnly}
                        onChange={(e) =>
                          update(i, { desconto: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="td text-right font-medium">{money(total)}</td>
                    {!readOnly && (
                      <td className="td">
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="text-red-500"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Total peças</span>
              <span>{money(totals.pecas)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total serviços</span>
              <span>{money(totals.serv)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Desconto</span>
              <input
                name="desconto"
                type="number"
                step="0.01"
                value={desconto}
                disabled={readOnly}
                onChange={(e) => setDesconto(Number(e.target.value) || 0)}
                className="input w-28 text-right"
              />
            </div>
            <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>
        </div>
      </section>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-6 border-t border-border bg-surface/95 px-6 py-3 backdrop-blur">
          <SubmitButton>Salvar OS</SubmitButton>
        </div>
      )}
    </form>
  );
}
