import { getServerSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { mockGetPlan, mockCountParticipants } from "@/lib/mock/mockDb";
import { ACTIVITIES } from "@/lib/plans/activities";

export type PlanMeta = {
  activityLabel: string;
  activityEmoji: string;
  start_time: string;
  location_text: string;
  participants_count: number;
  max_participants: number;
};

/**
 * Lecture serveur minimale d'un plan pour les metadata / images OpenGraph.
 * Ne renvoie jamais d'infos personnelles (pas de noms, pas de photos).
 */
export async function getPlanForMeta(planId: string): Promise<PlanMeta | null> {
  try {
    if (!isSupabaseConfigured()) {
      const plan = mockGetPlan(planId);
      if (!plan) return null;
      return withActivity({
        activity: plan.activity,
        start_time: plan.start_time,
        location_text: plan.location_text,
        participants_count: mockCountParticipants(planId),
        max_participants: plan.max_participants,
      });
    }

    const admin = getServerSupabaseAdmin();
    const { data: plan } = await admin
      .from("plans")
      .select("activity, start_time, location_text, max_participants")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) return null;

    const { count } = await admin
      .from("plan_participants")
      .select("plan_id", { count: "exact", head: true })
      .eq("plan_id", planId);

    return withActivity({
      activity: plan.activity as string,
      start_time: plan.start_time as string,
      location_text: plan.location_text as string,
      participants_count: count ?? 0,
      max_participants: plan.max_participants as number,
    });
  } catch {
    return null;
  }
}

function withActivity(p: {
  activity: string;
  start_time: string;
  location_text: string;
  participants_count: number;
  max_participants: number;
}): PlanMeta {
  const act = ACTIVITIES.find((a) => a.id === p.activity);
  return {
    activityLabel: act?.label ?? "Sortie",
    activityEmoji: act?.emoji ?? "✨",
    start_time: p.start_time,
    location_text: p.location_text,
    participants_count: p.participants_count,
    max_participants: p.max_participants,
  };
}

/** « ce soir 19:00 », « sam. 5 juil. 19:00 »… en heure de Bruxelles. */
export function formatStartFr(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-BE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Brussels",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
