import { NextResponse, type NextRequest } from "next/server";
import type { PlanSummary } from "@/lib/plans/planTypes";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  mockGetCreator,
  mockCountParticipants,
  mockIsUserJoined,
  mockListPlansForUser,
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
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? xUserId ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    const rows = mockListPlansForUser(userId);
    const plans: PlanSummary[] = rows.map((plan) => ({
      id: plan.id,
      activity: plan.activity,
      start_time: plan.start_time,
      max_participants: plan.max_participants,
      participants_count: mockCountParticipants(plan.id),
      distance_km: null,
      location_text: plan.location_text,
      lat: plan.lat,
      lng: plan.lng,
      creator: mockGetCreator(plan),
      is_joined: mockIsUserJoined(plan.id, userId),
      is_creator: plan.creator_id === userId,
    }));
    return NextResponse.json({ plans });
  }

  const admin = getServerSupabaseAdmin();

  const { data: createdRows, error: e1 } = await admin.from("plans").select("*").eq("creator_id", userId);
  if (e1) return NextResponse.json({ error: "Erreur plans" }, { status: 500 });

  const { data: partRows, error: e2 } = await admin.from("plan_participants").select("plan_id").eq("user_id", userId);
  if (e2) return NextResponse.json({ error: "Erreur participants" }, { status: 500 });

  const idSet = new Set<string>();
  for (const r of (createdRows ?? []) as Array<{ id: string }>) idSet.add(r.id);
  for (const r of (partRows ?? []) as Array<{ plan_id: string }>) idSet.add(r.plan_id);

  const ids = Array.from(idSet);
  if (ids.length === 0) return NextResponse.json({ plans: [] });

  const { data: planRows, error: e3 } = await admin.from("plans").select("*").in("id", ids).order("start_time", { ascending: true });
  if (e3) return NextResponse.json({ error: "Erreur plans" }, { status: 500 });

  type PlanRow = {
    id: string;
    activity: string;
    start_time: string;
    max_participants: number;
    location_text: string;
    lat: number;
    lng: number;
    creator_id: string;
  };

  const plansTyped = (planRows ?? []) as PlanRow[];
  const planIds = plansTyped.map((p) => p.id);

  const { data: allParticipants } = await admin.from("plan_participants").select("plan_id,user_id").in("plan_id", planIds);
  const counts = new Map<string, number>();
  const joined = new Set<string>();
  for (const p of (allParticipants ?? []) as Array<{ plan_id: string; user_id: string }>) {
    counts.set(p.plan_id, (counts.get(p.plan_id) ?? 0) + 1);
    if (p.user_id === userId) joined.add(p.plan_id);
  }

  const creatorIds = Array.from(new Set(plansTyped.map((p) => p.creator_id)));
  const { data: profiles } = await admin.from("profiles").select("user_id,first_name,photo_url").in("user_id", creatorIds);
  type ProfileRow = { user_id: string; first_name: string; photo_url: string | null };
  const profileById = new Map<string, ProfileRow>(((profiles ?? []) as ProfileRow[]).map((p) => [p.user_id, p]));

  const plans: PlanSummary[] = plansTyped.map((plan) => {
    const creatorRow = profileById.get(plan.creator_id);
    return {
      id: plan.id,
      activity: plan.activity,
      start_time: plan.start_time,
      max_participants: plan.max_participants,
      participants_count: counts.get(plan.id) ?? 0,
      distance_km: null,
      location_text: plan.location_text,
      lat: Number(plan.lat),
      lng: Number(plan.lng),
      creator: {
        first_name: creatorRow?.first_name ?? "Anonyme",
        photo_url: creatorRow?.photo_url ?? null,
      },
      is_joined: joined.has(plan.id),
      is_creator: plan.creator_id === userId,
    };
  });

  return NextResponse.json({ plans });
}
