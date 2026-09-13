import { redirect } from "next/navigation";
import { getCurrentUser, isOwner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logout } from "@/app/login/actions";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { CopyButton } from "@/components/CopyButton";
import { PixAguardando } from "@/components/PixAguardando";
import { date, money } from "@/lib/format";
import { rotuloStatusAssinatura, situacaoAssinatura } from "@/lib/assinatura";
import { gerarCobrancaPix } from "./actions";

export const dynamic = "force-dynamic";

const VALIDADE_MS = 30 * 60_000;

export default async function AssinaturaBloqueadaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isOwner(user)) redirect("/dono");

  const empresa = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: {
      nomeFantasia: true,
      razaoSocial: true,
      email: true,
      assinaturaStatus: true,
      assinaturaVence: true,
    },
  });

  const s = situacaoAssinatura({
    assinaturaStatus: empresa?.assinaturaStatus,
    assinaturaVence: empresa?.assinaturaVence,
  });
  if (!s.bloqueada) redirect("/");

  const contato = process.env.SUPORTE_CONTATO?.trim();
  const ehAdmin = user.role === "ADMIN";
  const nomeEmpresa = empresa?.nomeFantasia || empresa?.razaoSocial || "sua loja";

  const pixHabilitado = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
  const cobrancaPendente =
    ehAdmin && pixHabilitado
      ? await prisma.cobrancaPix.findFirst({
          where: { companyId: user.companyId, status: "PENDENTE" },
          orderBy: { createdAt: "desc" },
        })
      : null;
  const agoraMs = new Date().getTime();
  const cobrancaValida =
    cobrancaPendente && agoraMs - cobrancaPendente.createdAt.getTime() < VALIDADE_MS
      ? cobrancaPendente
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Logo size="lg" className="mb-8 flex justify-center" />

        <div className="rounded-xl border border-border bg-surface p-7 shadow-sm">
          <span className="badge bg-red-100 text-red-700">Acesso suspenso</span>
          <h1 className="mt-3 text-xl font-semibold">
            A assinatura de {nomeEmpresa} está{" "}
            {s.status === "CANCELADA" ? "cancelada" : "em atraso"}.
          </h1>

          <dl className="mt-4 space-y-1 text-sm text-muted">
            <div className="flex justify-between gap-4">
              <dt>Situação</dt>
              <dd className="font-medium text-foreground">
                {rotuloStatusAssinatura(s.status)}
              </dd>
            </div>
            {s.vence && (
              <div className="flex justify-between gap-4">
                <dt>Venceu em</dt>
                <dd className="font-medium text-foreground">{date(s.vence)}</dd>
              </div>
            )}
          </dl>

          <p className="mt-4 text-sm">
            {ehAdmin
              ? "Regularize o pagamento com o fornecedor do sistema para reativar o acesso de toda a equipe."
              : "Avise o responsável pela loja: o pagamento do sistema precisa ser regularizado."}
          </p>

          {contato && (
            <p className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-sm">
              <span className="text-muted">Contato do fornecedor:</span>{" "}
              <span className="font-medium">{contato}</span>
            </p>
          )}

          {ehAdmin && pixHabilitado && (
            <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
              {cobrancaValida ? (
                <div>
                  <p className="text-sm font-medium">
                    Pague {money(cobrancaValida.valor)} via Pix
                  </p>
                  {cobrancaValida.qrCodeBase64 && (
                    <img
                      src={`data:image/png;base64,${cobrancaValida.qrCodeBase64}`}
                      alt="QR Code Pix"
                      className="mx-auto mt-3 h-44 w-44"
                    />
                  )}
                  {cobrancaValida.qrCode && (
                    <div className="mt-3">
                      <input
                        readOnly
                        value={cobrancaValida.qrCode}
                        onFocus={(e) => e.currentTarget.select()}
                        className="input text-xs"
                      />
                      <CopyButton texto={cobrancaValida.qrCode} className="btn-ghost mt-2 w-full text-sm" />
                    </div>
                  )}
                  <PixAguardando cobrancaId={cobrancaValida.id} />
                </div>
              ) : (
                <form action={gerarCobrancaPix}>
                  <p className="mb-3 text-sm">
                    Prefere regularizar agora mesmo? Gere um Pix e o acesso volta
                    sozinho assim que o pagamento cair.
                  </p>
                  <SubmitButton className="btn-primary w-full text-sm">
                    Gerar cobrança Pix
                  </SubmitButton>
                </form>
              )}
            </div>
          )}

          <form action={logout} className="mt-6">
            <button type="submit" className="btn-ghost w-full">
              Sair
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-muted">
          Assim que o pagamento for confirmado, o acesso volta automaticamente.
        </p>
      </div>
    </main>
  );
}
