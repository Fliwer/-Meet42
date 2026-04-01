/** Email affiché pour contact / liste d’attente Pro. Définir `NEXT_PUBLIC_CONTACT_EMAIL` en prod. */
export const SITE_CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ?? "";

export function mailtoHref(subject: string, body?: string): string {
  const e = SITE_CONTACT_EMAIL;
  if (!e) return "/confiance";
  const q = new URLSearchParams();
  q.set("subject", subject);
  if (body) q.set("body", body);
  return `mailto:${e}?${q.toString()}`;
}
