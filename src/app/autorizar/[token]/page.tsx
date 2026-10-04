import { Logo } from "@/components/Logo";
import { prisma } from "@/lib/db";
import { lerPedido } from "@/lib/autorizacao-remota";
import { AprovarForm } from "./AprovarForm";

export const dynamic = "force-dynamic";

/** Página que o administrador abre pelo link do WhatsApp (não precisa estar logado). */
export default async function AutorizarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pedido = lerPedido(token);
  const empresa = pedido
    ? await prisma.company.findUnique({
        where: { id: pedido.c },
        select: { nomeFantasia: true, razaoSocial: true },
      })
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <Logo size="lg" className="mb-8 flex justify-center" />
        <div className="rounded-xl border border-border bg-surface p-7 shadow-sm">
          {!pedido || !empresa ? (
            <>
              <h1 className="text-xl font-semibold">Pedido expirado</h1>
              <p className="mt-2 text-sm text-muted">
                Este link vale por 30 minutos. Peça para enviarem um novo pelo sistema.
              </p>
            </>
          ) : (
            <>
              <span className="badge bg-amber-100 text-amber-800">Pedido de autorização</span>
              <h1 className="mt-3 text-lg font-semibold">{pedido.d}</h1>
              <dl className="mt-3 space-y-1 text-sm text-muted">
                <div className="flex justify-between gap-4">
                  <dt>Loja</dt>
                  <dd className="text-right font-medium text-foreground">
                    {empresa.nomeFantasia || empresa.razaoSocial}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Pedido por</dt>
                  <dd className="text-right font-medium text-foreground">{pedido.r}</dd>
                </div>
              </dl>
              <AprovarForm token={token} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
