"use client";

import { useState } from "react";
import { setOSStatus } from "../actions";

export function CancelarOSForm({ id }: { id: string }) {
  const [motivo, setMotivo] = useState("");
  const ok = motivo.trim().length >= 5;

  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-red-600">
        Cancelar esta OS
      </summary>
      <form
        action={setOSStatus.bind(null, id, "CANCELADA")}
        className="mt-2 space-y-2"
      >
        <textarea
          name="motivo"
          rows={2}
          minLength={5}
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo do cancelamento (obrigatório, mín. 5 caracteres)"
          className="input"
        />
        <p className="text-xs text-muted">
          Peças já baixadas voltam ao estoque. O motivo fica registrado na OS,
          mesmo cancelando como administrador.
        </p>
        <button type="submit" disabled={!ok} className="btn-danger disabled:opacity-50">
          Confirmar cancelamento
        </button>
      </form>
    </details>
  );
}
