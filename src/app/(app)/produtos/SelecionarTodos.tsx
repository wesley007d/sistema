"use client";

/** Caixa no cabeçalho da lista que marca/desmarca todos os produtos. */
export function SelecionarTodos({ form }: { form: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Selecionar todos"
      onChange={(e) => {
        const f = document.getElementById(form) as HTMLFormElement | null;
        f?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((c) => {
          c.checked = e.currentTarget.checked;
        });
      }}
    />
  );
}
