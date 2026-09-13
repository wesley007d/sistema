"use client";

import { useState } from "react";
import { cancelarOrcamento } from "./actions";

export function DescartarOrcamentoForm({ id }: { id: string }) {
  const [motivo, setMotivo] = useState("");
  const ok = motivo.trim().length >= 5;

  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-red-600">
        Descartar orçamento
      </summary>
      <form
        action={cancelarOrcamento.bind(null, id)}
        className="mt-2 space-y-2"
      >
        <textarea
          name="motivo"
          rows={2}
          minLength={5}
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo do descarte (obrigatório, mín. 5 caracteres)"
          className="input"
        />
        <p className="text-xs text-muted">
          O orçamento não é apagado — fica salvo como descartado, com o motivo.
        </p>
        <button
          type="submit"
          disabled={!ok}
          className="btn-danger disabled:opacity-50"
        >
          Confirmar descarte
        </button>
      </form>
    </details>
  );
}
