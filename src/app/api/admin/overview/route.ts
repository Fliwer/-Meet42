import { NextResponse, type NextRequest } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { isAdminRequest } from "@/lib/admin/requireAdmin";
import { RITUALS, nextOccurrence, formatOccurrenceFr } from "@/lib/rituals/rituals";
import { ACTIVITIES } from "@/lib/plans/activities";
import { INTERESTS } from "@/lib/profile/interests";
import {
  mockAllProfiles,
  mockAllReservations,
  mockListPlans,
  mockListUserIdsForPlan,
  mockListProfilesByIds,
  mockCountEncounters,
  mockCountMutualBelles,
  mockCountBelleGivers,
} from "@/lib/mock/mockDb";

/**
 * Dashboard admin (mode concierge) — vue d'ensemble : membres, réservations
 * par créneau, groupes formés, KPIs.
 *
 * Sécurité : exige l'en-tête x-admin-key === ADMIN_SECRET. En local (mock, pas
 * de Supabase), l'accès est ouvert pour le dev. En prod sans ADMIN_SECRET
 * défini, l'accès est refusé (fail-safe).
 */

const interestLabel = (id: string) => INTERESTS.find((i) => i.id === id)?.label ?? id;
const activityLabel = (id: string) => ACTIVITIES.find((a) => a.id === id)?.label ?? id;
const activityEmoji = (id: string) => ACTIVITIES.find((a) => a.id === id)?.emoji ?? "✨";

export type AdminMember = {
  user_id: string;
  first_name: string;
  age: number | null;
  photo_url: string | null;
  interests: string[];
};

export type AdminSlot = {
  ritual_id: string;
  label: string;
  emoji: string;
  occurs_at: string;
  when_label: string;
  reserved: { user_id: string; first_name: string; age: number | null; status: string }[];
};

export type AdminGroup = {
  plan_id: string;
  activity: string;
  emoji: string;
  start_time: string;
  location_text: string;
  members: string[];
  is_past: boolean;
};

export type AdminFunnel = {
  signups: number; // profils créés
  reserved: number; // ont réservé ≥ 1 fois
  matched: number; // ont été placés dans un groupe
  belles: number; // ont gardé ≥ 1 belle rencontre
};

