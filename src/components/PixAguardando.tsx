"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { verificarPagamentoPix } from "@/app/assinatura/actions";

const INTERVALO_MS = 5000;
/** Para de verificar sozinho depois de ~5min (o cliente ainda pode clicar em "verificar agora"). */
const MAX_TENTATIVAS_AUTO = 60;

/**
 * Fica reconsultando o pagamento Pix automaticamente em segundo plano — o
 * cliente não precisa clicar em nada, só termina de pagar no app do banco e o
 * acesso volta sozinho quando a confirmação chegar do Mercado Pago.
 */
export function PixAguardando({ cobrancaId }: { cobrancaId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"aguardando" | "verificando" | "confirmado" | "erro">("aguardando");
  const tentativas = useRef(0);
  const verificando = useRef(false);

  const verificar = useCallback(async () => {
    if (verificando.current) return;
    verificando.current = true;
    setStatus((s) => (s === "confirmado" ? s : "verificando"));
    try {
      const resultado = await verificarPagamentoPix(cobrancaId);
      if (resultado === "PAGO") {
        setStatus("confirmado");
        router.push("/");
        router.refresh();
        return;
      }
      setStatus("aguardando");
    } catch {
      setStatus("erro");
    } finally {
      verificando.current = false;
    }
  }, [cobrancaId, router]);

  useEffect(() => {
    const id = setInterval(() => {
      tentativas.current += 1;
      if (tentativas.current > MAX_TENTATIVAS_AUTO) {
        clearInterval(id);
        return;
      }
      verificar();
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [verificar]);

  return (
    <div className="mt-3">
      <p className="flex items-center justify-center gap-2 text-xs text-muted">
        <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
        {status === "erro"
          ? "Não consegui verificar agora. Vamos tentar de novo em instantes."
          : "Aguardando a confirmação do pagamento… o acesso libera sozinho."}
      </p>
      <button
        type="button"
        onClick={verificar}
        disabled={status === "verificando" || status === "confirmado"}
        className="btn-ghost mt-2 w-full text-sm"
      >
        {status === "verificando" ? "Verificando…" : "Já paguei, verificar agora"}
      </button>
    </div>
  );
}
