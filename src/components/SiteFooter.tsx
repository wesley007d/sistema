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
      className={`flex flex-col items-center justify-center gap-1 border-t border-border px-6 py-4 text-center text-xs text-muted sm:px-8 ${className}`}
    >
      <span>
        © {nomeEmpresa ?? "Auto Peças System"}. Todos os direitos reservados.{" "}
        {new Date().getFullYear()}
      </span>
      <span>Desenvolvido por Wesley Vinicius</span>
    </footer>
  );
}
