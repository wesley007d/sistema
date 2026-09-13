import Link from "next/link";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { createServiceOrder } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovaOSPage() {
  const { db } = await requireDb();
  const clientes = await db.partner.findMany({
    where: { ativo: true, tipo: { in: ["CLIENTE", "AMBOS"] } },
    orderBy: { nome: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Nova Ordem de Serviço"
        subtitle="Abra a OS; itens, veículo e diagnóstico são preenchidos na tela seguinte."
      />
      <form action={createServiceOrder} className="space-y-6">
        <section className="card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Cliente</label>
              <select name="partnerId" className="input" defaultValue="">
                <option value="">— Selecionar depois —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Técnico responsável" name="tecnico" />
            <Field label="KM de entrada" name="kmEntrada" type="number" />
            <Field
              label="Previsão de entrega"
              name="previsaoEntrega"
              type="datetime-local"
            />
            <Field
              label="Problema relatado pelo cliente"
              name="descricaoProblema"
              className="sm:col-span-2"
            >
              <textarea name="descricaoProblema" rows={3} className="input" />
            </Field>
          </div>
        </section>
        <div className="flex gap-3">
          <SubmitButton>Abrir OS</SubmitButton>
          <Link href="/ordens-servico" className="btn-ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
