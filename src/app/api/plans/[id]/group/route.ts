import { NextResponse, type NextRequest } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { computeCommonPoints, buildIcebreakers } from "@/lib/profile/interests";
import {
  mockGetPlan,
  mockListUserIdsForPlan,
  mockListProfilesByIds,
  mockGetHype,
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

export type GroupMemberDto = {
  user_id: string;
  first_name: string;
  age: number | null;
  photo_url: string | null;
  is_me: boolean;
};

export type GroupDto = {
  plan_id: string;
  activity: string;
  start_time: string;
  location_text: string;
  lat: number;
  lng: number;
  is_member: boolean;
  is_ritual: boolean;
  phase: "before" | "today" | "after";
  members: GroupMemberDto[];
  common_points: string[];
  icebreakers: string[];
  hype_count: number;
  i_am_hyped: boolean;
  // Belle rencontre : disponible après l'événement
  belles_given: string[]; // user_ids que j'ai marqués
  mutuals: string[]; // user_ids en rencontre mutuelle (révélé après coup)
};

function phaseOf(startIso: string): "before" | "today" | "after" {
  const start = new Date(startIso).getTime();
  const now = Date.now();
  if (now < start - 12 * 3600 * 1000) return "before";
  if (now < start + 4 * 3600 * 1000) return "today";
  return "after";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: planId } = await ctx.params;
  const userId = await resolveUserId(req);

  // ── Mock ──
  if (!isSupabaseConfigured()) {
    const plan = mockGetPlan(planId);
    if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const memberIds = mockListUserIdsForPlan(planId);
    const profiles = mockListProfilesByIds(memberIds);
    const members: GroupMemberDto[] = memberIds.map((uid) => {
      const p = profiles.find((x) => x.id === uid);
      return {
        user_id: uid,
        first_name: p?.first_name ?? "Membre",
        age: p?.age ?? null,
        photo_url: p?.photo_url ?? null,
        is_me: uid === userId,
      };
    });
    const memberLite = profiles.map((p) => ({ first_name: p.first_name, interests: p.interests ?? [] }));
    const hype = mockGetHype(planId);
    const bellesGiven = userId ? mockGetBellesFrom(userId).filter((to) => memberIds.includes(to)) : [];
    const mutuals = userId ? memberIds.filter((m) => m !== userId && mockIsMutual(userId, m)) : [];
    const dto: GroupDto = {
      plan_id: planId,
      activity: plan.activity,
      start_time: plan.start_time,
      location_text: plan.location_text,
      lat: plan.lat,
      lng: plan.lng,
      is_member: userId ? memberIds.includes(userId) : false,
      is_ritual: plan.source === "ritual",
      phase: phaseOf(plan.start_time),
      members,
      common_points: computeCommonPoints(memberLite),
      icebreakers: buildIcebreakers(memberLite),
      hype_count: hype.count,
      i_am_hyped: userId ? hype.users.includes(userId) : false,
      belles_given: bellesGiven,
      mutuals,
    };
    return NextResponse.json(dto);
  }

  // ── Réel ──
  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;
  const { data: plan } = await admin
    .from("plans")
    .select("id, activity, start_time, location_text, lat, lng, source")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: parts } = await admin.from("plan_participants").select("user_id").eq("plan_id", planId);
  const memberIds = ((parts ?? []) as { user_id: string }[]).map((r) => r.user_id);

  const { data: profs } = await admin
    .from("profiles")
    .select("user_id, first_name, age, photo_url, interests")
    .in("user_id", memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"]);
  type Prof = { user_id: string; first_name: string; age: number; photo_url: string | null; interests: string[] | null };
  const profById = new Map<string, Prof>(((profs ?? []) as Prof[]).map((p) => [p.user_id, p]));

  const members: GroupMemberDto[] = memberIds.map((uid) => {
    const p = profById.get(uid);
    return {
      user_id: uid,
      first_name: p?.first_name ?? "Membre",
      age: p?.age ?? null,
      photo_url: p?.photo_url ?? null,
      is_me: uid === userId,
    };
  });
  const memberLite = memberIds.map((uid) => ({
    first_name: profById.get(uid)?.first_name ?? "Membre",
    interests: profById.get(uid)?.interests ?? [],
  }));

  const { data: hypeRows } = await admin.from("plan_hype").select("user_id").eq("plan_id", planId);
  const hypeUsers = ((hypeRows ?? []) as { user_id: string }[]).map((r) => r.user_id);

  let bellesGiven: string[] = [];
  let mutuals: string[] = [];
  if (userId) {
    const { data: mine } = await admin.from("belles_rencontres").select("to_user").eq("from_user", userId);
    bellesGiven = ((mine ?? []) as { to_user: string }[]).map((r) => r.to_user).filter((to) => memberIds.includes(to));
    // Mutuels : ceux que j'ai marqués ET qui m'ont marqué
    if (bellesGiven.length > 0) {
      const { data: back } = await admin
        .from("belles_rencontres")
        .select("from_user")
        .eq("to_user", userId)
        .in("from_user", bellesGiven);
      const backSet = new Set(((back ?? []) as { from_user: string }[]).map((r) => r.from_user));
      mutuals = bellesGiven.filter((u) => backSet.has(u));
    }
  }

  const typedPlan = plan as { activity: string; start_time: string; location_text: string; lat: number; lng: number; source?: string };
  const dto: GroupDto = {
    plan_id: planId,
    activity: typedPlan.activity,
    start_time: typedPlan.start_time,
    location_text: typedPlan.location_text,
    lat: Number(typedPlan.lat),
    lng: Number(typedPlan.lng),
    is_member: userId ? memberIds.includes(userId) : false,
    is_ritual: typedPlan.source === "ritual",
    phase: phaseOf(typedPlan.start_time),
    members,
    common_points: computeCommonPoints(memberLite),
    icebreakers: buildIcebreakers(memberLite),
    hype_count: hypeUsers.length,
    i_am_hyped: userId ? hypeUsers.includes(userId) : false,
    belles_given: bellesGiven,
    mutuals,
  };
  return NextResponse.json(dto);
}
