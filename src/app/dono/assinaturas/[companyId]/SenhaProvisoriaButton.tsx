"use client";

import { useActionState } from "react";
import { gerarSenhaProvisoria } from "../../actions";

type State = { senha?: string; erro?: string } | undefined;

export function SenhaProvisoriaButton({ userId, email }: { userId: string; email: string }) {
  const [state, formAction, pending] = useActionState<State>(
    gerarSenhaProvisoria.bind(null, userId),
    undefined,
  );

  if (state?.senha)
    return (
      <div className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">
        <div>
          Login: <span className="font-mono font-semibold">{email}</span>
        </div>
        <div>
          Senha provisória:{" "}
          <span className="font-mono text-sm font-semibold select-all">{state.senha}</span>
        </div>
        <div className="mt-1 text-green-700">
          Anote agora — ela não aparece de novo. No 1º acesso o sistema pede uma senha nova.
        </div>
      </div>
    );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `Gerar uma senha provisória para ${email}? A senha atual deixa de funcionar e a pessoa é desconectada.`,
          )
        )
          e.preventDefault();
      }}
    >
      <button type="submit" className="btn-ghost text-xs text-primary" disabled={pending}>
        {pending ? "Gerando…" : "Gerar senha provisória"}
      </button>
      {state?.erro && <p className="mt-1 text-xs text-red-600">{state.erro}</p>}
    </form>
  );
}
