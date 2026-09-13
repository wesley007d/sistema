import { PageHeader } from "@/components/PageHeader";

export function EmBreve({
  title,
  descricao,
  itens,
}: {
  title: string;
  descricao: string;
  itens: string[];
}) {
  return (
    <div>
      <PageHeader title={title} subtitle="Módulo em desenvolvimento" />
      <div className="card p-6">
        <span className="badge bg-amber-100 text-amber-700">em breve</span>
        <p className="mt-3 text-muted">{descricao}</p>
        <ul className="mt-4 list-inside list-disc space-y-1 text-sm">
          {itens.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
