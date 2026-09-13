/**
 * Link para a versão de impressão de um relatório (rota `/relatorios/<x>/imprimir`).
 * Abre em nova aba; o usuário salva como PDF pelo diálogo de impressão do navegador
 * (Ctrl+P), igual ao cupom/OS/notas — não depende de nenhuma lib de PDF.
 */
export function ExportPdfButton({
  href,
  label = "Exportar PDF",
}: {
  href: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-ghost shrink-0 text-sm"
    >
      🖨 {label}
    </a>
  );
}
