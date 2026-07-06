import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { getRitual, nextOccurrence } from "@/lib/rituals/rituals";
import { mockReserve, mockCancelReservation, mockGetProfile } from "@/lib/mock/mockDb";

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const xUserId = req.headers.get("x-user-id");
  const accessToken = getBearerToken(req);
  if (!isSupabaseConfigured()) return xUserId ?? null;
  if (!accessToken) return null;
  const supabase = getServerSupabaseWithAccessToken(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) return xUserId ?? null;
  return data.user?.id ?? xUserId ?? null;
}

const BodySchema = z.object({
  ritual_id: z.string().min(1).max(60),
  action: z.enum(["reserve", "cancel"]).default("reserve"),
});

/** Réserver (ou annuler) sa place sur la prochaine occurrence d'un rituel. */
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const ritual = getRitual(parsed.data.ritual_id);
  if (!ritual) return NextResponse.json({ error: "Rituel inconnu" }, { status: 404 });

  const occIso = nextOccurrence(ritual).toISOString();

  // ── Mode mock ──
  if (!isSupabaseConfigured()) {
    if (parsed.data.action === "cancel") {
      mockCancelReservation(userId, ritual.id, occIso);
      return NextResponse.json({ ok: true, status: "none", occurs_at: occIso });
    }
    if (!mockGetProfile(userId)) {
      return NextResponse.json({ ok: false, error: "PROFILE_REQUIRED" }, { status: 409 });
    }
    mockReserve({ user_id: userId, ritual_id: ritual.id, occurs_at: occIso });
    return NextResponse.json({ ok: true, status: "pending", occurs_at: occIso });
  }

  // ── Mode réel ──
  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;

  if (parsed.data.action === "cancel") {
    await admin
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("ritual_id", ritual.id)
      .eq("occurs_at", occIso)
      .eq("status", "pending");
    return NextResponse.json({ ok: true, status: "none", occurs_at: occIso });
  }

  // Réserver exige un profil (le plan créé au matching référence profiles).
  const { data: profile } = await admin.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!profile) return NextResponse.json({ ok: false, error: "PROFILE_REQUIRED" }, { status: 409 });

  // Upsert : réactive une annulation, ignore un doublon.
  const { error } = await admin
    .from("reservations")
    .upsert(
      { user_id: userId, ritual_id: ritual.id, occurs_at: occIso, status: "pending" },
      { onConflict: "user_id,ritual_id,occurs_at" }
    );
  if (error) return NextResponse.json({ error: "Impossible de réserver" }, { status: 500 });

  return NextResponse.json({ ok: true, status: "pending", occurs_at: occIso });
}
