import Link from "next/link";
import type { Service } from "@prisma/client";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";

export function ServiceForm({
  action,
  service,
}: {
  action: (formData: FormData) => void;
  service?: Service;
}) {
  return (
    <form action={action} className="space-y-6">
      <section className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Código" name="codigo" required defaultValue={service?.codigo} />
          <Field
            label="Nome do serviço"
            name="nome"
            required
            defaultValue={service?.nome}
            className="sm:col-span-2"
          />
          <Field
            label="Preço padrão"
            name="preco"
            type="number"
            step="0.01"
            defaultValue={service?.preco ?? 0}
          />
          <Field
            label="Item lista de serviço (LC 116)"
            name="itemListaServico"
            defaultValue={service?.itemListaServico ?? "14.01"}
            hint="Ex.: 14.01 - manutenção de veículos"
          />
          <Field
            label="Cód. tributação município"
            name="codTributacaoMunicipio"
            defaultValue={service?.codTributacaoMunicipio}
          />
          <Field
            label="Alíquota ISS (%)"
            name="aliquotaIss"
            type="number"
            step="0.01"
            defaultValue={service?.aliquotaIss ?? 3}
          />
          <Field
            label="Descrição"
            name="descricao"
            defaultValue={service?.descricao}
            className="sm:col-span-2 lg:col-span-3"
          >
            <textarea
              name="descricao"
              rows={2}
              defaultValue={service?.descricao ?? ""}
              className="input"
            />
          </Field>
        </div>
        <div className="mt-4 flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="issRetido"
              defaultChecked={service?.issRetido ?? false}
              className="size-4"
            />
            ISS retido pelo tomador
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={service ? service.ativo : true}
              className="size-4"
            />
            Ativo
          </label>
        </div>
      </section>

      <div className="flex gap-3">
        <SubmitButton>{service ? "Salvar" : "Cadastrar"}</SubmitButton>
        <Link href="/servicos" className="btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
