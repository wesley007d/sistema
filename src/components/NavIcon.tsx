/** Ícones de navegação (outline, 20px, currentColor). Um por chave de módulo. */
const PATHS: Record<string, string> = {
  dashboard:
    "M3.5 10.5 12 3l8.5 7.5M5 9.5V20h4.5v-5.5h5V20H19V9.5",
  produtos:
    "M3.5 7.5 12 3l8.5 4.5M3.5 7.5 12 12l8.5-4.5M3.5 7.5v9L12 21m8.5-13.5v9L12 21m0-9v9",
  servicos:
    "M14.5 6.5a3.5 3.5 0 0 1-4.6 4.6L5 16v3h3l4.9-4.9a3.5 3.5 0 0 1 4.6-4.6l-2.5 2.5-2-2 2.5-2.5Z",
  parceiros:
    "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20c0-2.8 2.2-5 5-5s5 2.2 5 5M16 12a2.5 2.5 0 1 0 0-5m1 12c0-2.3-.9-3.9-2.5-4.7",
  caixa:
    "M3.5 8h17v11a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V8ZM3.5 8l2-4h13l2 4M9.5 12h5",
  vendas:
    "M6 6h15l-1.6 8H7.5L6 4H3m4.5 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  ordens_servico:
    "M9 4h6l1 2h3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6h3l1-2Zm-1 8h8M8 15.5h5",
  notas:
    "M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 0v5h5M8.5 12h7M8.5 15.5h7",
  xml:
    "M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 0v5h5M9.5 12 8 14l1.5 2m5-4L16 14l-1.5 2",
  financeiro:
    "M3.5 6.5h17v11h-17zM3.5 10h17M7 14h3",
  financeiro_caixa:
    "M12 3v18M8.5 6.5h5.5a2.5 2.5 0 0 1 0 5H10a2.5 2.5 0 0 0 0 5h6",
  relatorios:
    "M4 20V4M4 20h16M8 20v-6m4 6V8m4 12v-9",
  configuracoes:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3-1.8-.6-.5-1.2.9-1.7-1.7-1.7-1.7.9-1.2-.5L12 4h-2.4l-.6 1.8-1.2.5-1.7-.9-1.7 1.7.9 1.7-.5 1.2L2 12v2.4l1.8.6.5 1.2-.9 1.7 1.7 1.7 1.7-.9 1.2.5.6 1.8H12l.6-1.8 1.2-.5 1.7.9 1.7-1.7-.9-1.7.5-1.2L22 12Z",
};

export function NavIcon({
  name,
  className = "size-[18px]",
}: {
  name: string;
  className?: string;
}) {
  const d = PATHS[name] ?? PATHS.dashboard;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
