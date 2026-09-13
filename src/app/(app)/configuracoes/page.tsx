import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireDb, requireDbAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Field, SelectField } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { bool, optStr, parseNumber, str } from "@/lib/format";
import { normalizarHex } from "@/lib/cor";
import { apagarLogo, salvarLogoUpload } from "@/lib/upload-logo";

export const dynamic = "force-dynamic";

async function salvarAparencia(formData: FormData) {
  "use server";
  const { user, db } = await requireDbAdmin();
  const atual = await db.company.findUniqueOrThrow({
    where: { id: user.companyId },
    select: { logoUrl: true },
  });

  let logoUrl: string | null | undefined = undefined;
  if (bool(formData.get("removerLogo"))) {
    logoUrl = null;
  } else {
    const nova = await salvarLogoUpload(db, user.companyId, formData.get("logo"));
    if (nova) logoUrl = nova;
  }

  const usarPadrao = bool(formData.get("corPadrao"));
  const corPrimaria = usarPadrao
    ? null
    : normalizarHex(str(formData.get("corPrimaria")));
  const tema = str(formData.get("tema")) === "escuro" ? "escuro" : null;
  const menuColorido = bool(formData.get("menuColorido"));

  await db.company.update({
    where: { id: user.companyId },
    data: {
      corPrimaria,
      tema,
      menuColorido,
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    },
  });
  if (logoUrl !== undefined && atual.logoUrl && atual.logoUrl !== logoUrl) {
    await apagarLogo(db, atual.logoUrl);
  }
  revalidatePath("/", "layout");
  revalidatePath("/configuracoes");
}

