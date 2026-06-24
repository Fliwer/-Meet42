import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockCountRecentEnvies, mockEnsureSeedAround } from "@/lib/mock/mockDb";

/** Agrégat de la demande récente (24h) pour la preuve sociale du panneau d'envie. */
export async function GET() {
  if (!isSupabaseConfigured()) {
    mockEnsureSeedAround(50.8466, 4.3528);
    return NextResponse.json({ count: mockCountRecentEnvies(24) });
  }

  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("envies")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  if (error) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: count ?? 0 });
}
