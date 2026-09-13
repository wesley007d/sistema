"use client";

import { useState } from "react";

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function num(s: string): number {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Custo × Margem de lucro (%) ⇄ Preço de venda, recalculado ao digitar.
 * Os três são campos reais do formulário (precoCusto, margemLucro, precoVenda);
 * a margem é só um auxílio de cálculo — o que se salva é custo e venda.
 * `readOnly` = só exibe (usado quando o usuário não é admin: preço é bloqueado).
 */
export function PrecoCalculator({
  custo,
  venda,
  readOnly = false,
}: {
  custo?: number | null;
  venda?: number | null;
  readOnly?: boolean;
}) {
  const temValores = !!custo && custo > 0 && !!venda && venda > 0;
  const [custoStr, setCusto] = useState(custo ? String(custo) : "");
  const [vendaStr, setVenda] = useState(venda ? String(venda) : "");
  const [margemStr, setMargem] = useState(
    temValores ? String(round2((venda! / custo! - 1) * 100)) : "",
  );

  function aoMudarCusto(v: string) {
    setCusto(v);
    const c = num(v);
    const m = num(margemStr);
    if (Number.isFinite(c) && Number.isFinite(m)) {
      setVenda(String(round2(c * (1 + m / 100))));
    }
  }
  function aoMudarMargem(v: string) {
    setMargem(v);
    const c = num(custoStr);
    const m = num(v);
    if (Number.isFinite(c) && Number.isFinite(m)) {
      setVenda(String(round2(c * (1 + m / 100))));
    }
  }
  function aoMudarVenda(v: string) {
    setVenda(v);
    const c = num(custoStr);
    const p = num(v);
    if (Number.isFinite(c) && c > 0 && Number.isFinite(p)) {
      setMargem(String(round2((p / c - 1) * 100)));
    }
  }

  const cls = `input ${readOnly ? "bg-surface-2 text-muted" : ""}`;

  return (
    <>
      <div>
        <label className="label" htmlFor="precoCusto">
          Preço de custo
        </label>
        <input
          id="precoCusto"
          name="precoCusto"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={custoStr}
          readOnly={readOnly}
          onChange={(e) => aoMudarCusto(e.target.value)}
          className={cls}
        />
      </div>
      <div>
        <label className="label" htmlFor="margemLucro">
          Margem de lucro (%)
        </label>
        <input
          id="margemLucro"
          name="margemLucro"
          type="number"
          step="0.1"
          placeholder="ex.: 40"
          value={margemStr}
          readOnly={readOnly}
          onChange={(e) => aoMudarMargem(e.target.value)}
          className={cls}
        />
        {!readOnly && (
          <p className="mt-1 text-xs text-muted">
            Preenche o preço de venda a partir do custo.
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="precoVenda">
          Preço de venda
        </label>
        <input
          id="precoVenda"
          name="precoVenda"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={vendaStr}
          readOnly={readOnly}
          onChange={(e) => aoMudarVenda(e.target.value)}
          className={cls}
        />
        {readOnly && (
          <p className="mt-1 text-xs text-muted">
            Somente o administrador geral altera preços.
          </p>
        )}
      </div>
    </>
  );
}
