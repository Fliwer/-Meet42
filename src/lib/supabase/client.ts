import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  // In the browser, Supabase persists session automatically (localStorage).
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function isSupabaseAdminConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);
}

export function getServerSupabaseAdmin(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Supabase admin manquant (SUPABASE_SERVICE_ROLE_KEY)");
  }

  // Service role = bypass RLS côté serveur (utile pour le MVP).
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
}

export function getServerSupabaseWithAccessToken(accessToken: string): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase manquant: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // On “imite” l’appel d’un client authentifié en envoyant l’access token en header.
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

