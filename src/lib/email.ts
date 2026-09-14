const RESEND_API = "https://api.resend.com/emails";

function apiKey(): string {
  const k = process.env.RESEND_API_KEY;
  if (!k) throw new Error("RESEND_API_KEY não configurado.");
  return k;
}

/** Envia um e-mail via Resend. Lança erro se a API recusar. */
export async function enviarEmail(input: { to: string; subject: string; html: string }) {
  const from = process.env.EMAIL_FROM || "Auto Peças System <onboarding@resend.dev>";
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html }),
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`Resend recusou o e-mail (${res.status}): ${corpo}`);
  }
  return res.json();
}
