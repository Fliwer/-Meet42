import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  mockGetProfile,
  mockUpsertProfile,
  mockEnsureSeedAround,
} from "@/lib/mock/mockDb";

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const xUserId = req.headers.get("x-user-id");
  const accessToken = getBearerToken(req);

  if (!isSupabaseConfigured()) {
    return xUserId ?? null;
  }

  if (!accessToken) return null;

  const supabase = getServerSupabaseWithAccessToken(accessToken);
  const { data, error } = await supabase.auth.getUser();
  if (error) return xUserId ?? null;
  return data.user?.id ?? xUserId ?? null;
}

const ProfilePayloadSchema = z.object({
  first_name: z.string().min(1).max(40),
  age: z.number().int().min(18).max(99),
  // On accepte "" pour simplifier l’UI, et on convertit en `null` côté stockage.
  photo_url: z.union([z.string().url(), z.literal("")]).optional(),
  bio: z.union([z.string().max(240), z.literal("")]).optional(),
});

export async function GET(req: NextRequest) {
  // Seed cold-start mock so login users can still create / see plans later.
  mockEnsureSeedAround(50.8466, 4.3528);

  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    const profile = mockGetProfile(userId);
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    return NextResponse.json(profile);
  }

  const admin = getServerSupabaseAdmin();
  const { data, error } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) return NextResponse.json({ error: "Erreur profil" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  return NextResponse.json({
    id: data.user_id,
    first_name: data.first_name,
    age: data.age,
    photo_url: data.photo_url,
    bio: data.bio,
  });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const payload = ProfilePayloadSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    mockUpsertProfile({
      id: userId,
      first_name: payload.data.first_name,
      age: payload.data.age,
      photo_url: payload.data.photo_url ? (payload.data.photo_url === "" ? null : payload.data.photo_url) : null,
      bio: payload.data.bio ? (payload.data.bio === "" ? null : payload.data.bio) : null,
    });
    return NextResponse.json({ ok: true });
  }

  const admin = getServerSupabaseAdmin();
  const { error } = await admin
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        first_name: payload.data.first_name,
        age: payload.data.age,
        photo_url: payload.data.photo_url ? (payload.data.photo_url === "" ? null : payload.data.photo_url) : null,
        bio: payload.data.bio ? (payload.data.bio === "" ? null : payload.data.bio) : null,
      },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

