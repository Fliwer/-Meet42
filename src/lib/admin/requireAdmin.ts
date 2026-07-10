import { type NextRequest } from "next/server";
import { getServerSupabaseWithAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin/isAdmin";

/**
 * Autorisation admin côté serveur : la session Supabase de l'appelant doit
 * correspondre à un e-mail admin. En local (mock, pas de Supabase), l'accès est
 * ouvert pour le dev.
 */
export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  if (!isSupabaseConfigured()) return true; // dev local

  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1] : null;
  if (!token) return false;

  try {
    const supabase = getServerSupabaseWithAccessToken(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return false;
    return isAdminEmail(data.user?.email);
  } catch {
    return false;
  }
}
