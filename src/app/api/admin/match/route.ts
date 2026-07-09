import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Déclenche le matching (force) depuis le dashboard admin — mode concierge.
 * Relaie vers /api/cron/match?force=1 côté serveur en injectant CRON_SECRET,
 * pour ne jamais exposer ce secret au client.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!isSupabaseConfigured()) return true;
  if (!secret) return false;
  return req.headers.get("x-admin-key") === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const origin = req.nextUrl.origin;
  const headers: Record<string, string> = {};
  if (process.env.CRON_SECRET) headers.authorization = `Bearer ${process.env.CRON_SECRET}`;

  try {
    const res = await fetch(`${origin}/api/cron/match?force=1`, { headers, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, result: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
