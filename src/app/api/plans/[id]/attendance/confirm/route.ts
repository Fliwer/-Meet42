import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockSetAttendanceStatus } from "@/lib/mock/mockDb";

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

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "plan id requis" }, { status: 400 });

  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    const res = mockSetAttendanceStatus(id, userId, "confirmed");
    if (!res.ok) return NextResponse.json({ error: "Tu dois rejoindre ce plan d’abord" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const admin = getServerSupabaseAdmin();
  const { data: joined } = await admin
    .from("plan_participants")
    .select("user_id")
    .eq("plan_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!joined) return NextResponse.json({ error: "Tu dois rejoindre ce plan d’abord" }, { status: 400 });

  const { error } = await admin.from("plan_attendance").upsert(
    {
      plan_id: id,
      user_id: userId,
      status: "confirmed",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "plan_id,user_id" }
  );
  if (error) return NextResponse.json({ error: "Impossible de confirmer la présence" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
