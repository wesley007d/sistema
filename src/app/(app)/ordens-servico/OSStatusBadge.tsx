const map: Record<string, { label: string; cls: string }> = {
  ORCAMENTO: { label: "orçamento", cls: "bg-gray-100 text-gray-600" },
  APROVADA: { label: "aprovada", cls: "bg-blue-100 text-blue-700" },
  EM_EXECUCAO: { label: "em execução", cls: "bg-amber-100 text-amber-700" },
  CONCLUIDA: { label: "concluída", cls: "bg-teal-100 text-teal-700" },
  ENTREGUE: { label: "entregue", cls: "bg-green-100 text-green-700" },
  CANCELADA: { label: "cancelada", cls: "bg-red-100 text-red-700" },
};

export function OSStatusBadge({ status }: { status: string }) {
  const s = map[status] ?? { label: status.toLowerCase(), cls: "bg-gray-100 text-gray-600" };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export const OS_FLUXO: Record<string, { to: string; label: string }[]> = {
  ORCAMENTO: [{ to: "APROVADA", label: "Aprovar orçamento" }],
  APROVADA: [{ to: "EM_EXECUCAO", label: "Iniciar execução" }],
  EM_EXECUCAO: [{ to: "CONCLUIDA", label: "Concluir serviço" }],
  CONCLUIDA: [{ to: "ENTREGUE", label: "Entregar ao cliente" }],
  ENTREGUE: [],
  CANCELADA: [{ to: "ORCAMENTO", label: "Reabrir" }],
};
