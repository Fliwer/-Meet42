import { NextResponse, type NextRequest } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { RITUALS, nextOccurrence, reservationCloseAt } from "@/lib/rituals/rituals";
import { mockEnsureSeedAround, mockGetSlotReservations, mockGetUserReservation, mockSeedReservations } from "@/lib/mock/mockDb";

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

export type RitualSlotDto = {
  id: string;
  label: string;
  tagline: string;
  activity: string;
  emoji: string;
  communeLabel: string;
  occurs_at: string;
  closes_at: string;
  reserved_count: number;
  my_status: "none" | "pending" | "matched";
  my_plan_id: string | null;
};

/** Les prochains créneaux de rituels, avec compteur et état de l'utilisateur. */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  const now = new Date();

  const slots: RitualSlotDto[] = [];

  if (!isSupabaseConfigured()) {
    mockEnsureSeedAround(50.8466, 4.3528);
    for (const r of RITUALS) {
      const occ = nextOccurrence(r, now);
      const occIso = occ.toISOString();
      // Démo : le créneau affiche déjà de la vie
      mockSeedReservations(r.id, occIso, r.id === "jeudi-apero" ? 7 : 3);
      const reserved = mockGetSlotReservations(r.id, occIso);
      const mine = userId ? mockGetUserReservation(userId, r.id, occIso) : null;
      slots.push({
        id: r.id,
        label: r.label,
        tagline: r.tagline,
        activity: r.activity,
        emoji: r.emoji,
        communeLabel: r.communeLabel,
        occurs_at: occIso,
        closes_at: reservationCloseAt(occ).toISOString(),
        reserved_count: reserved.length,
        my_status: mine ? (mine.status === "matched" ? "matched" : "pending") : "none",
        my_plan_id: mine?.plan_id ?? null,
      });
    }
    return NextResponse.json({ slots });
  }

  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;
  for (const r of RITUALS) {
    const occ = nextOccurrence(r, now);
    const occIso = occ.toISOString();
    const { count } = await admin
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("ritual_id", r.id)
      .eq("occurs_at", occIso)
      .eq("status", "pending");

    let myStatus: RitualSlotDto["my_status"] = "none";
    let myPlanId: string | null = null;
    if (userId) {
      const { data: mine } = await admin
        .from("reservations")
        .select("status, plan_id")
        .eq("user_id", userId)
        .eq("ritual_id", r.id)
        .eq("occurs_at", occIso)
        .neq("status", "cancelled")
        .maybeSingle();
      if (mine) {
        myStatus = mine.status === "matched" ? "matched" : "pending";
        myPlanId = (mine.plan_id as string | null) ?? null;
      }
    }

    slots.push({
      id: r.id,
      label: r.label,
      tagline: r.tagline,
      activity: r.activity,
      emoji: r.emoji,
      communeLabel: r.communeLabel,
      occurs_at: occIso,
      closes_at: reservationCloseAt(occ).toISOString(),
      reserved_count: count ?? 0,
      my_status: myStatus,
      my_plan_id: myPlanId,
    });
  }
  return NextResponse.json({ slots });
}
