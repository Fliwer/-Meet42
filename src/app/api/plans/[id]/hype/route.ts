import { NextResponse, type NextRequest } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockToggleHype, mockIsUserJoined } from "@/lib/mock/mockDb";

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

/** Toggle « J'ai hâte », réservé aux membres du groupe. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: planId } = await ctx.params;
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    if (!mockIsUserJoined(planId, userId)) return NextResponse.json({ error: "Non membre" }, { status: 403 });
    const hyped = mockToggleHype(planId, userId);
    return NextResponse.json({ ok: true, hyped });
  }

  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;
  const { data: member } = await admin
    .from("plan_participants")
    .select("user_id")
    .eq("plan_id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Non membre" }, { status: 403 });

  const { data: existing } = await admin
    .from("plan_hype")
    .select("user_id")
    .eq("plan_id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await admin.from("plan_hype").delete().eq("plan_id", planId).eq("user_id", userId);
    return NextResponse.json({ ok: true, hyped: false });
  }
  await admin.from("plan_hype").insert({ plan_id: planId, user_id: userId });
  return NextResponse.json({ ok: true, hyped: true });
}
