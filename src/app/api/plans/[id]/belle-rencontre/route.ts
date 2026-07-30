import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockAddBelle, mockRemoveBelle, mockIsUserJoined } from "@/lib/mock/mockDb";

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

const BodySchema = z.object({
  to_user: z.string().min(1),
  keep: z.boolean().default(true),
});

/**
 * « Belle rencontre », marque (ou retire) l'intention de recroiser un membre
 * du groupe. Double opt-in strict : la mutualité n'est jamais révélée ici,
 * seulement calculée plus tard côté /group. Aucune notification à l'autre.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: planId } = await ctx.params;
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const { to_user, keep } = parsed.data;
  if (to_user === userId) return NextResponse.json({ error: "Impossible" }, { status: 400 });

  // ── Mock ──
  if (!isSupabaseConfigured()) {
    if (!mockIsUserJoined(planId, userId) || !mockIsUserJoined(planId, to_user)) {
      return NextResponse.json({ error: "Hors groupe" }, { status: 403 });
    }
    if (keep) mockAddBelle(userId, to_user, planId);
    else mockRemoveBelle(userId, to_user);
    return NextResponse.json({ ok: true, kept: keep });
  }

  // ── Réel : les deux doivent être membres du plan ──
  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;
  const { data: members } = await admin
    .from("plan_participants")
    .select("user_id")
    .eq("plan_id", planId)
    .in("user_id", [userId, to_user]);
  const ids = new Set(((members ?? []) as { user_id: string }[]).map((r) => r.user_id));
  if (!ids.has(userId) || !ids.has(to_user)) return NextResponse.json({ error: "Hors groupe" }, { status: 403 });

  if (keep) {
    await admin
      .from("belles_rencontres")
      .upsert({ from_user: userId, to_user, plan_id: planId }, { onConflict: "from_user,to_user" });
  } else {
    await admin.from("belles_rencontres").delete().eq("from_user", userId).eq("to_user", to_user);
  }
  return NextResponse.json({ ok: true, kept: keep });
}
