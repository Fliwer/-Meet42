/**
 * Connexion Facebook (OAuth Meta) : souvent bloquée tant que l’app Meta n’est pas validée
 * (SMS dev, review, etc.). Désactivée par défaut — active avec NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN=true.
 */
export function isFacebookLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN === "true";
}
