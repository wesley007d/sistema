import Link from "next/link";

export default function AcessoNegadoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">Acesso negado</h1>
      <p className="text-muted">
        Seu usuário não tem permissão para acessar esta área. Fale com o
        administrador.
      </p>
      <Link href="/" className="btn-primary mt-2">
        Voltar ao início
      </Link>
    </div>
  );
}
