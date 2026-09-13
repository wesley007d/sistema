"use client";

import { useState } from "react";
import { aprovarDescontoVenda, negarDescontoVenda } from "../actions";

export function AprovacaoDescontoForm({ id }: { id: string }) {
  const [motivo, setMotivo] = useState("");
  const ok = motivo.trim().length >= 5;

  return (
    <div className="flex flex-wrap items-start gap-2">
      <form action={aprovarDescontoVenda.bind(null, id)}>
        <button type="submit" className="btn-primary px-3 py-1 text-xs">
          Aprovar desconto
        </button>
      </form>
      <details className="text-sm">
        <summary className="btn-ghost cursor-pointer px-3 py-1 text-xs text-red-600">
          Negar
        </summary>
        <form
          action={negarDescontoVenda.bind(null, id)}
          className="mt-2 w-64 space-y-2"
        >
          <textarea
            name="motivo"
            rows={2}
            minLength={5}
            required
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo da recusa (mín. 5 caracteres)"
            className="input text-sm"
          />
          <button
            type="submit"
            disabled={!ok}
            className="btn-danger px-3 py-1 text-xs disabled:opacity-50"
          >
            Confirmar recusa
          </button>
        </form>
      </details>
    </div>
  );
}
