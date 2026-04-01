import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  mockGetPlan,
  mockJoinPlan,
  mockGetProfile,
  mockCountParticipants,
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

const JoinSchema = z.object({});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const planId = id;
  if (!planId) return NextResponse.json({ error: "plan id requis" }, { status: 400 });

  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    const profile = mockGetProfile(userId);
    if (!profile) return NextResponse.json({ error: "Profil manquant" }, { status: 400 });

    JoinSchema.parse(await req.json().catch(() => ({})));
    const plan = mockGetPlan(planId);
    if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const participants_count_before = mockCountParticipants(planId);
    const res = mockJoinPlan(planId, userId);
    if (!res.ok && res.reason === "FULL") return NextResponse.json({ error: "Plan complet" }, { status: 409 });
    return NextResponse.json({ ok: true, participants_count: participants_count_before });
  }

  const admin = getServerSupabaseAdmin();

  const { data: profileRow } = await admin.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!profileRow) return NextResponse.json({ error: "Profil manquant" }, { status: 400 });

  const { data: planRow } = await admin.from("plans").select("*").eq("id", planId).maybeSingle();
  if (!planRow) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const max_participants = (planRow as { max_participants: number }).max_participants;

  const alreadyRow = await admin
    .from("plan_participants")
    .select("user_id")
    .eq("plan_id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (alreadyRow.data) return NextResponse.json({ ok: true });

  const { data: participantRows } = await admin.from("plan_participants").select("user_id").eq("plan_id", planId);
  const currentCount = (participantRows ?? []).length;
  if (currentCount >= max_participants) return NextResponse.json({ error: "Plan complet" }, { status: 409 });

  await admin.from("plan_participants").insert({ plan_id: planId, user_id: userId });
  return NextResponse.json({ ok: true });
}

