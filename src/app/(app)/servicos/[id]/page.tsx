import { notFound } from "next/navigation";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ServiceForm } from "../ServiceForm";
import { deleteService, updateService } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditarServicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireDb();
  const { id } = await params;
  const service = await db.service.findUnique({ where: { id } });
  if (!service) notFound();

  return (
    <div>
      <PageHeader
        title={service.nome}
        subtitle="Editar serviço"
        action={
          <form action={deleteService.bind(null, id)}>
            <ConfirmButton message="Excluir este serviço? (se já usado, será inativado)">
              Excluir
            </ConfirmButton>
          </form>
        }
      />
      <ServiceForm action={updateService.bind(null, id)} service={service} />
    </div>
  );
}
