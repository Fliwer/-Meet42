/**
 * Matcher « Envie → Groupe ».
 * Logique pure (testable, sans I/O) : à partir des envies en attente, forme un
 * groupe de 4 à 6 personnes compatibles (même moment + même coin + activité
 * commune) autour d'une nouvelle envie, et calcule les champs du plan à créer.
 */

export type EnvieRow = {
  id: string;
  user_id: string;
  activities: string[];
  when_slot: string;
  commune: string;
};

export const GROUP_MIN = 4;
export const GROUP_MAX = 6;

export const COMMUNE_CENTERS: Record<string, { lat: number; lng: number; label: string }> = {
  ixelles: { lat: 50.8333, lng: 4.3667, label: "Ixelles" },
  "bruxelles-centre": { lat: 50.8466, lng: 4.3528, label: "Bruxelles-Centre" },
  "saint-gilles": { lat: 50.827, lng: 4.345, label: "Saint-Gilles" },
  etterbeek: { lat: 50.837, lng: 4.389, label: "Etterbeek" },
  forest: { lat: 50.812, lng: 4.322, label: "Forest" },
};

export type Match = {
  activity: string;
  when_slot: string;
  commune: string;
  userIds: string[];
  envieIds: string[];
};

/** Cherche un groupe de 4 à 6 personnes compatibles autour de l'envie `target`. */
export function pickMatch(envies: EnvieRow[], target: EnvieRow): Match | null {
  // Même créneau + même commune
  const bucket = envies.filter((e) => e.when_slot === target.when_slot && e.commune === target.commune);

  // Parmi les activités voulues par `target`, on prend celle qui rassemble le plus de monde
  let best: { activity: string; rows: EnvieRow[] } | null = null;
  for (const act of target.activities) {
    const rows = bucket.filter((e) => e.activities.includes(act));
    if (!best || rows.length > best.rows.length) best = { activity: act, rows };
  }
  if (!best || best.rows.length < GROUP_MIN) return null;

  // Dédoublonne par utilisateur, plafonne à 6
  const seen = new Set<string>();
  const userIds: string[] = [];
  const envieIds: string[] = [];
  for (const e of best.rows) {
    if (seen.has(e.user_id)) continue;
    seen.add(e.user_id);
    userIds.push(e.user_id);
    envieIds.push(e.id);
    if (userIds.length >= GROUP_MAX) break;
  }
  if (userIds.length < GROUP_MIN) return null;

  return { activity: best.activity, when_slot: target.when_slot, commune: target.commune, userIds, envieIds };
}

/** Transforme un créneau en heure de RDV concrète. */
export function whenSlotToStartIso(slot: string): string {
  const d = new Date();
  d.setSeconds(0, 0);
  if (slot === "weekend") {
    const day = d.getDay();
    const add = (6 - day + 7) % 7 || 7; // prochain samedi
    d.setDate(d.getDate() + add);
    d.setHours(19, 0, 0, 0);
  } else if (slot === "week") {
    d.setDate(d.getDate() + 3);
    d.setHours(19, 0, 0, 0);
  } else {
    // tonight
    d.setHours(19, 0, 0, 0);
    if (d.getTime() < Date.now() + 30 * 60 * 1000) d.setTime(Date.now() + 90 * 60 * 1000);
  }
  return d.toISOString();
}

/** Champs du plan à créer à partir d'un match. */
export function planFieldsFromMatch(match: Match) {
  const center = COMMUNE_CENTERS[match.commune] ?? COMMUNE_CENTERS["bruxelles-centre"];
  return {
    activity: match.activity,
    start_time: whenSlotToStartIso(match.when_slot),
    max_participants: Math.max(GROUP_MIN, Math.min(GROUP_MAX, match.userIds.length)),
    location_text: `À confirmer ensemble · ${center.label}`,
    lat: center.lat,
    lng: center.lng,
    creator_id: match.userIds[0],
    participant_ids: match.userIds,
  };
}
