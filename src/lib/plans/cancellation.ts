/** Délai minimum avant le début du plan pour annuler ou se retirer (24 h). */
export const CANCELLATION_MIN_LEAD_MS = 24 * 60 * 60 * 1000;

export function canCancelOrLeaveBeforeStart(startTimeIso: string, nowMs: number = Date.now()): boolean {
  const start = new Date(startTimeIso).getTime();
  if (!Number.isFinite(start)) return false;
  return start - nowMs >= CANCELLATION_MIN_LEAD_MS;
}

export const CANCELLATION_POLICY_FR =
  "Tu peux annuler ou te retirer au plus tard 24 h avant l’heure du plan. Après ce délai, le groupe compte sur toi.";
