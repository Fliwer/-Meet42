import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockAddEnvie, mockGetEnvies, mockDeleteEnvies, mockFormGroupPlan } from "@/lib/mock/mockDb";
import { pickMatch, planFieldsFromMatch, type EnvieRow } from "@/lib/match/matcher";

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

const EnvieSchema = z.object({
  activities: z.array(z.string()).min(1).max(11),
  when_slot: z.enum(["tonight", "weekend", "week"]),
  commune: z.string().min(1).max(40),
});

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = EnvieSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // ── Mode mock (démo locale) ──
  if (!isSupabaseConfigured()) {
    const created = mockAddEnvie({ user_id: userId, ...parsed.data });
    const match = pickMatch(mockGetEnvies(), created);
    if (match) {
      const planId = mockFormGroupPlan(planFieldsFromMatch(match));
      mockDeleteEnvies(match.envieIds);
      return NextResponse.json({ ok: true, matched: true, planId });
    }
    return NextResponse.json({ ok: true, matched: false });
  }

  // ── Mode réel (Supabase) ──
  // database.types.ts ne contient pas encore `envies` (types à régénérer après
  // application de la migration). On caste en client souple en attendant.
  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;
  const { data: inserted, error } = await admin
    .from("envies")
    .insert({
      user_id: userId,
      activities: parsed.data.activities,
      when_slot: parsed.data.when_slot,
      commune: parsed.data.commune,
    })
    .select("id, user_id, activities, when_slot, commune")
    .single();
  if (error || !inserted) return NextResponse.json({ error: "Impossible d'enregistrer ton envie" }, { status: 500 });

  // On regarde si l'arrivée de cette envie forme un groupe (4-6 compatibles)
  const { data: pending } = await admin.from("envies").select("id, user_id, activities, when_slot, commune");
  const match = pickMatch((pending ?? []) as EnvieRow[], inserted as EnvieRow);
  if (!match) return NextResponse.json({ ok: true, matched: false });

  const fields = planFieldsFromMatch(match);
  const { data: plan, error: planErr } = await admin
    .from("plans")
    .insert({
      activity: fields.activity,
      start_time: fields.start_time,
      max_participants: fields.max_participants,
      location_text: fields.location_text,
      lat: fields.lat,
      lng: fields.lng,
      creator_id: fields.creator_id,
    })
    .select("id")
    .single();
  if (planErr || !plan) return NextResponse.json({ ok: true, matched: false });

  const planId = (plan as { id: string }).id;
  // Inscrit les participants + leur présence, puis consomme les envies du groupe.
  await admin.from("plan_participants").insert(fields.participant_ids.map((uid) => ({ plan_id: planId, user_id: uid })));
  await admin.from("plan_attendance").insert(fields.participant_ids.map((uid) => ({ plan_id: planId, user_id: uid, status: "confirmed" })));
  await admin.from("envies").delete().in("id", match.envieIds);

  return NextResponse.json({ ok: true, matched: true, planId });
}
