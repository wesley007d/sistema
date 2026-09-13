/** Rodapé com direitos reservados (nome da empresa quando logado) + crédito. */
export function SiteFooter({
  nomeEmpresa,
  className = "",
}: {
  nomeEmpresa?: string | null;
  className?: string;
}) {
  return (
    <footer
      className={`flex flex-col items-center justify-between gap-1 border-t border-border px-6 py-4 text-xs text-muted sm:flex-row sm:px-8 ${className}`}
    >
      <span>
        © {new Date().getFullYear()} {nomeEmpresa ?? "Auto Peças System"}. Todos
        os direitos reservados.
      </span>
      <span>Desenvolvido por Wesley Vinicius</span>
    </footer>
  );
}
