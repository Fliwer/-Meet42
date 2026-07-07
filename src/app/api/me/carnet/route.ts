import { NextResponse, type NextRequest } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { getRitual, formatOccurrenceFr } from "@/lib/rituals/rituals";
import { headlineMilestone, type CarnetStats } from "@/lib/carnet/milestones";
import {
  mockGetUserReservationsAll,
  mockListPlansForUser,
  mockListUserIdsForPlan,
  mockGetPlan,
  mockGetBellesFrom,
  mockIsMutual,
} from "@/lib/mock/mockDb";

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
  const { data } = await supabase.auth.getUser(accessToken);
  return data.user?.id ?? xUserId ?? null;
}

export type CarnetEntry = {
  plan_id: string;
  activity: string;
  start_time: string;
  location_text: string;
  member_count: number;
};

export type CarnetUpcoming = {
  ritual_id: string;
  label: string;
  emoji: string;
  when_label: string;
  status: "pending" | "matched";
  plan_id: string | null;
};

export type CarnetDto = {
  stats: CarnetStats;
  milestone: { title: string; sub: string };
  upcoming: CarnetUpcoming[];
  past: CarnetEntry[];
};

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const now = Date.now();

  // ── Mock ──
  if (!isSupabaseConfigured()) {
    const reservations = mockGetUserReservationsAll(userId).filter((r) => r.status !== "cancelled");
    const upcoming: CarnetUpcoming[] = reservations
      .filter((r) => new Date(r.occurs_at).getTime() > now - 6 * 3600 * 1000)
      .map((r) => {
        const rit = getRitual(r.ritual_id);
        return {
          ritual_id: r.ritual_id,
          label: rit?.label ?? r.ritual_id,
          emoji: rit?.emoji ?? "✨",
          when_label: formatOccurrenceFr(new Date(r.occurs_at)),
          status: r.status === "matched" ? "matched" : "pending",
          plan_id: r.plan_id,
        };
      });

    const myPlans = mockListPlansForUser(userId).filter(
      (p) => p.source === "ritual" && new Date(p.start_time).getTime() < now
    );
    const past: CarnetEntry[] = myPlans.map((p) => ({
      plan_id: p.id,
      activity: p.activity,
      start_time: p.start_time,
      location_text: p.location_text,
      member_count: mockListUserIdsForPlan(p.id).length,
    }));

    const metSet = new Set<string>();
    for (const p of myPlans) {
      for (const uid of mockListUserIdsForPlan(p.id)) if (uid !== userId) metSet.add(uid);
    }
    const cercle = mockGetBellesFrom(userId).filter((to) => mockIsMutual(userId, to)).length;

    const stats: CarnetStats = { fortyTwoCount: myPlans.length, peopleMet: metSet.size, cercle };
    return NextResponse.json({
      stats,
      milestone: headlineMilestone(stats),
      upcoming,
      past,
    } satisfies CarnetDto);
  }

  // ── Réel ──
  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;

  const { data: resRows } = await admin
    .from("reservations")
    .select("ritual_id, occurs_at, status, plan_id")
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .gte("occurs_at", new Date(now - 6 * 3600 * 1000).toISOString())
    .order("occurs_at", { ascending: true });
  const upcoming: CarnetUpcoming[] = ((resRows ?? []) as {
    ritual_id: string;
    occurs_at: string;
    status: string;
    plan_id: string | null;
  }[]).map((r) => {
    const rit = getRitual(r.ritual_id);
    return {
      ritual_id: r.ritual_id,
      label: rit?.label ?? r.ritual_id,
      emoji: rit?.emoji ?? "✨",
      when_label: formatOccurrenceFr(new Date(r.occurs_at)),
      status: r.status === "matched" ? "matched" : "pending",
      plan_id: r.plan_id,
    };
  });

  // Mes plans (participant) passés
  const { data: myParts } = await admin.from("plan_participants").select("plan_id").eq("user_id", userId);
  const myPlanIds = ((myParts ?? []) as { plan_id: string }[]).map((r) => r.plan_id);
  let past: CarnetEntry[] = [];
  if (myPlanIds.length > 0) {
    const { data: planRows } = await admin
      .from("plans")
      .select("id, activity, start_time, location_text, source")
      .in("id", myPlanIds)
      .lt("start_time", new Date(now).toISOString())
      .order("start_time", { ascending: false });
    const pastPlans = ((planRows ?? []) as {
      id: string;
      activity: string;
      start_time: string;
      location_text: string;
      source?: string;
    }[]).filter((p) => p.source === "ritual");

    // Compte des membres par plan
    const counts = new Map<string, number>();
    if (pastPlans.length > 0) {
      const { data: allParts } = await admin
        .from("plan_participants")
        .select("plan_id")
        .in("plan_id", pastPlans.map((p) => p.id));
      for (const r of (allParts ?? []) as { plan_id: string }[]) {
        counts.set(r.plan_id, (counts.get(r.plan_id) ?? 0) + 1);
      }
    }
    past = pastPlans.map((p) => ({
      plan_id: p.id,
      activity: p.activity,
      start_time: p.start_time,
      location_text: p.location_text,
      member_count: counts.get(p.id) ?? 0,
    }));
  }

  // Graphe : rencontres réelles + cercle (mutuels)
  const { data: encA } = await admin.from("encounters").select("user_b").eq("user_a", userId);
  const { data: encB } = await admin.from("encounters").select("user_a").eq("user_b", userId);
  const metSet = new Set<string>();
  for (const r of (encA ?? []) as { user_b: string }[]) metSet.add(r.user_b);
  for (const r of (encB ?? []) as { user_a: string }[]) metSet.add(r.user_a);

  const { data: mine } = await admin.from("belles_rencontres").select("to_user").eq("from_user", userId);
  const givenTo = ((mine ?? []) as { to_user: string }[]).map((r) => r.to_user);
  let cercle = 0;
  if (givenTo.length > 0) {
    const { data: back } = await admin
      .from("belles_rencontres")
      .select("from_user")
      .eq("to_user", userId)
      .in("from_user", givenTo);
    cercle = new Set(((back ?? []) as { from_user: string }[]).map((r) => r.from_user)).size;
  }

  const stats: CarnetStats = { fortyTwoCount: past.length, peopleMet: metSet.size, cercle };
  return NextResponse.json({
    stats,
    milestone: headlineMilestone(stats),
    upcoming,
    past,
  } satisfies CarnetDto);
}
