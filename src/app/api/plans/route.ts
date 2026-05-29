import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ACTIVITIES } from "@/lib/plans/activities";
import { haversineKm } from "@/lib/plans/distance";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  mockEnsureSeedAround,
  mockGetCreator,
  mockIsUserJoined,
  mockListPlans,
  mockCountParticipants,
  mockCreatePlan,
  mockGetProfile,
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

  if (!isSupabaseConfigured()) {
    return xUserId ?? null;
  }

  if (!accessToken) return null;
  const supabase = getServerSupabaseWithAccessToken(accessToken);
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? xUserId ?? null;
}

const CreatePlanSchema = z.object({
  activity: z.string().min(1).max(40),
  start_time_iso: z.string().datetime(),
  location_text: z.string().min(1).max(140),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  max_participants: z.number().int().min(4).max(6),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat") ?? "");
  const lng = Number(url.searchParams.get("lng") ?? "");
  const radiusKm = Number(url.searchParams.get("radiusKm") ?? "8");
  const limit = Number(url.searchParams.get("limit") ?? "30");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng requis" }, { status: 400 });
  }

  const userId = await resolveUserId(req);

  // Mock fallback: on génère des plans autour pour “cold start”.
  if (!isSupabaseConfigured()) {
    mockEnsureSeedAround(lat, lng);
    const { plans } = mockListPlans();

    const filtered = plans
      .map((p) => {
        const distance_km = haversineKm(lat, lng, p.lat, p.lng);
        return { plan: p, distance_km };
      })
      .filter((x) => x.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit);

    const summaries = filtered.map((x) => {
      const participants_count = mockCountParticipants(x.plan.id);
      const creator = mockGetCreator(x.plan);
      const previewIds = mockListUserIdsForPlan(x.plan.id).slice(0, 4);
      const previewProfiles = mockListProfilesByIds(previewIds);
      const participant_preview = previewProfiles.map((p) => ({
        first_name: p.first_name,
        photo_url: p.photo_url ?? null,
      }));
      return {
        id: x.plan.id,
        activity: x.plan.activity,
        start_time: x.plan.start_time,
        max_participants: x.plan.max_participants,
        participants_count,
        distance_km: x.distance_km,
        location_text: x.plan.location_text,
        lat: x.plan.lat,
        lng: x.plan.lng,
        creator: creator,
        participant_preview,
        is_joined: userId ? mockIsUserJoined(x.plan.id, userId) : false,
        is_creator: userId ? x.plan.creator_id === userId : false,
      };
    });

    return NextResponse.json({ plans: summaries });
  }

  const admin = getServerSupabaseAdmin();

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

  type ParticipantRow = { plan_id: string; user_id: string };
  type ProfileRow = { user_id: string; first_name: string; photo_url: string | null };

  const latRad = (lat * Math.PI) / 180;
  const deltaLat = radiusKm / 111.32;
  const deltaLng = radiusKm / (111.32 * Math.cos(latRad) || 1);

  const { data: rows, error } = await admin
    .from("plans")
    .select("*")
    .gte("lat", lat - deltaLat)
    .lte("lat", lat + deltaLat)
    .gte("lng", lng - deltaLng)
    .lte("lng", lng + deltaLng)
    .order("start_time", { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: "Erreur plans" }, { status: 500 });
  const candidates = ((rows ?? []) as PlanRow[]).map((r) => {
    const distance_km = haversineKm(lat, lng, Number(r.lat), Number(r.lng));
    return { row: r, distance_km };
  });

  const filtered = candidates
    .filter((x) => x.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);

  const planIds = filtered.map((x) => x.row.id);
  const { data: participantRows } = await admin
    .from("plan_participants")
    .select("plan_id,user_id")
    .in("plan_id", planIds);

  const counts = new Map<string, number>();
  const joined = new Set<string>();
  const previewIdsByPlan = new Map<string, string[]>();
  for (const p of (participantRows ?? []) as ParticipantRow[]) {
    const planId = p.plan_id;
    counts.set(planId, (counts.get(planId) ?? 0) + 1);
    if (userId && p.user_id === userId) joined.add(planId);
    const cur = previewIdsByPlan.get(planId) ?? [];
    if (cur.length < 4) {
      cur.push(p.user_id);
      previewIdsByPlan.set(planId, cur);
    }
  }

  const creatorIds = Array.from(new Set(filtered.map((x) => x.row.creator_id)));
  const previewUserIds = Array.from(new Set(Array.from(previewIdsByPlan.values()).flat()));
  const allProfileIds = Array.from(new Set([...creatorIds, ...previewUserIds]));
  const { data: profiles } = await admin.from("profiles").select("user_id,first_name,photo_url").in("user_id", allProfileIds);
  const profileById = new Map<string, ProfileRow>(((profiles ?? []) as ProfileRow[]).map((p) => [p.user_id, p]));

  const summaries = filtered.map((x) => {
    const plan = x.row;
    const creatorRow = profileById.get(plan.creator_id);
    const prevIds = previewIdsByPlan.get(plan.id) ?? [];
    const participant_preview = prevIds
      .map((uid) => profileById.get(uid))
      .filter(Boolean)
      .map((row) => ({
        first_name: row!.first_name,
        photo_url: row!.photo_url ?? null,
      }));
    return {
      id: plan.id,
      activity: plan.activity,
      start_time: plan.start_time,
      max_participants: plan.max_participants,
      participants_count: counts.get(plan.id) ?? 0,
      distance_km: x.distance_km,
      location_text: plan.location_text,
      lat: Number(plan.lat),
      lng: Number(plan.lng),
      creator: {
        first_name: creatorRow?.first_name ?? "Anonyme",
        photo_url: creatorRow?.photo_url ?? null,
      },
      participant_preview,
      is_joined: userId ? joined.has(plan.id) : false,
      is_creator: userId ? plan.creator_id === userId : false,
    };
  });

  return NextResponse.json({ plans: summaries });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const json = await req.json().catch(() => null);
  if (!json) return NextResponse.json({ error: "Body requis" }, { status: 400 });

  const parsed = CreatePlanSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const allowed = new Set<string>(ACTIVITIES.map((a) => a.id));
  if (!allowed.has(parsed.data.activity)) {
    return NextResponse.json({ error: "Activité invalide" }, { status: 400 });
  }

  // Guard: profil requis (sinon l’UI t’a renvoyé sur /login).
  if (!isSupabaseConfigured()) {
    const profile = mockGetProfile(userId);
    if (!profile) return NextResponse.json({ error: "Profil manquant" }, { status: 400 });

    const created = mockCreatePlan({
      creator_id: userId,
      activity: parsed.data.activity,
      start_time: parsed.data.start_time_iso,
      max_participants: parsed.data.max_participants,
      location_text: parsed.data.location_text,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    });
    return NextResponse.json(created);
  }

  const admin = getServerSupabaseAdmin();

  const { data: profileRow } = await admin.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!profileRow) return NextResponse.json({ error: "Profil manquant" }, { status: 400 });

  const { data: inserted, error } = await admin
    .from("plans")
    .insert({
      activity: parsed.data.activity,
      start_time: parsed.data.start_time_iso,
      max_participants: parsed.data.max_participants,
      location_text: parsed.data.location_text,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      creator_id: userId,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Erreur création" }, { status: 500 });
  if (!inserted?.id) return NextResponse.json({ error: "Erreur id" }, { status: 500 });

  // Le créateur est automatiquement participant.
  const planId = inserted.id as string;
  await admin.from("plan_participants").insert({ plan_id: planId, user_id: userId });

  return NextResponse.json({ id: planId });
}

