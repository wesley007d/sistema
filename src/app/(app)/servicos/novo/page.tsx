import { PageHeader } from "@/components/PageHeader";
import { CatalogoTabs } from "@/components/CatalogoTabs";
import { ServiceForm } from "../ServiceForm";
import { createService } from "../actions";

export default function NovoServicoPage() {
  return (
    <div>
      <CatalogoTabs />
      <PageHeader
        title="Novo serviço"
        subtitle="Mão de obra / serviço — o preço aqui é só o padrão, dá para mudar na venda"
      />
      <ServiceForm action={createService} />
    </div>
  );
}
