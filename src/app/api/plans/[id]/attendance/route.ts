import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockGetAttendanceByPlan, mockGetPlan, mockListProfilesByIds } from "@/lib/mock/mockDb";

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

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "plan id requis" }, { status: 400 });

  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    const plan = mockGetPlan(id);
    if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const rows = mockGetAttendanceByPlan(id);
    const userIds = rows.map((r) => r.user_id);
    const profiles = mockListProfilesByIds(userIds);
    const profileById = new Map(profiles.map((p) => [p.id, p]));
    return NextResponse.json({
      participants: rows.map((r) => {
        const p = profileById.get(r.user_id);
        return {
          user_id: r.user_id,
          first_name: p?.first_name ?? "Anonyme",
          photo_url: p?.photo_url ?? null,
          status: r.status,
        };
      }),
    });
  }

  const admin = getServerSupabaseAdmin();
  const { data: planRow } = await admin.from("plans").select("id").eq("id", id).maybeSingle();
  if (!planRow) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: participantRows, error: partErr } = await admin
    .from("plan_participants")
    .select("user_id")
    .eq("plan_id", id);
  if (partErr) return NextResponse.json({ error: "Participants indisponibles" }, { status: 500 });

  const { data: attendanceRows, error } = await admin
    .from("plan_attendance")
    .select("user_id,status,created_at,updated_at")
    .eq("plan_id", id);
  if (error) return NextResponse.json({ error: "Attendance indisponible" }, { status: 500 });

  const participantUserIds = ((participantRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
  const userIds = Array.from(new Set(participantUserIds));
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id,first_name,photo_url")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const profileById = new Map(
    ((profiles ?? []) as Array<{ user_id: string; first_name: string; photo_url: string | null }>).map((p) => [p.user_id, p])
  );

  const attendanceByUser = new Map(
    ((attendanceRows ?? []) as Array<{ user_id: string; status: "pending" | "confirmed" | "cancelled" | "maybe" }>).map((r) => [r.user_id, r.status])
  );

  return NextResponse.json({
    participants: participantUserIds.map((uid) => {
      const p = profileById.get(uid);
      return {
        user_id: uid,
        first_name: p?.first_name ?? "Anonyme",
        photo_url: p?.photo_url ?? null,
        status: (attendanceByUser.get(uid) ?? "pending") as "pending" | "confirmed" | "cancelled" | "maybe",
      };
    }),
  });
}
