"use client";

import { useState } from "react";
import { excluirMovimento } from "../actions";

export function CancelarMovimentoForm({ id }: { id: string }) {
  const [motivo, setMotivo] = useState("");
  const ok = motivo.trim().length >= 5;

  return (
    <details className="text-right text-xs">
      <summary className="cursor-pointer text-red-600">cancelar</summary>
      <form
        action={excluirMovimento.bind(null, id)}
        className="mt-2 w-56 space-y-1 text-left"
      >
        <textarea
          name="motivo"
          rows={2}
          minLength={5}
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo do cancelamento (mín. 5 caracteres)"
          className="input text-xs"
        />
        <button
          type="submit"
          disabled={!ok}
          className="btn-danger px-2 py-0.5 text-xs disabled:opacity-50"
        >
          Confirmar cancelamento
        </button>
      </form>
    </details>
  );
}
