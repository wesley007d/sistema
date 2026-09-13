import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { dateTime } from "@/lib/format";
import { MODULES, permissionsOf, requireDbAdmin } from "@/lib/auth";
import { createUser, deleteUser, resetPassword, updateUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const { user: me, db } = await requireDbAdmin();
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <PageHeader
        title="Usuários e permissões"
        subtitle="O administrador define quais módulos cada funcionário pode acessar."
      />
      <p className="mb-6 text-sm">
        <Link href="/configuracoes" className="text-primary">
          ← voltar para Configurações
        </Link>
      </p>

      <section className="card mb-8 p-5">
        <h2 className="mb-4 font-semibold">Novo usuário</h2>
        <form action={createUser} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Nome</label>
              <input name="nome" required className="input" />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input name="email" type="email" required className="input" />
            </div>
            <div>
              <label className="label">Senha inicial</label>
              <input name="senha" type="text" required className="input" />
            </div>
            <div>
              <label className="label">Perfil</label>
              <select name="role" className="input" defaultValue="FUNCIONARIO">
                <option value="FUNCIONARIO">Funcionário</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <div>
            <p className="label">Módulos liberados (para funcionário)</p>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {MODULES.filter((m) => m.key !== "dashboard").map((m) => (
                <label key={m.key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="perm" value={m.key} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          <SubmitButton>Criar usuário</SubmitButton>
        </form>
      </section>

      <div className="space-y-4">
        {users.map((u) => {
          const perms = new Set(permissionsOf(u));
          const isMe = u.id === me.id;
          return (
            <section key={u.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    {u.nome}{" "}
                    {isMe && (
                      <span className="badge bg-blue-100 text-blue-700">você</span>
                    )}
                    {!u.ativo && (
                      <span className="badge bg-red-100 text-red-700">inativo</span>
                    )}
                  </h3>
                  <p className="text-xs text-muted">
                    {u.email} · {u.role === "ADMIN" ? "Administrador" : "Funcionário"} ·
                    último acesso {u.ultimoLogin ? dateTime(u.ultimoLogin) : "nunca"}
                  </p>
                </div>
              </div>

              <form
                action={updateUser.bind(null, u.id)}
                className="space-y-3 border-t border-border pt-3"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label">Nome</label>
                    <input name="nome" defaultValue={u.nome} className="input" />
                  </div>
                  <div>
                    <label className="label">Perfil</label>
                    <select name="role" defaultValue={u.role} className="input">
                      <option value="FUNCIONARIO">Funcionário</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                  <label className="mt-6 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="ativo"
                      defaultChecked={u.ativo}
                      className="size-4"
                    />
                    Usuário ativo
                  </label>
                </div>

                <div>
                  <p className="label">Módulos liberados</p>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {MODULES.filter((m) => m.key !== "dashboard").map((m) => (
                      <label
                        key={m.key}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="perm"
                          value={m.key}
                          defaultChecked={u.role === "ADMIN" || perms.has(m.key)}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Administradores têm acesso a tudo automaticamente.
                  </p>
                </div>

                <SubmitButton className="btn-ghost">Salvar alterações</SubmitButton>
              </form>

              <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3">
                <form
                  action={resetPassword.bind(null, u.id)}
                  className="flex items-end gap-2"
                >
                  <div>
                    <label className="label">Redefinir senha</label>
                    <input
                      name="senha"
                      type="text"
                      placeholder="nova senha"
                      className="input"
                    />
                  </div>
                  <SubmitButton className="btn-ghost">Aplicar</SubmitButton>
                </form>
                {!isMe && (
                  <form action={deleteUser.bind(null, u.id)}>
                    <ConfirmButton message={`Excluir o usuário ${u.nome}?`}>
                      Excluir
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
