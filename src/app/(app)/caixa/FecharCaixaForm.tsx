"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { money } from "@/lib/format";
import { fecharCaixa } from "./actions";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3">
      {pending ? "Fechando…" : "Fechar caixa"}
    </button>
  );
}

export function FecharCaixaForm({
  abertura,
  entradas,
  saidas,
  esperado,
}: {
  abertura: number;
  entradas: number;
  saidas: number;
  esperado: number;
}) {
  const [contado, setContado] = useState("");
  const n = Number(contado.replace(",", "."));
  const temContado = contado.trim() !== "" && Number.isFinite(n);
  const diferenca = temContado ? Math.round((n - esperado) * 100) / 100 : 0;
  const aRetirar = Math.round((esperado - abertura) * 100) / 100;

  return (
    <form action={fecharCaixa} className="mt-3 space-y-3 text-sm">
      <div className="rounded-md border border-border">
        <Linha rotulo="Fundo de abertura" valor={money(abertura)} />
        <Linha rotulo="+ Entradas do caixa (vendas à vista, suprimentos)" valor={money(entradas)} />
        <Linha rotulo="− Saídas (sangrias, despesas)" valor={`- ${money(saidas)}`} />
        <div className="flex justify-between border-t border-border px-3 py-2 font-bold">
          <span>= Esperado na gaveta</span>
          <span>{money(esperado)}</span>
        </div>
      </div>

      <div>
        <label className="label">Valor contado na gaveta</label>
        <input
          name="valorContado"
          type="number"
          step="0.01"
          inputMode="decimal"
          required
          value={contado}
          onChange={(e) => setContado(e.target.value)}
          className="input text-lg"
          placeholder="0,00"
        />
      </div>

      {temContado && (
        <div
          className={`flex justify-between rounded-md px-3 py-2 font-semibold ${
            Math.abs(diferenca) < 0.005
              ? "bg-green-50 text-green-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <span>
            {Math.abs(diferenca) < 0.005
              ? "Caixa confere"
              : diferenca > 0
                ? "Sobra"
                : "Falta"}
          </span>
          <span>{money(Math.abs(diferenca))}</span>
        </div>
      )}

      <label className="flex items-start gap-2">
        <input type="checkbox" name="sangrarVendido" defaultChecked className="mt-0.5" />
        <span>
          Retirar {money(aRetirar)} (o que foi recebido no turno) e deixar só o
          fundo de {money(abertura)} na gaveta — registra uma sangria.
        </span>
      </label>

      <div>
        <label className="label">Observação (opcional)</label>
        <input name="observacao" className="input" />
      </div>

      <Btn />
    </form>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between border-b border-border px-3 py-2 last:border-0">
      <span className="text-muted">{rotulo}</span>
      <span>{valor}</span>
    </div>
  );
}
