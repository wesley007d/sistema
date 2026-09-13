const map: Record<string, string> = {
  AUTORIZADA: "bg-green-100 text-green-700",
  RASCUNHO: "bg-gray-100 text-gray-600",
  PROCESSANDO: "bg-blue-100 text-blue-700",
  REJEITADA: "bg-red-100 text-red-700",
  CANCELADA: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.toLowerCase()}
    </span>
  );
}
