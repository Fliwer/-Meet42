import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { profilePhotoUrlsSchema } from "@/lib/profile/photoUrlSchema";
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
  photo_urls: profilePhotoUrlsSchema,
  // La bio est optionnelle (retirée de la création — dispo en édition)
  bio: z.string().max(240).optional().default(""),
  interests: z.array(z.string().min(1).max(30)).max(12).optional(),
});

function jsonProfileFromMock(p: NonNullable<ReturnType<typeof mockGetProfile>>) {
  const urls = p.photo_urls?.filter((u) => u.trim()) ?? (p.photo_url ? [p.photo_url] : []);
  return {
    id: p.id,
    first_name: p.first_name,
    age: p.age,
    photo_url: p.photo_url ?? urls[0] ?? null,
    photo_urls: urls,
    bio: p.bio,
    interests: p.interests ?? [],
  };
}

export async function GET(req: NextRequest) {
  mockEnsureSeedAround(50.8466, 4.3528);

  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    const profile = mockGetProfile(userId);
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    return NextResponse.json(jsonProfileFromMock(profile));
  }

  const admin = getServerSupabaseAdmin();
  const { data, error } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) return NextResponse.json({ error: "Erreur profil" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  const raw = data.photo_urls as unknown;
  let urls: string[] = [];
  if (Array.isArray(raw)) {
    urls = raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
  }
  if (urls.length === 0 && data.photo_url) {
    urls = [data.photo_url as string];
  }

  const interestsRaw = (data as Record<string, unknown>).interests;
  const interests = Array.isArray(interestsRaw)
    ? interestsRaw.filter((i): i is string => typeof i === "string")
    : [];

  return NextResponse.json({
    id: data.user_id,
    first_name: data.first_name,
    age: data.age,
    photo_url: (data.photo_url as string | null) ?? urls[0] ?? null,
    photo_urls: urls,
    bio: data.bio,
    interests,
  });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const payload = ProfilePayloadSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const photo_urls = payload.data.photo_urls.map((u) => u.trim());
  const interests = (payload.data.interests ?? []).map((i) => i.trim()).filter(Boolean);

  if (!isSupabaseConfigured()) {
    mockUpsertProfile({
      id: userId,
      first_name: payload.data.first_name,
      age: payload.data.age,
      photo_urls,
      bio: payload.data.bio.trim() || null,
      interests,
    });
    return NextResponse.json({ ok: true });
  }

  // Cast souple : database.types.ts ne contient pas encore `interests`.
  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;
  // interests peut manquer si la migration n'est pas encore appliquée → on
  // réessaie sans la colonne plutôt que d'échouer.
  const base = {
    user_id: userId,
    first_name: payload.data.first_name,
    age: payload.data.age,
    photo_url: photo_urls[0],
    photo_urls,
    bio: payload.data.bio.trim() || null,
  };
  let error = (await admin.from("profiles").upsert({ ...base, interests }, { onConflict: "user_id" })).error;
  if (error) {
    error = (await admin.from("profiles").upsert(base, { onConflict: "user_id" })).error;
  }

  if (error) return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
