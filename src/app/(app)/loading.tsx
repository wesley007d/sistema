/**
 * Mostrado na hora em que se clica num link do menu, enquanto o servidor monta a
 * página. Sem isso a tela fica parada esperando a resposta e parece travada.
 * Vale para todas as telas dentro de (app) — o menu lateral continua na tela.
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-6 border-b border-border pb-4">
        <div className="h-7 w-56 rounded-md bg-surface-2" />
        <div className="mt-2 h-4 w-80 max-w-full rounded-md bg-surface-2" />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-24 p-4">
            <div className="h-3 w-24 rounded bg-surface-2" />
            <div className="mt-3 h-6 w-32 rounded bg-surface-2" />
          </div>
        ))}
      </div>
      <div className="card divide-y divide-border">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-4 flex-1 rounded bg-surface-2" />
            <div className="h-4 w-24 rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
