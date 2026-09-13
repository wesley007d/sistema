import Link from "next/link";
import type { Product } from "@prisma/client";
import { Field, SelectField } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { PasswordInput } from "@/components/PasswordInput";
import { BuscarFotoGoogle } from "./BuscarFotoGoogle";
import { PrecoCalculator } from "./PrecoCalculator";

export function ProductForm({
  action,
  product,
  categorias,
  categoriaAtual,
  isAdmin = true,
}: {
  action: (formData: FormData) => void;
  product?: Product;
  categorias: string[];
  categoriaAtual?: string | null;
  isAdmin?: boolean;
}) {
  const isEdit = !!product;
  // Editar o cadastro de um produto existente é só do administrador geral.
  const somenteLeitura = isEdit && !isAdmin;
  return (
    <form action={action} className="space-y-6">
      {somenteLeitura && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Você pode consultar e movimentar o estoque deste produto, mas o
          <b> cadastro só é alterado pelo administrador geral</b>.
        </div>
      )}
      <fieldset
        disabled={somenteLeitura}
        className="m-0 space-y-6 border-0 p-0 disabled:opacity-70"
      >
      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Dados gerais</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-4 sm:col-span-2 lg:col-span-3">
            {product?.imagemUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imagemUrl}
                alt={product.nome}
                className="size-24 shrink-0 rounded-lg border border-border object-cover"
              />
            )}
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-medium">Foto do produto</label>
              <input type="file" name="imagem" accept="image/*" className="input" />
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  name="imagemUrlExterna"
                  placeholder="ou cole a URL de uma imagem da internet"
                  className="input flex-1"
                />
                <BuscarFotoGoogle />
              </div>
              <p className="text-xs text-muted">
                Envie um arquivo ou cole o link de uma foto (ex.: achada no Google
                Imagens — clique com o botão direito na foto e “Copiar endereço da
                imagem”). Se enviar um arquivo, ele tem prioridade sobre o link.
              </p>
              {product?.imagemUrl && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input type="checkbox" name="removerImagem" value="on" className="size-3.5" />
                  Remover foto atual
                </label>
              )}
            </div>
          </div>
          <Field
            label="Código / SKU"
            name="sku"
            defaultValue={product?.sku}
            placeholder={isEdit ? undefined : "gerado automático"}
            hint={isEdit ? undefined : "deixe em branco para gerar (P0001, P0002…)"}
          />
          <Field
            label="Código de barras (GTIN)"
            name="codigoBarras"
            defaultValue={product?.codigoBarras}
          />
          <Field label="Marca" name="marca" defaultValue={product?.marca} />
          <Field
            label="Nome"
            name="nome"
            required
            defaultValue={product?.nome}
            className="sm:col-span-2"
          />
          <Field
            label="Categoria"
            name="categoria"
            defaultValue={categoriaAtual}
            hint="Digite uma nova ou escolha existente"
          >
            <input
              name="categoria"
              list="categorias"
              defaultValue={categoriaAtual ?? ""}
              className="input"
            />
            <datalist id="categorias">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field
            label="Descrição"
            name="descricao"
            defaultValue={product?.descricao}
            className="sm:col-span-2 lg:col-span-3"
          >
            <textarea
              name="descricao"
              rows={2}
              defaultValue={product?.descricao ?? ""}
              className="input"
            />
          </Field>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Preços e estoque</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Unidade"
            name="unidade"
            defaultValue={product?.unidade ?? "UN"}
            options={["UN", "PC", "PAR", "JG", "KIT", "L", "KG", "M"].map((u) => ({
              value: u,
              label: u,
            }))}
          />
          <PrecoCalculator
            custo={product?.precoCusto}
            venda={product?.precoVenda}
            readOnly={somenteLeitura}
          />
          <Field
            label="Estoque mínimo"
            name="estoqueMinimo"
            type="number"
            step="0.001"
            defaultValue={product?.estoqueMinimo || undefined}
            placeholder="0"
          />
          {!isEdit && (
            <Field
              label="Estoque inicial"
              name="estoqueInicial"
              type="number"
              step="0.001"
              placeholder="0"
            />
          )}
          <Field
            label="Localização (prateleira)"
            name="localizacao"
            defaultValue={product?.localizacao}
          />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">Dados fiscais</h2>
        <p className="mb-4 text-xs text-muted">
          Usados na emissão de NF-e. Padrões do Simples Nacional já preenchidos.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="NCM" name="ncm" defaultValue={product?.ncm ?? "87141000"} />
          <Field label="CEST" name="cest" defaultValue={product?.cest} />
          <Field label="CFOP venda" name="cfopVenda" defaultValue={product?.cfopVenda ?? "5102"} />
          <SelectField
            label="Origem"
            name="origem"
            defaultValue={product?.origem ?? "0"}
            options={[
              { value: "0", label: "0 - Nacional" },
              { value: "1", label: "1 - Estrangeira (importação direta)" },
              { value: "2", label: "2 - Estrangeira (mercado interno)" },
            ]}
          />
          <Field
            label="CSOSN / CST ICMS"
            name="icmsCst"
            defaultValue={product?.icmsCst ?? "102"}
          />
          <Field
            label="Alíquota ICMS (%)"
            name="aliquotaIcms"
            type="number"
            step="0.01"
            defaultValue={product?.aliquotaIcms ?? 0}
          />
        </div>
      </section>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={product ? product.ativo : true}
          className="size-4"
        />
        Produto ativo
      </label>
      </fieldset>

      {!isEdit && !isAdmin && (
        <section className="card border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">
            Autorização do administrador
          </h2>
          <p className="mb-3 mt-1 text-sm text-amber-800">
            Cadastrar um produto novo precisa de um administrador liberando na
            hora. Peça para ele digitar e-mail e senha:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="adminEmail">
                E-mail do administrador
              </label>
              <input
                id="adminEmail"
                name="adminEmail"
                type="email"
                autoComplete="off"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="adminSenha">
                Senha do administrador
              </label>
              <PasswordInput
                id="adminSenha"
                name="adminSenha"
                autoComplete="off"
              />
            </div>
          </div>
        </section>
      )}

      <div className="flex gap-3">
        {!somenteLeitura && (
          <SubmitButton>
            {isEdit ? "Salvar alterações" : "Cadastrar produto"}
          </SubmitButton>
        )}
        <Link href="/produtos" className="btn-ghost">
          {somenteLeitura ? "Voltar" : "Cancelar"}
        </Link>
      </div>
    </form>
  );
}
