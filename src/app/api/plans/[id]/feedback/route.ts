import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockGetPlan, mockGetPlanFeedback, mockSetPlanFeedback } from "@/lib/mock/mockDb";

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

const FeedbackSchema = z.object({
  would_rejoin: z.boolean(),
  comment: z.string().max(160).optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "plan id requis" }, { status: 400 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ feedback: mockGetPlanFeedback(id, userId) });
  }

  const admin = getServerSupabaseAdmin();
  const { data, error } = await admin
    .from("plan_feedback")
    .select("would_rejoin,comment,created_at")
    .eq("plan_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Feedback indisponible (migration SQL à appliquer)" }, { status: 500 });
  return NextResponse.json({
    feedback: data
      ? {
          would_rejoin: Boolean(data.would_rejoin),
          comment: typeof data.comment === "string" ? data.comment : null,
          created_at: String(data.created_at),
        }
      : null,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "plan id requis" }, { status: 400 });

  const parsed = FeedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  const comment = parsed.data.comment?.trim() ? parsed.data.comment.trim() : null;

  if (!isSupabaseConfigured()) {
    const plan = mockGetPlan(id);
    if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const planStart = new Date(plan.start_time).getTime();
    if (Date.now() < planStart - 30 * 60 * 1000) {
      return NextResponse.json({ error: "Feedback disponible juste après l’activité" }, { status: 400 });
    }
    const res = mockSetPlanFeedback(id, userId, { would_rejoin: parsed.data.would_rejoin, comment });
    if (!res.ok) return NextResponse.json({ error: "Tu dois rejoindre le plan avant de noter" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const admin = getServerSupabaseAdmin();
  const { data: planRow } = await admin.from("plans").select("start_time").eq("id", id).maybeSingle();
  if (!planRow) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: joined } = await admin
    .from("plan_participants")
    .select("user_id")
    .eq("plan_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!joined) return NextResponse.json({ error: "Tu dois rejoindre le plan avant de noter" }, { status: 400 });

  const planStart = new Date(String((planRow as { start_time: string }).start_time)).getTime();
  if (Date.now() < planStart - 30 * 60 * 1000) {
    return NextResponse.json({ error: "Feedback disponible juste après l’activité" }, { status: 400 });
  }

  const { error } = await admin.from("plan_feedback").upsert(
    {
      plan_id: id,
      user_id: userId,
      would_rejoin: parsed.data.would_rejoin,
      comment,
      created_at: new Date().toISOString(),
    },
    { onConflict: "plan_id,user_id" }
  );
  if (error) return NextResponse.json({ error: "Feedback indisponible (migration SQL à appliquer)" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
