/**
 * Les rituels Meet42, créneaux hebdo fixes qui concentrent la demande
 * (mécanisme de liquidité, backstage ; la marque vend « ton 42 », pas le jeudi).
 * Lancement : 2 rituels, 1 commune (Ixelles), la densité avant l'étendue.
 *
 * Logique pure, testable, sans I/O.
 */

export type Ritual = {
  id: string;
  /** Nom éditorial affiché (« L'apéro du jeudi ») */
  label: string;
  /** Accroche courte sous le titre */
  tagline: string;
  activity: string;
  emoji: string;
  /** 0 = dimanche … 6 = samedi (convention JS getDay) */
  weekday: number;
  /** Heure locale Bruxelles */
  hour: number;
  minute: number;
  commune: string;
  communeLabel: string;
  lat: number;
  lng: number;
};

export const RITUALS: Ritual[] = [
  {
    id: "jeudi-jeux",
    label: "La soirée jeux du jeudi",
    tagline: "Escape game, arcade, défis à relever ensemble. L'adrénaline en groupe.",
    activity: "escape",
    emoji: "🧩",
    weekday: 4,
    hour: 19,
    minute: 30,
    commune: "bruxelles-centre",
    communeLabel: "Bruxelles-Centre",
    lat: 50.848,
    lng: 4.3577,
  },
  {
    id: "lundi-billard",
    label: "Le billard du lundi",
    tagline: "Quelques parties, une ambiance feutrée. Facile, même sans savoir jouer.",
    activity: "billiard",
    emoji: "🎱",
    weekday: 1,
    hour: 19,
    minute: 30,
    commune: "ixelles",
    communeLabel: "Ixelles",
    lat: 50.8326,
    lng: 4.3604,
  },
  {
    id: "mardi-bowling",
    label: "Le bowling du mardi",
    tagline: "Strikes, gouttières et fous rires. Le classique qui met tout le monde à l'aise.",
    activity: "bowling",
    emoji: "🎳",
    weekday: 2,
    hour: 20,
    minute: 0,
    commune: "bruxelles-centre",
    communeLabel: "Bruxelles-Centre",
    lat: 50.8422,
    lng: 4.3556,
  },
  {
    id: "vendredi-cafe",
    label: "Le café du vendredi",
    tagline: "Afterwork tout doux : un café, de vraies discussions, zéro pression.",
    activity: "coffee",
    emoji: "☕",
    weekday: 5,
    hour: 18,
    minute: 0,
    commune: "bruxelles-centre",
    communeLabel: "Bruxelles-Centre",
    lat: 50.8476,
    lng: 4.3526,
  },
  {
    id: "samedi-brunch",
    label: "Le brunch du samedi",
    tagline: "Œufs, café, tartines et discussions qui s'éternisent. Le rendez-vous gourmand.",
    activity: "coffee",
    emoji: "🥐",
    weekday: 6,
    hour: 11,
    minute: 30,
    commune: "ixelles",
    communeLabel: "Ixelles",
    lat: 50.8258,
    lng: 4.3666,
  },
  {
    id: "dimanche-balade",
    label: "La balade du dimanche",
    tagline: "Marcher, découvrir la ville, respirer. Départ étangs d'Ixelles.",
    activity: "walk",
    emoji: "🚶",
    weekday: 0,
    hour: 11,
    minute: 0,
    commune: "ixelles",
    communeLabel: "Ixelles",
    lat: 50.8237,
    lng: 4.3737,
  },
];

export function getRitual(id: string): Ritual | null {
  return RITUALS.find((r) => r.id === id) ?? null;
}

/** Décalage Bruxelles (CET/CEST) en millisecondes pour une date donnée. */
function brusselsOffsetMs(at: Date): number {
  const part = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Brussels",
    timeZoneName: "longOffset",
  })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value; // ex. "GMT+02:00"
  const m = part?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 60 * 60 * 1000; // repli CET
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3])) * 60 * 1000;
}

/** Date civile actuelle à Bruxelles (année, mois, jour, jour de semaine). */
function brusselsToday(now: Date): { y: number; m: number; d: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

/** Construit l'instant UTC correspondant à une heure civile de Bruxelles. */
function brusselsDateToUtc(y: number, m: number, d: number, hour: number, minute: number): Date {
  // Première approximation avec l'offset du jour à midi (évite l'ambiguïté DST de minuit)
  const approx = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const offset = brusselsOffsetMs(approx);
  return new Date(Date.UTC(y, m - 1, d, hour, minute, 0) - offset);
}

/**
 * Prochaine occurrence d'un rituel (instant UTC).
 * Si l'occurrence du jour est déjà passée (ou trop proche : < cutoffHours),
 * renvoie celle de la semaine suivante.
 */
export function nextOccurrence(ritual: Ritual, now: Date = new Date(), cutoffHours = 3): Date {
  const today = brusselsToday(now);
  let addDays = (ritual.weekday - today.weekday + 7) % 7;

  let candidate = brusselsDateToUtc(today.y, today.m, today.d, ritual.hour, ritual.minute);
  candidate = new Date(candidate.getTime() + addDays * 24 * 60 * 60 * 1000);

  if (candidate.getTime() - now.getTime() < cutoffHours * 60 * 60 * 1000) {
    candidate = new Date(candidate.getTime() + 7 * 24 * 60 * 60 * 1000);
    addDays += 7;
  }
  return candidate;
}

/** Heure de fermeture des réservations (le matching batch tourne à ce moment) : J-1 à 12:00 Bruxelles. */
export function reservationCloseAt(occursAt: Date): Date {
  const dayBefore = new Date(occursAt.getTime() - 24 * 60 * 60 * 1000);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(dayBefore).split("-").map(Number);
  return brusselsDateToUtc(y, m, d, 12, 0);
}

/** « jeudi 10 juillet · 19:00 » en heure de Bruxelles. */
export function formatOccurrenceFr(occursAt: Date): string {
  return new Intl.DateTimeFormat("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Brussels",
  }).format(occursAt);
}

export const GROUP_MIN = 4;
export const GROUP_MAX = 6;

/**
 * Compose des groupes de 4-6 depuis les réservations d'un créneau.
 * Partition équilibrée avec le minimum de groupes : tout n ≥ 4 est couvert,
 * sauf n = 7 (mathématiquement impossible en parts de 4-6) → un groupe de 6
 * + 1 personne reportée. Les non-matchés sont reportés, jamais annulés en
 * silence.
 */
export function composeGroups(userIds: string[]): { groups: string[][]; leftover: string[] } {
  const ids = [...new Set(userIds)];
  const n = ids.length;
  if (n < GROUP_MIN) return { groups: [], leftover: ids };

  // Minimum de groupes pour tenir tout le monde à ≤ 6 par groupe
  let groupCount = Math.ceil(n / GROUP_MAX);
  let toPlace = n;

  // Cas infaisable (seul n = 7) : impossible d'avoir groupCount groupes ≥ 4.
  // On forme le maximum de groupes pleins possibles et on reporte le reste.
  if (n < GROUP_MIN * groupCount) {
    groupCount = Math.floor(n / GROUP_MAX) || 1;
    toPlace = Math.min(n, GROUP_MAX * groupCount);
  }

  // Répartition équilibrée : tailles floor/ceil (toutes dans [4,6])
  const groups: string[][] = [];
  let remaining = toPlace;
  let cursor = 0;
  for (let g = 0; g < groupCount; g++) {
    const size = Math.ceil(remaining / (groupCount - g));
    groups.push(ids.slice(cursor, cursor + size));
    cursor += size;
    remaining -= size;
  }
  return { groups, leftover: ids.slice(cursor) };
}
