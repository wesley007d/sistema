"use client";

import { useState, useTransition } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { pedirAutorizacao } from "@/app/autorizar/actions";
import type { TipoAutorizacao } from "@/lib/autorizacao-remota";

/**
 * Autorização do administrador: ou ele digita e-mail e senha aqui, ou (quando
 * não está na loja) o funcionário manda o pedido pelo WhatsApp e digita o
 * código que o admin devolver. Campos enviados: adminEmail/adminSenha ou
 * autorizacaoToken/autorizacaoCodigo.
 */
export function AutorizacaoAdmin({
  tipo,
  descricao,
  pct,
  compacto = false,
}: {
  tipo: TipoAutorizacao;
  /** o que o admin vai ler no celular */
  descricao: string;
  /** desconto pedido (%), só para "desconto" */
  pct?: number;
  compacto?: boolean;
}) {
  const [modo, setModo] = useState<"aqui" | "whatsapp">("aqui");
  const [token, setToken] = useState("");
  const [enviando, startTransition] = useTransition();
  const [erro, setErro] = useState("");

  function pedir() {
    setErro("");
    // abre a aba já no clique (navegador bloqueia pop-up aberto depois do await)
    const janela = window.open("", "_blank");
    startTransition(async () => {
      try {
        const r = await pedirAutorizacao(tipo, descricao, pct);
        setToken(r.token);
        if (janela) janela.location.href = r.whatsapp;
        else window.location.href = r.whatsapp;
      } catch (e) {
        janela?.close();
        setErro(e instanceof Error ? e.message : "Não foi possível gerar o pedido.");
      }
    });
  }

  const inputCls = compacto ? "input py-1 text-sm" : "input";

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-md bg-surface-2 p-1 text-sm">
        <button
          type="button"
          onClick={() => setModo("aqui")}
          className={`flex-1 rounded px-2 py-1 ${modo === "aqui" ? "bg-surface font-medium shadow-sm" : "text-muted"}`}
        >
          Administrador aqui
        </button>
        <button
          type="button"
          onClick={() => setModo("whatsapp")}
          className={`flex-1 rounded px-2 py-1 ${modo === "whatsapp" ? "bg-surface font-medium shadow-sm" : "text-muted"}`}
        >
          Pedir pelo WhatsApp
        </button>
      </div>

      {modo === "aqui" ? (
        <div className={compacto ? "space-y-2" : "grid gap-3 sm:grid-cols-2"}>
          <input
            type="email"
            name="adminEmail"
            autoComplete="off"
            placeholder="E-mail do administrador"
            className={inputCls}
          />
          <PasswordInput
            name="adminSenha"
            autoComplete="off"
            placeholder="Senha do administrador"
            className={inputCls}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={pedir}
            disabled={enviando}
            className="btn-ghost w-full border-green-600 text-green-700"
          >
            {enviando ? "Gerando…" : token ? "Enviar o pedido de novo" : "📲 Enviar pedido pelo WhatsApp"}
          </button>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          {token && (
            <>
              <input type="hidden" name="autorizacaoToken" value={token} />
              <input
                name="autorizacaoCodigo"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="off"
                placeholder="Código de 6 números que o admin mandou"
                className={`${inputCls} text-center font-mono tracking-widest`}
              />
              <p className="text-xs text-muted">
                O administrador abre o link, confirma com a senha dele e te manda o código. Vale
                30 minutos.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
