import { NextResponse, type NextRequest } from "next/server";

/**
 * Portail « accès réservé » — verrouille tout le site (domaine custom inclus)
 * tant qu'on n'a pas le mot de passe. Utile pendant la construction / la phase
 * testeurs, sur n'importe quel plan Vercel (le password protection natif de
 * Vercel est réservé au plan Pro).
 *
 * Activation : présent uniquement si la variable d'env SITE_GATE_PASSWORD est
 * définie. Absente → le proxy laisse tout passer (aucun effet).
 *
 * Le cookie meet42_gate contient le mot de passe (httpOnly + secure) : un
 * visiteur ne peut pas fabriquer un cookie valide sans connaître le secret.
 */

const GATE_COOKIE = "meet42_gate";

// Chemins toujours accessibles même verrouillé (la page du portail elle-même,
// son API de validation, et le healthcheck infra).
const ALLOWLIST = new Set(["/gate", "/api/gate", "/api/health"]);

export function proxy(request: NextRequest) {
  const password = process.env.SITE_GATE_PASSWORD;

  // Gate désactivé (aucun mot de passe configuré) → on ne touche à rien.
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (ALLOWLIST.has(pathname)) return NextResponse.next();

  // Déjà déverrouillé ?
  const cookie = request.cookies.get(GATE_COOKIE)?.value;
  if (cookie && cookie === password) return NextResponse.next();

  // Sinon : on réécrit vers le portail sans changer l'URL affichée.
  const url = request.nextUrl.clone();
  url.pathname = "/gate";
  return NextResponse.rewrite(url);
}

export const config = {
  // On applique le proxy partout SAUF les assets statiques (déjà publics et
  // sans intérêt à verrouiller).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
