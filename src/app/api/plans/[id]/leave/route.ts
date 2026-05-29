import { NextResponse, type NextRequest } from "next/server";
import { canCancelOrLeaveBeforeStart } from "@/lib/plans/cancellation";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockGetPlan, mockGetProfile, mockLeavePlan } from "@/lib/mock/mockDb";

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

const MSG_LATE =
  "Annulation ou retrait possible uniquement jusqu’à 24 h avant le début du plan.";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const planId = id;
  if (!planId) return NextResponse.json({ error: "plan id requis" }, { status: 400 });

  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    const profile = mockGetProfile(userId);
    if (!profile) return NextResponse.json({ error: "Profil manquant" }, { status: 400 });

    await req.json().catch(() => ({}));
    const plan = mockGetPlan(planId);
    if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const res = mockLeavePlan(planId, userId);
    if (!res.ok) {
      if (res.reason === "TOO_LATE") return NextResponse.json({ error: MSG_LATE }, { status: 403 });
      if (res.reason === "NOT_JOINED") return NextResponse.json({ error: "Tu ne participes pas à ce plan" }, { status: 400 });
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const admin = getServerSupabaseAdmin();

  const { data: profileRow } = await admin.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!profileRow) return NextResponse.json({ error: "Profil manquant" }, { status: 400 });

  const { data: planRow, error: planErr } = await admin.from("plans").select("*").eq("id", planId).maybeSingle();
  if (planErr) return NextResponse.json({ error: "Erreur plan" }, { status: 500 });
  if (!planRow) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const typed = planRow as { start_time: string; creator_id: string };
  if (!canCancelOrLeaveBeforeStart(typed.start_time)) {
    return NextResponse.json({ error: MSG_LATE }, { status: 403 });
  }

  const { data: partRow } = await admin
    .from("plan_participants")
    .select("user_id")
    .eq("plan_id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!partRow) return NextResponse.json({ error: "Tu ne participes pas à ce plan" }, { status: 400 });

  if (typed.creator_id === userId) {
    const { error: delErr } = await admin.from("plans").delete().eq("id", planId);
    if (delErr) return NextResponse.json({ error: "Impossible d’annuler le plan" }, { status: 500 });
  } else {
    const { error: leaveErr } = await admin.from("plan_participants").delete().eq("plan_id", planId).eq("user_id", userId);
    if (leaveErr) return NextResponse.json({ error: "Impossible de te retirer" }, { status: 500 });
    await admin.from("plan_attendance").delete().eq("plan_id", planId).eq("user_id", userId);
  }

  return NextResponse.json({ ok: true });
}