export type AdminOverview = {
  stats: {
    members: number;
    reservationsPending: number;
    groups: number;
    encounters: number;
    mutualBelles: number;
  };
  funnel: AdminFunnel;
  slots: AdminSlot[];
  members: AdminMember[];
  groups: AdminGroup[];
};

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const now = Date.now();

  // ── Mock ──
  if (!isSupabaseConfigured()) {
    const profiles = mockAllProfiles();
    const byId = new Map(profiles.map((p) => [p.id, p]));
    const allReservations = mockAllReservations().filter((r) => r.status !== "cancelled");
    const reservations = allReservations;

    const slots: AdminSlot[] = RITUALS.map((r) => {
      const occ = nextOccurrence(r);
      const occIso = occ.toISOString();
      const reserved = reservations
        .filter((x) => x.ritual_id === r.id && x.occurs_at === occIso)
        .map((x) => {
          const p = byId.get(x.user_id);
          return { user_id: x.user_id, first_name: p?.first_name ?? "?", age: p?.age ?? null, status: x.status };
        });
      return { ritual_id: r.id, label: r.label, emoji: r.emoji, occurs_at: occIso, when_label: formatOccurrenceFr(occ), reserved };
    });

    const ritualPlans = mockListPlans().plans.filter((p) => p.source === "ritual");
    const groups: AdminGroup[] = ritualPlans.map((p) => ({
      plan_id: p.id,
      activity: p.activity,
      emoji: activityEmoji(p.activity),
      start_time: p.start_time,
      location_text: p.location_text,
      members: mockListProfilesByIds(mockListUserIdsForPlan(p.id)).map((m) => m.first_name),
      is_past: new Date(p.start_time).getTime() < now,
    }));

    return NextResponse.json({
      stats: {
        members: profiles.length,
        reservationsPending: reservations.filter((r) => r.status === "pending").length,
        groups: ritualPlans.length,
        encounters: mockCountEncounters(),
        mutualBelles: mockCountMutualBelles(),
      },
      funnel: {
        signups: profiles.length,
        reserved: new Set(allReservations.map((r) => r.user_id)).size,
        matched: new Set(allReservations.filter((r) => r.status === "matched").map((r) => r.user_id)).size,
        belles: mockCountBelleGivers(),
      },
      slots,
      members: profiles.map((p) => ({
        user_id: p.id,
        first_name: p.first_name,
        age: p.age,
        photo_url: p.photo_url ?? null,
        interests: (p.interests ?? []).map(interestLabel),
      })),
      groups,
    } satisfies AdminOverview);
  }

  // ── Réel ──
  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;

  const { data: profRows } = await admin
    .from("profiles")
    .select("user_id, first_name, age, photo_url, interests, created_at")
    .order("created_at", { ascending: false });
  type Prof = { user_id: string; first_name: string; age: number; photo_url: string | null; interests: string[] | null };
  const profiles = (profRows ?? []) as Prof[];
  const byId = new Map(profiles.map((p) => [p.user_id, p]));

  const { data: resRows } = await admin
    .from("reservations")
    .select("user_id, ritual_id, occurs_at, status")
    .neq("status", "cancelled");
  const reservations = (resRows ?? []) as { user_id: string; ritual_id: string; occurs_at: string; status: string }[];

  const slots: AdminSlot[] = RITUALS.map((r) => {
    const occ = nextOccurrence(r);
    const occIso = occ.toISOString();
    const reserved = reservations
      .filter((x) => x.ritual_id === r.id && x.occurs_at === occIso)
      .map((x) => {
        const p = byId.get(x.user_id);
        return { user_id: x.user_id, first_name: p?.first_name ?? "?", age: p?.age ?? null, status: x.status };
      });
    return { ritual_id: r.id, label: r.label, emoji: r.emoji, occurs_at: occIso, when_label: formatOccurrenceFr(occ), reserved };
  });

  const { data: planRows } = await admin
    .from("plans")
    .select("id, activity, start_time, location_text, source")
    .eq("source", "ritual")
    .order("start_time", { ascending: false })
    .limit(100);
  const ritualPlans = (planRows ?? []) as { id: string; activity: string; start_time: string; location_text: string }[];

  const groups: AdminGroup[] = [];
  for (const p of ritualPlans) {
    const { data: parts } = await admin.from("plan_participants").select("user_id").eq("plan_id", p.id);
    const names = ((parts ?? []) as { user_id: string }[]).map((r) => byId.get(r.user_id)?.first_name ?? "?");
    groups.push({
      plan_id: p.id,
      activity: p.activity,
      emoji: activityEmoji(p.activity),
      start_time: p.start_time,
      location_text: p.location_text,
      members: names,
      is_past: new Date(p.start_time).getTime() < now,
    });
  }

  const { count: encCount } = await admin.from("encounters").select("id", { count: "exact", head: true });

  // Mutuels : compte des paires réciproques
  const { data: belles } = await admin.from("belles_rencontres").select("from_user, to_user");
  const bellesArr = (belles ?? []) as { from_user: string; to_user: string }[];
  const mutualSet = new Set<string>();
  for (const b of bellesArr) {
    if (bellesArr.some((x) => x.from_user === b.to_user && x.to_user === b.from_user)) {
      mutualSet.add(b.from_user < b.to_user ? `${b.from_user}|${b.to_user}` : `${b.to_user}|${b.from_user}`);
    }
  }

  return NextResponse.json({
    stats: {
      members: profiles.length,
      reservationsPending: reservations.filter((r) => r.status === "pending").length,
      groups: ritualPlans.length,
      encounters: encCount ?? 0,
      mutualBelles: mutualSet.size,
    },
    funnel: {
      signups: profiles.length,
      reserved: new Set(reservations.map((r) => r.user_id)).size,
      matched: new Set(reservations.filter((r) => r.status === "matched").map((r) => r.user_id)).size,
      belles: new Set(bellesArr.map((b) => b.from_user)).size,
    },
    slots,
    members: profiles.map((p) => ({
      user_id: p.user_id,
      first_name: p.first_name,
      age: p.age,
      photo_url: p.photo_url,
      interests: (p.interests ?? []).map(interestLabel),
    })),
    groups,
  } satisfies AdminOverview);
}
