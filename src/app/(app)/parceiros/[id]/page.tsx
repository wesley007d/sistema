import { notFound } from "next/navigation";
import { requireDb } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PartnerForm } from "../PartnerForm";
import { deletePartner, updatePartner } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditarParceiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireDb();
  const { id } = await params;
  const partner = await db.partner.findUnique({ where: { id } });
  if (!partner) notFound();

  return (
    <div>
      <PageHeader
        title={partner.nome}
        subtitle="Editar cadastro"
        action={
          <form action={deletePartner.bind(null, id)}>
            <ConfirmButton message="Excluir este cadastro? (se já usado, será inativado)">
              Excluir
            </ConfirmButton>
          </form>
        }
      />
      <PartnerForm action={updatePartner.bind(null, id)} partner={partner} />
    </div>
  );
}
