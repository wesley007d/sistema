import type { ReactNode } from "react";
import { dateTime } from "@/lib/format";

/** Layout comum das telas de impressão/PDF dos relatórios (mesma linguagem visual das
 * páginas de impressão de OS/NF-e/cupom: fundo branco, texto preto, bordas). */
export function ReportPrintLayout({
  empresa,
  titulo,
  subtitulo,
  children,
}: {
  empresa: {
    razaoSocial: string | null;
    nomeFantasia: string | null;
    cnpj: string | null;
  } | null;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-[13px] text-black">
      <div className="mb-4 flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <h1 className="text-lg font-bold">{empresa?.razaoSocial ?? "—"}</h1>
          {empresa?.nomeFantasia && <p>{empresa.nomeFantasia}</p>}
          {empresa?.cnpj && <p>CNPJ: {empresa.cnpj}</p>}
        </div>
        <div className="text-right">
          <p className="font-bold uppercase">{titulo}</p>
          {subtitulo && <p>{subtitulo}</p>}
          <p>Emitido em {dateTime(new Date())}</p>
        </div>
      </div>

      {children}

      <p className="mt-6 text-center text-xs text-gray-500 print:hidden">
        Ctrl+P para imprimir ou salvar em PDF.
      </p>
    </div>
  );
}

/** Bloco de seção com título + tabela, no mesmo padrão em todas as telas de impressão. */
export function ReportPrintSection({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <p className="mb-1 font-bold">{titulo}</p>
      {children}
    </div>
  );
}
