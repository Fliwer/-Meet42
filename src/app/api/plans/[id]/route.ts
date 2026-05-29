import { NextResponse, type NextRequest } from "next/server";
import type { PlanSummary } from "@/lib/plans/planTypes";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  mockGetCreator,
  mockGetPlan,
  mockIsUserJoined,
  mockCountParticipants,
  mockListUserIdsForPlan,
  mockListProfilesByIds,
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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const planId = id;
  if (!planId) return NextResponse.json({ error: "Plan id requis" }, { status: 400 });

  const userId = await resolveUserId(req);

  if (!isSupabaseConfigured()) {
    const plan = mockGetPlan(planId);
    if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const distance_km = null as PlanSummary["distance_km"];
    const participants_count = mockCountParticipants(planId);
    const creator = mockGetCreator(plan);
    const previewIds = mockListUserIdsForPlan(plan.id).slice(0, 4);
    const previewProfiles = mockListProfilesByIds(previewIds);
    const participant_preview = previewProfiles.map((p) => ({
      first_name: p.first_name,
      photo_url: p.photo_url ?? null,
    }));

    return NextResponse.json({
      id: plan.id,
      activity: plan.activity,
      start_time: plan.start_time,
      max_participants: plan.max_participants,
      participants_count,
      distance_km,
      location_text: plan.location_text,
      lat: plan.lat,
      lng: plan.lng,
      creator,
      participant_preview,
      is_joined: userId ? mockIsUserJoined(planId, userId) : false,
      is_creator: userId ? plan.creator_id === userId : false,
    } satisfies PlanSummary);
  }

  const admin = getServerSupabaseAdmin();
  const { data: planRow, error } = await admin.from("plans").select("*").eq("id", planId).maybeSingle();
  if (error) return NextResponse.json({ error: "Erreur plan" }, { status: 500 });
  if (!planRow) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: participantRows } = await admin.from("plan_participants").select("plan_id,user_id").eq("plan_id", planId);
  const typedParticipants = (participantRows ?? []) as Array<{ user_id: string }>;
  const participants_count = typedParticipants.length;
  const is_joined = userId ? typedParticipants.some((r) => r.user_id === userId) : false;
  const previewUserIds = typedParticipants.slice(0, 4).map((r) => r.user_id);

  const creatorId = (planRow as { creator_id: string }).creator_id;
  const profileIds = Array.from(new Set([creatorId, ...previewUserIds]));
  const { data: profileRows } = await admin.from("profiles").select("user_id,first_name,photo_url").in("user_id", profileIds);
  type Prof = { user_id: string; first_name: string; photo_url: string | null };
  const profById = new Map<string, Prof>(((profileRows ?? []) as Prof[]).map((p) => [p.user_id, p]));
  const creatorRow = profById.get(creatorId) ?? null;
  const participant_preview = previewUserIds
    .map((uid) => profById.get(uid))
    .filter(Boolean)
    .map((row) => ({ first_name: row!.first_name, photo_url: row!.photo_url ?? null }));

  const typedPlanRow = planRow as {
    id: string;
    activity: string;
    start_time: string;
    max_participants: number;
    location_text: string;
    lat: number;
    lng: number;
    creator_id: string;
  };

  const typedCreatorRow = creatorRow as { first_name: string; photo_url: string | null } | null;

  return NextResponse.json({
    id: typedPlanRow.id,
    activity: typedPlanRow.activity,
    start_time: typedPlanRow.start_time,
    max_participants: typedPlanRow.max_participants,
    participants_count,
    distance_km: null,
    location_text: typedPlanRow.location_text,
    lat: Number(typedPlanRow.lat),
    lng: Number(typedPlanRow.lng),
    creator: {
      first_name: typedCreatorRow?.first_name ?? "Anonyme",
      photo_url: typedCreatorRow?.photo_url ?? null,
    },
    participant_preview,
    is_joined,
    is_creator: userId ? creatorId === userId : false,
  } satisfies PlanSummary);
}

