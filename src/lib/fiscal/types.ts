import type {
  Company,
  Invoice,
  InvoiceItem,
  InvoiceServiceItem,
  Partner,
} from "@prisma/client";

export type InvoiceFull = Invoice & {
  partner: Partner | null;
  items: InvoiceItem[];
  serviceItems: InvoiceServiceItem[];
};

export interface EmitResult {
  /**
   * AUTORIZADA  — nota autorizada pela SEFAZ / prefeitura.
   * REJEITADA   — recusada; ver `motivoRejeicao`.
   * PROCESSANDO — enviada ao provedor mas ainda sem retorno definitivo
   *               (emissão assíncrona). Deve ser reconsultada depois.
   */
  status: "AUTORIZADA" | "REJEITADA" | "PROCESSANDO";
  chaveAcesso?: string;
  protocolo?: string;
  xml?: string;
  motivoRejeicao?: string;
  /** Id do documento no provedor (PlugNotas) usado para consultar a situação depois. */
  idExterno?: string;
}

export interface CancelResult {
  status: "CANCELADA" | "REJEITADA";
  protocolo?: string;
  motivoRejeicao?: string;
}

export interface FiscalProvider {
  readonly name: string;
  /** Emite NF-e (modelo 55) ou NFC-e (modelo 65), conforme `invoice.tipo`. */
  emitNfe(invoice: InvoiceFull, company: Company): Promise<EmitResult>;
  /** Emite NFS-e de servico */
  emitNfse(invoice: InvoiceFull, company: Company): Promise<EmitResult>;
  /** Cancela uma nota autorizada */
  cancel(invoice: Invoice, motivo: string): Promise<CancelResult>;
  /**
   * Reconsulta uma nota que ficou em PROCESSANDO (emissão assíncrona).
   * Opcional: provedores síncronos (ex.: `local`) não implementam.
   */
  consultar?(invoice: Invoice): Promise<EmitResult>;
}
