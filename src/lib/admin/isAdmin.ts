/**
 * Autorisation admin par e-mail — le dashboard /admin est réservé au(x)
 * propriétaire(s). La liste par défaut peut être surchargée via ADMIN_EMAILS
 * (séparés par des virgules). Connaître l'e-mail ne donne aucun accès :
 * l'autorisation réelle est vérifiée côté serveur contre la session Supabase.
 */

const DEFAULT_ADMINS = ["p.morthier@gmail.com"];

export function adminEmails(): string[] {
  const env = process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  const list = env
    ? env.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
  return list.length ? list : DEFAULT_ADMINS;
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
