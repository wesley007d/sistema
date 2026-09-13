import { LocalFiscalProvider } from "./local-provider";
import { PlugNotasProvider } from "./plugnotas-provider";
import type { FiscalProvider } from "./types";

let instance: FiscalProvider | null = null;

/** Retorna o provedor fiscal configurado em FISCAL_PROVIDER (.env) */
export function getFiscalProvider(): FiscalProvider {
  if (instance) return instance;
  const kind = (process.env.FISCAL_PROVIDER ?? "local").toLowerCase();
  switch (kind) {
    case "plugnotas":
      instance = new PlugNotasProvider();
      break;
    case "local":
    default:
      instance = new LocalFiscalProvider();
      break;
  }
  return instance;
}

export type { FiscalProvider, EmitResult, InvoiceFull } from "./types";
