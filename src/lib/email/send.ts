/**
 * Envoi d'e-mails transactionnels via Resend (API HTTP directe, zéro dépendance).
 * Sans RESEND_API_KEY : no-op silencieux loggé, l'app fonctionne, rien ne casse.
 */

const RESEND_URL = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:skip] ${params.subject} → ${params.to}`);
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Meet42 <onboarding@resend.dev>",
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });
    if (!res.ok) {
      console.error(`[email:error] ${res.status} ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email:error]", err);
    return false;
  }
}