async function saveCompany(formData: FormData) {
  "use server";
  const { user, db } = await requireDbAdmin();
  const data = {
    razaoSocial: str(formData.get("razaoSocial")),
    nomeFantasia: optStr(formData.get("nomeFantasia")),
    cnpj: str(formData.get("cnpj")),
    ie: optStr(formData.get("ie")),
    im: optStr(formData.get("im")),
    regimeTributario: str(formData.get("regimeTributario")) || "SIMPLES",
    crt: Number(str(formData.get("crt")) || "1"),
    email: optStr(formData.get("email")),
    telefone: optStr(formData.get("telefone")),
    cep: optStr(formData.get("cep")),
    logradouro: optStr(formData.get("logradouro")),
    numero: optStr(formData.get("numero")),
    complemento: optStr(formData.get("complemento")),
    bairro: optStr(formData.get("bairro")),
    municipio: optStr(formData.get("municipio")),
    uf: optStr(formData.get("uf")),
    codMunicipio: optStr(formData.get("codMunicipio")),
    ambienteFiscal: str(formData.get("ambienteFiscal")) || "HOMOLOGACAO",
    serieNFe: Number(str(formData.get("serieNFe")) || "1"),
    serieNFSe: Number(str(formData.get("serieNFSe")) || "1"),
    aliquotaSimples: parseNumber(formData.get("aliquotaSimples")),
  };
  await db.company.update({ where: { id: user.companyId }, data });
  revalidatePath("/configuracoes");
}

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export default async function ConfiguracoesPage() {
  const { user: me, db } = await requireDb();
  const c = await db.company.findUniqueOrThrow({ where: { id: me.companyId } });
  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Dados da empresa emitente (usados nas notas fiscais)"
      />

      {me?.role === "ADMIN" && (
        <Link
          href="/configuracoes/usuarios"
          className="card mb-6 flex items-center justify-between p-4 hover:border-primary"
        >
          <div>
            <p className="font-medium">Usuários e permissões</p>
            <p className="text-sm text-muted">
              Cadastre funcionários e escolha quais módulos cada um acessa.
            </p>
          </div>
          <span className="text-primary">→</span>
        </Link>
      )}

      {me?.role === "ADMIN" && (
        <form action={salvarAparencia} className="card mb-6 p-5">
          <h2 className="mb-1 font-semibold">Aparência da sua empresa</h2>
          <p className="mb-4 text-sm text-muted">
            A logo e a cor valem para todo o sistema (menu, botões, cupom) — só
            para a sua empresa.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="label">Logo</label>
              <div className="mb-3 flex h-28 w-full max-w-xs items-center justify-center overflow-hidden rounded-lg border border-border bg-surface p-3">
                {c.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.logoUrl}
                    alt="Logo atual"
                    className="max-h-full w-auto max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-muted">
                    nenhuma logo — usando a marca do sistema
                  </span>
                )}
              </div>
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="text-sm"
              />
              {c.logoUrl && (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" name="removerLogo" className="size-4" />
                  Remover a logo atual
                </label>
              )}
              <p className="mt-1 text-xs text-muted">
                PNG, JPG, WEBP ou SVG, até 4 MB. Use uma imagem grande e com fundo
                transparente — ela aparece grande no menu e no cupom.
              </p>
            </div>

            <div>
              <label className="label">Cor principal</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="corPrimaria"
                  defaultValue={normalizarHex(c.corPrimaria) ?? "#1f6feb"}
                  className="h-10 w-16 cursor-pointer rounded border border-border bg-surface"
                />
                <span className="text-sm text-muted">
                  {normalizarHex(c.corPrimaria) ?? "padrão (#1f6feb)"}
                </span>
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="corPadrao"
                  className="size-4"
                  defaultChecked={!normalizarHex(c.corPrimaria)}
                />
                Usar a cor padrão do sistema
              </label>
              <p className="mt-1 text-xs text-muted">
                Aparece nos botões, no item ativo do menu e nos destaques.
              </p>
            </div>

            <div>
              <label className="label">Tema</label>
              <div className="flex gap-4">
                {[
                  { v: "claro", nome: "Claro", sw: "#f6f7f9" },
                  { v: "escuro", nome: "Escuro", sw: "#171d2c" },
                ].map((op) => (
                  <label
                    key={op.v}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="tema"
                      value={op.v}
                      defaultChecked={(c.tema ?? "claro") === op.v}
                    />
                    <span
                      className="inline-block size-4 rounded border border-border"
                      style={{ background: op.sw }}
                    />
                    {op.nome}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">
                O tema escuro troca o fundo e as cores do sistema inteiro.
              </p>
            </div>

            <div>
              <label className="label">Menu lateral</label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="menuColorido"
                  className="size-4"
                  defaultChecked={c.menuColorido}
                />
                Menu colorido (barra lateral com a cor principal)
              </label>
              <p className="mt-1 text-xs text-muted">
                Deixa o menu com a cara da sua marca, em vez do fundo branco.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <SubmitButton>Salvar aparência</SubmitButton>
          </div>
          <p className="mt-2 text-xs text-muted">
            As mudanças aparecem ao recarregar a página.
          </p>
        </form>
      )}

      <form action={saveCompany} className="space-y-6">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Empresa</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Razão social" name="razaoSocial" required defaultValue={c.razaoSocial} className="sm:col-span-2" />
            <Field label="Nome fantasia" name="nomeFantasia" defaultValue={c.nomeFantasia} />
            <Field label="CNPJ" name="cnpj" defaultValue={c.cnpj} />
            <Field label="Inscrição estadual" name="ie" defaultValue={c.ie} />
            <Field label="Inscrição municipal" name="im" defaultValue={c.im} hint="Obrigatória p/ NFS-e" />
            <SelectField
              label="Regime tributário"
              name="regimeTributario"
              defaultValue={c.regimeTributario}
              options={[
                { value: "SIMPLES", label: "Simples Nacional" },
                { value: "PRESUMIDO", label: "Lucro Presumido" },
                { value: "REAL", label: "Lucro Real" },
              ]}
            />
            <SelectField
              label="CRT"
              name="crt"
              defaultValue={String(c.crt)}
              options={[
                { value: "1", label: "1 - Simples Nacional" },
                { value: "2", label: "2 - Simples (excesso sublimite)" },
                { value: "3", label: "3 - Regime normal" },
              ]}
            />
            <Field label="Alíquota Simples (%)" name="aliquotaSimples" type="number" step="0.01" defaultValue={c.aliquotaSimples} />
            <Field label="E-mail" name="email" type="email" defaultValue={c.email} />
            <Field label="Telefone" name="telefone" defaultValue={c.telefone} />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Endereço</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="CEP" name="cep" defaultValue={c.cep} />
            <Field label="Logradouro" name="logradouro" defaultValue={c.logradouro} className="sm:col-span-2" />
            <Field label="Número" name="numero" defaultValue={c.numero} />
            <Field label="Complemento" name="complemento" defaultValue={c.complemento} />
            <Field label="Bairro" name="bairro" defaultValue={c.bairro} />
            <Field label="Município" name="municipio" defaultValue={c.municipio} />
            <SelectField label="UF" name="uf" defaultValue={c.uf ?? "SP"} options={UFS.map((u) => ({ value: u, label: u }))} />
            <Field label="Cód. IBGE município" name="codMunicipio" defaultValue={c.codMunicipio} hint="7 dígitos" />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Fiscal</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="Ambiente"
              name="ambienteFiscal"
              defaultValue={c.ambienteFiscal}
              options={[
                { value: "HOMOLOGACAO", label: "Homologação (teste)" },
                { value: "PRODUCAO", label: "Produção" },
              ]}
            />
            <Field label="Série NF-e" name="serieNFe" type="number" defaultValue={c.serieNFe} />
            <Field label="Série NFS-e" name="serieNFSe" type="number" defaultValue={c.serieNFSe} />
          </div>
          <p className="mt-3 text-xs text-muted">
            Provedor de emissão: <b>{process.env.FISCAL_PROVIDER ?? "local"}</b>. O
            provedor <b>local</b> gera o XML e simula a autorização sem transmitir à
            SEFAZ/prefeitura. Para emissão real, configure{" "}
            <code>FISCAL_PROVIDER=plugnotas</code> e o token no arquivo{" "}
            <code>.env</code>.
          </p>
        </section>

        <SubmitButton>Salvar configurações</SubmitButton>
      </form>
    </div>
  );
}
