"use client";

export function BuscarFotoGoogle() {
  function abrir() {
    const val = (name: string) =>
      (document.querySelector(`input[name="${name}"]`) as HTMLInputElement | null)?.value ?? "";
    const termo = [val("marca"), val("nome"), val("sku")].filter(Boolean).join(" ").trim();
    if (!termo) {
      alert("Preencha nome, marca ou SKU do produto primeiro.");
      return;
    }
    window.open(
      `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(termo)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <button type="button" onClick={abrir} className="btn-ghost text-xs">
      🔍 Buscar no Google Imagens
    </button>
  );
}
