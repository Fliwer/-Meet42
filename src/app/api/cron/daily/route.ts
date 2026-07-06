import { NextResponse, type NextRequest } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { sendEmail } from "@/lib/email/send";
import { emailReminder, emailPost42 } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

/**
 * Cron quotidien (07:30 UTC ≈ 9h30 Bruxelles) :
 * 1) RAPPEL jour J — plans rituels qui commencent dans les 12 h :
 *    « C'est aujourd'hui » à chaque membre.
 * 2) APRÈS-42 — plans rituels d'hier (fenêtre 3h-27h passées) :
 *    - écrit le graphe `encounters` (paires canoniques, idempotent) ;
 *    - envoie « Alors, ton 42 ? » (lien vers Belle rencontre).
 * La fenêtre quotidienne garantit qu'un plan n'est traité qu'une fois.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://meet42.app";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

type PlanRow = { id: string; start_time: string; location_text: string };

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, mock: true, note: "cron quotidien inactif en mock" });

  const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;
  const now = Date.now();
  const summary = { reminders: 0, post42: 0, encounters: 0 };

  // Helper : plans rituels dans une fenêtre temporelle (repli silencieux si
  // la colonne source n'existe pas encore → rien à traiter).
  async function ritualPlansBetween(fromIso: string, toIso: string): Promise<PlanRow[]> {
    const { data, error } = await admin
      .from("plans")
      .select("id, start_time, location_text")
      .eq("source", "ritual")
      .gte("start_time", fromIso)
      .lt("start_time", toIso);
    if (error) return [];
    return (data ?? []) as PlanRow[];
  }

  async function membersOf(planId: string): Promise<string[]> {
    const { data } = await admin.from("plan_participants").select("user_id").eq("plan_id", planId);
    return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
  }

  async function emailOf(userId: string): Promise<{ email: string | null; firstName: string }> {
    let email: string | null = null;
    try {
      const { data } = await admin.auth.admin.getUserById(userId);
      email = data?.user?.email ?? null;
    } catch {
      email = null;
    }
    const { data: p } = await admin.from("profiles").select("first_name").eq("user_id", userId).maybeSingle();
    return { email, firstName: (p?.first_name as string) ?? "toi" };
  }

  // ── 1) Rappels jour J ──
  const upcoming = await ritualPlansBetween(new Date(now).toISOString(), new Date(now + 12 * 3600 * 1000).toISOString());
  for (const plan of upcoming) {
    const timeLabel = new Intl.DateTimeFormat("fr-BE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Brussels",
    }).format(new Date(plan.start_time));
    for (const uid of await membersOf(plan.id)) {
      const { email, firstName } = await emailOf(uid);
      if (!email) continue;
      const tpl = emailReminder({ firstName, venueName: plan.location_text, timeLabel, planUrl: `${SITE}/plan/${plan.id}` });
      if (await sendEmail({ to: email, ...tpl })) summary.reminders++;
    }
  }

  // ── 2) Après-42 (hier) ──
  const past = await ritualPlansBetween(
    new Date(now - 27 * 3600 * 1000).toISOString(),
    new Date(now - 3 * 3600 * 1000).toISOString()
  );
  for (const plan of past) {
    const members = await membersOf(plan.id);

    // Le graphe : une ligne par paire (canonique a<b), idempotent
    const pairs: { plan_id: string; user_a: string; user_b: string; met_at: string }[] = [];
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const [a, b] = members[i] < members[j] ? [members[i], members[j]] : [members[j], members[i]];
        pairs.push({ plan_id: plan.id, user_a: a, user_b: b, met_at: plan.start_time });
      }
    }
    if (pairs.length > 0) {
      const { error } = await admin
        .from("encounters")
        .upsert(pairs, { onConflict: "plan_id,user_a,user_b", ignoreDuplicates: true });
      if (!error) summary.encounters += pairs.length;
    }

    for (const uid of members) {
      const { email, firstName } = await emailOf(uid);
      if (!email) continue;
      const tpl = emailPost42({ firstName, planUrl: `${SITE}/plan/${plan.id}` });
      if (await sendEmail({ to: email, ...tpl })) summary.post42++;
    }
  }

  return NextResponse.json({ ok: true, at: new Date(now).toISOString(), ...summary });
}
