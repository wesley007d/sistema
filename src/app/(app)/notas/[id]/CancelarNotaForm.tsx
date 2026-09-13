"use client";

import { useState } from "react";
import { ConfirmButton } from "@/components/ConfirmButton";
import { cancelInvoice } from "../actions";

const MOTIVOS = [
  "Erro de digitação nos dados da nota",
  "Nota fiscal emitida em duplicidade",
  "Cliente desistiu da compra",
  "Erro no valor ou nos itens da nota",
  "Dados do destinatário incorretos",
  "Operação comercial não realizada",
];

export function CancelarNotaForm({ id }: { id: string }) {
  const [motivo, setMotivo] = useState("");

  return (
    <form action={cancelInvoice.bind(null, id)} className="space-y-2">
      <label className="label" htmlFor="motivo-preset">
        Motivo do cancelamento
      </label>
      <select
        id="motivo-preset"
        className="input"
        value={MOTIVOS.includes(motivo) ? motivo : ""}
        onChange={(e) => setMotivo(e.target.value)}
      >
        <option value="">Escolher um motivo comum…</option>
        {MOTIVOS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <textarea
        name="motivo"
        rows={3}
        minLength={15}
        required
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Descreva o motivo (mín. 15 caracteres)"
        className="input"
      />
      <p className="text-xs text-muted">
        {motivo.trim().length < 15
          ? `Faltam ${15 - motivo.trim().length} caractere(s).`
          : "Motivo válido."}
      </p>

      <ConfirmButton
        message="Confirmar cancelamento da nota?"
        className="btn-danger w-full"
      >
        Cancelar nota
      </ConfirmButton>
    </form>
  );
}
