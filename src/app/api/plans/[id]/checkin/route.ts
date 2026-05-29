import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockGetCheckin, mockGetPlan, mockSetCheckin } from "@/lib/mock/mockDb";

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

const CheckinSchema = z.object({
  status: z.enum(["on_my_way", "arrived"]),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "plan id requis" }, { status: 400 });

  if (!isSupabaseConfigured()) {
    const row = mockGetCheckin(id, userId);
    return NextResponse.json({ checkin: row });
  }

  const admin = getServerSupabaseAdmin();
  const { data, error } = await admin
    .from("plan_checkins")
    .select("status,updated_at")
    .eq("plan_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Check-in indisponible (migration SQL à appliquer)" }, { status: 500 });
  return NextResponse.json({
    checkin: data ? { status: data.status as "on_my_way" | "arrived", updated_at: String(data.updated_at) } : null,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "plan id requis" }, { status: 400 });

  const parsed = CheckinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload invalide" }, { status: 400 });

  if (!isSupabaseConfigured()) {
    const plan = mockGetPlan(id);
    if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const res = mockSetCheckin(id, userId, parsed.data.status);
    if (!res.ok) return NextResponse.json({ error: "Tu dois rejoindre le plan avant le check-in" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const admin = getServerSupabaseAdmin();
  const { data: joined } = await admin
    .from("plan_participants")
    .select("user_id")
    .eq("plan_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!joined) return NextResponse.json({ error: "Tu dois rejoindre le plan avant le check-in" }, { status: 400 });

  const { error } = await admin.from("plan_checkins").upsert(
    {
      plan_id: id,
      user_id: userId,
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "plan_id,user_id" }
  );
  if (error) return NextResponse.json({ error: "Check-in indisponible (migration SQL à appliquer)" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
