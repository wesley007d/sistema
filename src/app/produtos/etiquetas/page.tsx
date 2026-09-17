import { notFound } from "next/navigation";
import { requireDb } from "@/lib/auth";
import { money } from "@/lib/format";
import { Barcode } from "@/components/Barcode";
import { PrintTrigger } from "./PrintTrigger";

export const dynamic = "force-dynamic";

export default async function EtiquetasPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; qtd?: string; print?: string }>;
}) {
  const { db } = await requireDb();
  const { ids: idsParam, qtd: qtdParam, print } = await searchParams;
  const ids = (idsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) notFound();

  const qtd = Math.max(1, Math.min(100, Number(qtdParam) || 1));

  const produtos = await db.product.findMany({ where: { id: { in: ids } } });
  if (produtos.length === 0) notFound();
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const etiquetas = ids
    .filter((id) => porId.has(id))
    .flatMap((id) => Array.from({ length: qtd }, () => porId.get(id)!));

  return (
    <div className="bg-white p-4 text-black">
      {print === "1" && <PrintTrigger />}
      <p className="mb-3 text-xs text-gray-500 print:hidden">
        Ctrl+P para imprimir · {etiquetas.length} etiqueta(s)
      </p>
      <div className="grid grid-cols-3 gap-2 print:grid-cols-3">
        {etiquetas.map((p, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center gap-0.5 rounded border border-dashed border-gray-400 px-2 py-2 text-center"
            style={{ breakInside: "avoid" }}
          >
            <p className="line-clamp-2 w-full text-[10px] font-semibold leading-tight">
              {p.nome}
            </p>
            <Barcode value={p.codigoBarras || p.sku} height={34} width={1.4} fontSize={10} />
            <p className="text-sm font-bold">{money(p.precoVenda)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
