import { NextResponse, type NextRequest } from "next/server";

/**
 * Valide le mot de passe du portail « accès réservé » et pose le cookie qui
 * déverrouille le site. Voir src/proxy.ts pour la logique de garde.
 */

const GATE_COOKIE = "meet42_gate";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  const expected = process.env.SITE_GATE_PASSWORD;
  // Gate désactivé : rien à valider.
  if (!expected) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";

  if (password !== expected) {
    return NextResponse.json({ ok: false, error: "Mot de passe incorrect" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return res;
}
