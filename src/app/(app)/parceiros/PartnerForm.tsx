import Link from "next/link";
import type { Partner } from "@prisma/client";
import { Field, SelectField } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function PartnerForm({
  action,
  partner,
}: {
  action: (formData: FormData) => void;
  partner?: Partner;
}) {
  const isEdit = !!partner;
  return (
    <form action={action} className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Identificação</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Tipo"
            name="tipo"
            defaultValue={partner?.tipo ?? "CLIENTE"}
            options={[
              { value: "CLIENTE", label: "Cliente" },
              { value: "FORNECEDOR", label: "Fornecedor" },
              { value: "AMBOS", label: "Cliente e Fornecedor" },
            ]}
          />
          <SelectField
            label="Pessoa"
            name="pessoa"
            defaultValue={partner?.pessoa ?? "FISICA"}
            options={[
              { value: "FISICA", label: "Física" },
              { value: "JURIDICA", label: "Jurídica" },
            ]}
          />
          <Field
            label="Nome / Razão social"
            name="nome"
            required
            defaultValue={partner?.nome}
            className="sm:col-span-2"
          />
          <Field
            label="Nome fantasia"
            name="nomeFantasia"
            defaultValue={partner?.nomeFantasia}
            className="sm:col-span-2"
          />
          <Field label="CPF / CNPJ" name="cpfCnpj" defaultValue={partner?.cpfCnpj} />
          <Field label="RG / IE" name="rgIe" defaultValue={partner?.rgIe} />
          <Field label="Inscrição municipal" name="im" defaultValue={partner?.im} />
          <SelectField
            label="Indicador IE"
            name="indicadorIe"
            defaultValue={partner?.indicadorIe ?? "9"}
            options={[
              { value: "9", label: "9 - Não contribuinte" },
              { value: "1", label: "1 - Contribuinte ICMS" },
              { value: "2", label: "2 - Contribuinte isento" },
            ]}
          />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Contato</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="E-mail" name="email" type="email" defaultValue={partner?.email} />
          <Field label="Telefone" name="telefone" defaultValue={partner?.telefone} />
          <Field label="Celular" name="celular" defaultValue={partner?.celular} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Endereço</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="CEP" name="cep" defaultValue={partner?.cep} />
          <Field
            label="Logradouro"
            name="logradouro"
            defaultValue={partner?.logradouro}
            className="sm:col-span-2"
          />
          <Field label="Número" name="numero" defaultValue={partner?.numero} />
          <Field label="Complemento" name="complemento" defaultValue={partner?.complemento} />
          <Field label="Bairro" name="bairro" defaultValue={partner?.bairro} />
          <Field label="Município" name="municipio" defaultValue={partner?.municipio} />
          <SelectField
            label="UF"
            name="uf"
            defaultValue={partner?.uf ?? "SP"}
            options={UFS.map((u) => ({ value: u, label: u }))}
          />
          <Field
            label="Cód. IBGE município"
            name="codMunicipio"
            defaultValue={partner?.codMunicipio}
            hint="7 dígitos (usado na NF-e)"
          />
        </div>
      </section>

      <Field label="Observações" name="observacoes" defaultValue={partner?.observacoes}>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={partner?.observacoes ?? ""}
          className="input"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={partner ? partner.ativo : true}
          className="size-4"
        />
        Ativo
      </label>

      <div className="flex gap-3">
        <SubmitButton>{isEdit ? "Salvar" : "Cadastrar"}</SubmitButton>
        <Link href="/parceiros" className="btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
