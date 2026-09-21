import { validarCnpj } from "@/lib/cnpj";
import { consultarCnpjReceita } from "@/lib/cnpj-consulta";
import { clientIp, esperaLegivel, hit } from "@/lib/rate-limit";

/** Prévia pública do CNPJ na tela de cadastro (sem sessão). A validação de verdade acontece de novo no `signupCompany`. */
export async function GET(req: Request) {
  const r = hit(`buscar-cnpj:ip:${await clientIp()}`, 20, 10 * 60_000);
  if (!r.ok) {
    return Response.json({ erro: `Muitas tentativas. Aguarde ${esperaLegivel(r.retryAfterSec)}.` }, { status: 429 });
  }

  const cnpj = new URL(req.url).searchParams.get("cnpj") ?? "";
  if (!validarCnpj(cnpj)) {
    return Response.json({ erro: "CNPJ inválido." }, { status: 400 });
  }

  try {
    const dados = await consultarCnpjReceita(cnpj);
    return Response.json({ dados });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Erro ao consultar CNPJ." }, { status: 502 });
  }
}
