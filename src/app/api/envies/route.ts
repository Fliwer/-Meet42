import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockAddEnvie } from "@/lib/mock/mockDb";

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

  if (!isSupabaseConfigured()) {
    mockAddEnvie({ user_id: userId, ...parsed.data });
    return NextResponse.json({ ok: true });
  }

  // database.types.ts ne contient pas encore `envies` (types à régénérer après
  // application de la migration). On caste en client souple en attendant.
  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;
  const { error } = await admin.from("envies").insert({
    user_id: userId,
    activities: parsed.data.activities,
    when_slot: parsed.data.when_slot,
    commune: parsed.data.commune,
  });
  if (error) return NextResponse.json({ error: "Impossible d'enregistrer ton envie" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
