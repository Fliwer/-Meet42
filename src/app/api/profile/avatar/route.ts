import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabaseAdmin, getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

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

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Format accepté : JPG, PNG ou WebP" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image trop lourde (max 2 Mo)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path = `${userId}/${Date.now()}.${ext}`;

  if (!isSupabaseConfigured()) {
    const b64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${b64}`;
    if (dataUrl.length > 2_300_000) {
      return NextResponse.json({ error: "Image trop lourde pour le mode hors ligne" }, { status: 400 });
    }
    return NextResponse.json({ photo_url: dataUrl });
  }

  const admin = getServerSupabaseAdmin();
  const { error: upErr } = await admin.storage.from("avatars").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (upErr) {
    console.error("[avatar upload]", upErr);
    return NextResponse.json(
      {
        error:
          "Échec de l’upload. Crée un bucket public « avatars » dans Supabase (Storage) ou réessaie.",
      },
      { status: 500 }
    );
  }

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  return NextResponse.json({ photo_url: pub.publicUrl });
}
