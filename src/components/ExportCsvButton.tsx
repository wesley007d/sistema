/**
 * Link de download de CSV. Aponta para uma rota `/relatorios/<x>/export` que
 * devolve o arquivo com `Content-Disposition: attachment`.
 */
export function ExportCsvButton({
  href,
  label = "Exportar CSV",
}: {
  href: string;
  label?: string;
}) {
  return (
    <a href={href} className="btn-ghost shrink-0 text-sm" download>
      ⬇ {label}
    </a>
  );
}
