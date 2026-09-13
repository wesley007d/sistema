import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { DadosForm, SenhaForm } from "./PerfilForms";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireUser();

  return (
    <div>
      <PageHeader
        title="Meu perfil"
        subtitle="Ajuste seus dados de acesso ao sistema."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Meus dados</h2>
          <DadosForm nome={user.nome} email={user.email} />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Trocar senha</h2>
          <SenhaForm />
        </section>
      </div>

      <p className="mt-6 text-xs text-muted">
        Perfil: {user.role === "ADMIN" ? "Administrador" : "Funcionário"} · último
        acesso {user.ultimoLogin ? dateTime(user.ultimoLogin) : "agora"}
      </p>
    </div>
  );
}
