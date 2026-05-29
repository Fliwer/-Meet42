import type { PlanSummary } from "@/lib/plans/planTypes";

export type UrgencyBadge = { label: string; className: string };

/** Badges complémentaires (la rareté principale est “X spots left” sur la card). */
export function getPlanUrgencyBadges(plan: PlanSummary): UrgencyBadge[] {
  const out: UrgencyBadge[] = [];
  const spotsLeft = Math.max(0, plan.max_participants - plan.participants_count);
  const startMs = new Date(plan.start_time).getTime();
  const minToStart = (startMs - Date.now()) / 60000;

  if (spotsLeft === 1) {
    out.push({ label: "Presque complet", className: "bg-amber-100 text-amber-950 border-amber-300/80" });
  }
  if (minToStart > 0 && minToStart <= 120) {
    out.push({ label: "Bientôt le départ", className: "bg-rose-100 text-rose-950 border-rose-300/80" });
  }
  return out.slice(0, 2);
}
