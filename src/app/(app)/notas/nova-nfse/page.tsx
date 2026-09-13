import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { NotaForm } from "../NotaForm";
import { createNfse } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovaNfsePage() {
  const { db } = await requireDb();
  const [servicos, parceiros] = await Promise.all([
    db.service.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.partner.findMany({
      where: { ativo: true, tipo: { in: ["CLIENTE", "AMBOS"] } },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Emitir NFS-e (serviço)"
        subtitle="Nota fiscal de serviço eletrônica"
      />
      <NotaForm
        kind="NFSE"
        action={createNfse}
        partners={parceiros.map((p) => ({ id: p.id, nome: p.nome }))}
        catalog={servicos.map((s) => ({
          id: s.id,
          label: `${s.codigo} · ${s.nome}`,
          preco: s.preco,
          descricao: s.nome,
          itemListaServico: s.itemListaServico,
          aliquotaIss: s.aliquotaIss,
        }))}
      />
    </div>
  );
}
