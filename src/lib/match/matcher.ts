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

// ───────────────────────────────────────────────────────────────────────────
// Filet anti cold-start : tant que la demande est faible, une envie ne forme
// presque jamais un groupe de 4 d'un coup. Plutôt que de la laisser dans le
// vide, on la fait REJOINDRE un plan compatible en formation, ou GRAINER un
// nouveau plan que d'autres (et les futures envies) rempliront.
// ───────────────────────────────────────────────────────────────────────────

export type JoinablePlanRow = {
  id: string;
  activity: string;
  start_time: string;
  max_participants: number;
  lat: number;
  lng: number;
};

function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Fenêtre temporelle (offset depuis maintenant) acceptée pour un créneau. */
function slotWindowMs(slot: string): { min: number; max: number } {
  const H = 3600 * 1000;
  if (slot === "weekend") return { min: 24 * H, max: 10 * 24 * H };
  if (slot === "week") return { min: 0, max: 6 * 24 * H };
  return { min: 0, max: 16 * H }; // tonight
}

const JOIN_RADIUS_KM = 2.5;

/**
 * Cherche un plan déjà ouvert que cette envie peut rejoindre : même activité,
 * proche de la commune visée, dans la bonne fenêtre temporelle, pas complet.
 * On privilégie le plan le plus rempli (le plus proche d'un vrai groupe).
 */
export function pickJoinablePlan(
  plans: JoinablePlanRow[],
  envie: EnvieRow,
  countOf: (planId: string) => number
): JoinablePlanRow | null {
  const center = COMMUNE_CENTERS[envie.commune] ?? COMMUNE_CENTERS["bruxelles-centre"];
  const now = Date.now();
  const win = slotWindowMs(envie.when_slot);

  const candidates = plans.filter((p) => {
    if (!envie.activities.includes(p.activity)) return false;
    const t = new Date(p.start_time).getTime();
    if (t < now + win.min || t > now + win.max) return false;
    if (countOf(p.id) >= p.max_participants) return false;
    if (kmBetween(p.lat, p.lng, center.lat, center.lng) > JOIN_RADIUS_KM) return false;
    return true;
  });

  candidates.sort((a, b) => {
    const fa = countOf(a.id);
    const fb = countOf(b.id);
    if (fb !== fa) return fb - fa; // le plus rempli d'abord
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  return candidates[0] ?? null;
}

/** Champs d'un plan « graine » créé à partir d'une seule envie. */
export function planFieldsFromEnvie(envie: EnvieRow) {
  const center = COMMUNE_CENTERS[envie.commune] ?? COMMUNE_CENTERS["bruxelles-centre"];
  return {
    activity: envie.activities[0],
    start_time: whenSlotToStartIso(envie.when_slot),
    max_participants: GROUP_MAX,
    location_text: `À confirmer ensemble · ${center.label}`,
    lat: center.lat,
    lng: center.lng,
    creator_id: envie.user_id,
    participant_ids: [envie.user_id],
  };
}
