import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/** Santé du déploiement (monitoring, uptime). */
export function GET() {
  return NextResponse.json({
    ok: true,
    supabase: isSupabaseConfigured(),
    timestamp: new Date().toISOString(),
  });
}
