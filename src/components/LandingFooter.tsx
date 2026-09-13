/** Rodapé de 3 colunas das páginas públicas (login/cadastro). */
export function LandingFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`grid grid-cols-1 gap-4 border-t border-white/10 bg-[#0b1220] px-6 py-5 text-center text-xs text-white/70 sm:grid-cols-3 sm:text-left ${className}`}
    >
      <div className="flex items-center justify-center gap-3 sm:justify-start">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden="true">
            <path d="M12 2.5 19.5 5.5V11c0 5-3.2 8.7-7.5 10.5C7.7 19.7 4.5 16 4.5 11V5.5L12 2.5Z" />
            <path d="M9.2 12l1.9 1.9 3.7-3.9" />
          </svg>
        </span>
        <div>
          <p className="font-medium text-white">Ambiente seguro</p>
          <p>Seus dados protegidos.</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-0.5">
        <p>
          © {new Date().getFullYear()} Auto Peças System. Todos os direitos
          reservados.
        </p>
        <p>Desenvolvido por Wesley Vinicius</p>
      </div>

      <div className="flex items-center justify-center gap-3 sm:justify-end">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden="true">
            <path d="M4 13a8 8 0 0 1 16 0" />
            <path d="M4 13v4a2 2 0 0 0 2 2h1v-6H5a1 1 0 0 0-1 1Zm16 0v4a2 2 0 0 1-2 2h-1v-6h2a1 1 0 0 1 1 1Z" />
            <path d="M14 19a2 2 0 0 1-2 2h-1" />
          </svg>
        </span>
        <div>
          <p className="font-medium text-white">Suporte especializado</p>
          <p>Estamos sempre com você.</p>
        </div>
      </div>
    </footer>
  );
}
