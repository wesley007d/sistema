import { PageHeader } from "@/components/PageHeader";
import { PartnerForm } from "../PartnerForm";
import { createPartner } from "../actions";

export default function NovoParceiroPage() {
  return (
    <div>
      <PageHeader title="Novo cadastro" subtitle="Cliente ou fornecedor" />
      <PartnerForm action={createPartner} />
    </div>
  );
}
