import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  mockAddEnvie,
  mockGetEnvies,
  mockDeleteEnvies,
  mockFormGroupPlan,
  mockListPlans,
  mockCountParticipants,
  mockJoinPlan,
  mockCreatePlan,
} from "@/lib/mock/mockDb";
import {
  pickMatch,
  pickJoinablePlan,
  planFieldsFromMatch,
  planFieldsFromEnvie,
  type EnvieRow,
  type JoinablePlanRow,
} from "@/lib/match/matcher";

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

    // 1) Un groupe complet (4-6) se forme-t-il d'un coup ?
    const match = pickMatch(mockGetEnvies(), created);
    if (match) {
      const planId = mockFormGroupPlan(planFieldsFromMatch(match));
      mockDeleteEnvies(match.envieIds);
      return NextResponse.json({ ok: true, matched: true, state: "formed", planId });
    }

    // 2) Sinon : rejoindre un plan en formation compatible ?
    const plans = mockListPlans().plans as JoinablePlanRow[];
    const joinable = pickJoinablePlan(plans, created, (pid) => mockCountParticipants(pid));
    if (joinable) {
      mockJoinPlan(joinable.id, userId);
      mockDeleteEnvies([created.id]);
      return NextResponse.json({ ok: true, matched: false, state: "joined", planId: joinable.id });
    }

    // 3) Sinon : grainer un nouveau plan que d'autres rempliront.
    const seed = planFieldsFromEnvie(created);
    const { id } = mockCreatePlan(seed);
    mockDeleteEnvies([created.id]);
    return NextResponse.json({ ok: true, matched: false, state: "seeded", planId: id });
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

  const insertedRow = inserted as EnvieRow;

  // Helper : crée un plan + inscrit les participants (FK profiles(user_id)).
  async function createPlanWithParticipants(fields: ReturnType<typeof planFieldsFromMatch>) {
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
    if (planErr || !plan) return null;
    const planId = (plan as { id: string }).id;
    await admin.from("plan_participants").insert(fields.participant_ids.map((uid) => ({ plan_id: planId, user_id: uid })));
    await admin
      .from("plan_attendance")
      .insert(fields.participant_ids.map((uid) => ({ plan_id: planId, user_id: uid, status: "confirmed" })));
    return planId;
  }

  // 1) Un groupe complet (4-6) se forme-t-il d'un coup ?
  const { data: pending } = await admin.from("envies").select("id, user_id, activities, when_slot, commune");
  const match = pickMatch((pending ?? []) as EnvieRow[], insertedRow);
  if (match) {
    const planId = await createPlanWithParticipants(planFieldsFromMatch(match));
    if (planId) {
      await admin.from("envies").delete().in("id", match.envieIds);
      return NextResponse.json({ ok: true, matched: true, state: "formed", planId });
    }
  }

  // Garde-fou : participer à un plan exige un profil (contrainte FK). Sans
  // profil, on garde l'envie en attente plutôt que de créer un plan cassé.
  const { data: profile } = await admin.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!profile) return NextResponse.json({ ok: true, matched: false, state: "pending" });

  // 2) Sinon : rejoindre un plan en formation compatible ?
  const { data: openPlans } = await admin
    .from("plans")
    .select("id, activity, start_time, max_participants, lat, lng")
    .gte("start_time", new Date().toISOString());
  const { data: parts } = await admin.from("plan_participants").select("plan_id");
  const counts = new Map<string, number>();
  for (const row of (parts ?? []) as { plan_id: string }[]) {
    counts.set(row.plan_id, (counts.get(row.plan_id) ?? 0) + 1);
  }
  const joinable = pickJoinablePlan(
    (openPlans ?? []) as JoinablePlanRow[],
    insertedRow,
    (pid) => counts.get(pid) ?? 0
  );
  if (joinable) {
    await admin.from("plan_participants").insert({ plan_id: joinable.id, user_id: userId });
    await admin.from("plan_attendance").insert({ plan_id: joinable.id, user_id: userId, status: "confirmed" });
    await admin.from("envies").delete().eq("id", insertedRow.id);
    return NextResponse.json({ ok: true, matched: false, state: "joined", planId: joinable.id });
  }

  // 3) Sinon : grainer un nouveau plan que d'autres rempliront.
  const seedId = await createPlanWithParticipants(planFieldsFromEnvie(insertedRow));
  if (seedId) {
    await admin.from("envies").delete().eq("id", insertedRow.id);
    return NextResponse.json({ ok: true, matched: false, state: "seeded", planId: seedId });
  }

  return NextResponse.json({ ok: true, matched: false, state: "pending" });
}
