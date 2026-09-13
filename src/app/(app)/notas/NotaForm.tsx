"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { money } from "@/lib/format";

export interface CatalogItem {
  id: string;
  label: string;
  preco: number;
  codigo?: string;
  descricao?: string;
  ncm?: string | null;
  cfop?: string;
  unidade?: string;
  itemListaServico?: string | null;
  aliquotaIss?: number;
}
interface PartnerOpt {
  id: string;
  nome: string;
}
interface Row {
  refId: string; // catalog id ou "manual"
  descricao: string;
  quantidade: number;
  precoUnit: number;
  desconto: number;
  aliquotaIss: number;
  issRetido: boolean;
  // metadados fiscais
  codigo?: string;
  ncm?: string | null;
  cfop?: string;
  unidade?: string;
  itemListaServico?: string | null;
}

export function NotaForm({
  kind,
  action,
  partners,
  catalog,
}: {
  kind: "NFE" | "NFSE";
  action: (formData: FormData) => void;
  partners: PartnerOpt[];
  catalog: CatalogItem[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [pick, setPick] = useState("");

  function addFromCatalog(id: string) {
    const c = catalog.find((x) => x.id === id);
    if (!c) return;
    setRows((r) => [
      ...r,
      {
        refId: kind === "NFE" ? c.id : c.id,
        descricao: c.descricao || c.label,
        quantidade: 1,
        precoUnit: c.preco,
        desconto: 0,
        aliquotaIss: c.aliquotaIss ?? 0,
        issRetido: false,
        codigo: c.codigo,
        ncm: c.ncm,
        cfop: c.cfop,
        unidade: c.unidade,
        itemListaServico: c.itemListaServico,
      },
    ]);
    setPick("");
  }

  function addManual() {
    setRows((r) => [
      ...r,
      {
        refId: "manual",
        descricao: "",
        quantidade: 1,
        precoUnit: 0,
        desconto: 0,
        aliquotaIss: 0,
        issRetido: false,
        cfop: "5102",
        unidade: "UN",
      },
    ]);
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function remove(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  const totals = useMemo(() => {
    let bruto = 0;
    let desc = 0;
    let iss = 0;
    for (const r of rows) {
      const b = r.quantidade * r.precoUnit;
      bruto += b;
      desc += r.desconto;
      if (kind === "NFSE") iss += ((b - r.desconto) * r.aliquotaIss) / 100;
    }
    return { bruto, desc, iss, total: bruto - desc };
  }, [rows, kind]);

  const payload = rows.map((r) =>
    kind === "NFE"
      ? {
          productId: r.refId === "manual" ? undefined : r.refId,
          codigo: r.codigo,
          descricao: r.descricao,
          ncm: r.ncm,
          cfop: r.cfop,
          unidade: r.unidade,
          quantidade: r.quantidade,
          precoUnit: r.precoUnit,
          desconto: r.desconto,
        }
      : {
          serviceId: r.refId === "manual" ? undefined : r.refId,
          descricao: r.descricao,
          itemListaServico: r.itemListaServico,
          quantidade: r.quantidade,
          precoUnit: r.precoUnit,
          aliquotaIss: r.aliquotaIss,
          issRetido: r.issRetido,
        },
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="itens" value={JSON.stringify(payload)} />

      <section className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">
              {kind === "NFE" ? "Destinatário" : "Tomador do serviço"}
            </label>
            <select name="partnerId" className="input" defaultValue="">
              <option value="">— Consumidor não identificado —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          {kind === "NFE" && (
            <div>
              <label className="label">Natureza da operação</label>
              <input
                name="naturezaOperacao"
                defaultValue="Venda de mercadoria"
                className="input"
              />
            </div>
          )}
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label className="label">
              Adicionar {kind === "NFE" ? "produto" : "serviço"}
            </label>
            <select
              className="input"
              value={pick}
              onChange={(e) => {
                setPick(e.target.value);
                if (e.target.value) addFromCatalog(e.target.value);
              }}
            >
              <option value="">Selecione…</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} — {money(c.preco)}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={addManual} className="btn-ghost">
            + Item avulso
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Descrição</th>
                <th className="th w-20 text-right">Qtd</th>
                <th className="th w-28 text-right">Vlr unit.</th>
                {kind === "NFE" ? (
                  <th className="th w-24 text-right">Desconto</th>
                ) : (
                  <th className="th w-20 text-right">ISS %</th>
                )}
                <th className="th w-28 text-right">Total</th>
                <th className="th w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className="td text-muted" colSpan={6}>
                    Nenhum item. Selecione acima.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const total = r.quantidade * r.precoUnit - r.desconto;
                return (
                  <tr key={i}>
                    <td className="td">
                      <input
                        className="input"
                        value={r.descricao}
                        onChange={(e) => update(i, { descricao: e.target.value })}
                      />
                    </td>
                    <td className="td">
                      <input
                        type="number"
                        step="0.001"
                        className="input text-right"
                        value={r.quantidade}
                        onChange={(e) =>
                          update(i, { quantidade: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="td">
                      <input
                        type="number"
                        step="0.01"
                        className="input text-right"
                        value={r.precoUnit}
                        onChange={(e) =>
                          update(i, { precoUnit: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="td">
                      {kind === "NFE" ? (
                        <input
                          type="number"
                          step="0.01"
                          className="input text-right"
                          value={r.desconto}
                          onChange={(e) =>
                            update(i, { desconto: Number(e.target.value) })
                          }
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          className="input text-right"
                          value={r.aliquotaIss}
                          onChange={(e) =>
                            update(i, { aliquotaIss: Number(e.target.value) })
                          }
                        />
                      )}
                    </td>
                    <td className="td text-right font-medium">{money(total)}</td>
                    <td className="td">
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="text-red-500"
                        aria-label="Remover"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{money(totals.bruto)}</span>
            </div>
            {kind === "NFE" && (
              <div className="flex justify-between">
                <span className="text-muted">Desconto</span>
                <span>- {money(totals.desc)}</span>
              </div>
            )}
            {kind === "NFSE" && (
              <div className="flex justify-between">
                <span className="text-muted">ISS</span>
                <span>{money(totals.iss)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="emitir"
          value="0"
          className="btn-ghost"
          disabled={rows.length === 0}
        >
          Salvar rascunho
        </button>
        <button
          type="submit"
          name="emitir"
          value="1"
          className="btn-primary"
          disabled={rows.length === 0}
        >
          Emitir agora
        </button>
        <Link href="/notas" className="btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
