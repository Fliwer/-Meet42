/**
 * Intérêts du profil, la matière première des points communs et des
 * brise-glace. Volontairement peu nombreux (12) : choisir 3-5 doit prendre
 * 10 secondes, pas devenir un questionnaire.
 *
 * Règle produit : jamais de « % de compatibilité », des faits humains qui
 * deviennent des conversations autour de la table.
 */

export type Interest = {
  id: string;
  label: string;
  emoji: string;
  /** Phrase de point commun : reçoit le nombre de membres concernés. */
  common: (n: number) => string;
  /** Brise-glace : reçoit le prénom d'un membre qui a cet intérêt. */
  icebreaker: (name: string) => string;
};

export const INTERESTS: Interest[] = [
  {
    id: "voyage",
    label: "Voyage",
    emoji: "✈️",
    common: (n) => `${n} adorent voyager`,
    icebreaker: (name) => `Demandez à ${name} son voyage le plus marquant.`,
  },
  {
    id: "food",
    label: "Food & cuisine",
    emoji: "🍜",
    common: (n) => `${n} sont food lovers`,
    icebreaker: (name) => `Demandez à ${name} la meilleure table de Bruxelles selon lui/elle.`,
  },
  {
    id: "sport",
    label: "Sport",
    emoji: "🏃",
    common: (n) => `${n} sont sportifs`,
    icebreaker: (name) => `Demandez à ${name} son dernier défi sportif.`,
  },
  {
    id: "musique",
    label: "Musique & concerts",
    emoji: "🎶",
    common: (n) => `${n} vivent pour la musique`,
    icebreaker: (name) => `Demandez à ${name} le meilleur concert de sa vie.`,
  },
  {
    id: "cine",
    label: "Ciné & séries",
    emoji: "🎬",
    common: (n) => `${n} sont ciné & séries`,
    icebreaker: (name) => `Demandez à ${name} la série qu'il/elle défendrait contre tout le monde.`,
  },
  {
    id: "lecture",
    label: "Lecture",
    emoji: "📚",
    common: (n) => `${n} sont lecteurs`,
    icebreaker: (name) => `Demandez à ${name} le livre qu'il/elle offre le plus souvent.`,
  },
  {
    id: "tech",
    label: "Tech",
    emoji: "💻",
    common: (n) => `${n} travaillent ou baignent dans la tech`,
    icebreaker: (name) => `Demandez à ${name} sur quoi il/elle bosse en ce moment.`,
  },
  {
    id: "nature",
    label: "Nature & rando",
    emoji: "🌿",
    common: (n) => `${n} sont plutôt grand air`,
    icebreaker: (name) => `Demandez à ${name} son coin de nature préféré en Belgique.`,
  },
  {
    id: "art",
    label: "Art & expos",
    emoji: "🎨",
    common: (n) => `${n} sont arts & expos`,
    icebreaker: (name) => `Demandez à ${name} la dernière expo qui l'a marqué·e.`,
  },
  {
    id: "jeux",
    label: "Jeux & soirées jeux",
    emoji: "🎲",
    common: (n) => `${n} sont joueurs`,
    icebreaker: (name) => `Demandez à ${name} son jeu de société fétiche.`,
  },
  {
    id: "langues",
    label: "Langues",
    emoji: "🗣️",
    common: (n) => `${n} parlent plusieurs langues`,
    icebreaker: (name) => `Demandez à ${name} combien de langues il/elle parle (et laquelle il/elle massacre).`,
  },
  {
    id: "entreprendre",
    label: "Entrepreneuriat",
    emoji: "🚀",
    common: (n) => `${n} ont la fibre entrepreneuriale`,
    icebreaker: (name) => `Demandez à ${name} l'idée de projet qui lui trotte dans la tête.`,
  },
];

const BY_ID = new Map(INTERESTS.map((i) => [i.id, i]));

export type MemberLite = { first_name: string; interests: string[] };

/**
 * Points communs d'un groupe : les intérêts partagés par ≥ 2 membres,
 * les plus partagés d'abord, max 3 phrases.
 */
export function computeCommonPoints(members: MemberLite[]): string[] {
  const counts = new Map<string, number>();
  for (const m of members) {
    for (const id of new Set(m.interests ?? [])) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([id, n]) => n >= 2 && BY_ID.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, n]) => BY_ID.get(id)!.common(n));
}

/**
 * Brise-glace du groupe : max 3, chacun ancré sur un membre différent et un
 * intérêt distinctif (porté par 1-2 personnes → ça donne quelque chose à
 * découvrir, pas à confirmer).
 */
export function buildIcebreakers(members: MemberLite[]): string[] {
  const counts = new Map<string, number>();
  for (const m of members) {
    for (const id of new Set(m.interests ?? [])) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const out: string[] = [];
  const usedMembers = new Set<string>();
  // Intérêts les plus rares d'abord (distinctifs)
  const rareFirst = [...counts.entries()].sort((a, b) => a[1] - b[1]);
  for (const [interestId] of rareFirst) {
    if (out.length >= 3) break;
    const interest = BY_ID.get(interestId);
    if (!interest) continue;
    const holder = members.find(
      (m) => (m.interests ?? []).includes(interestId) && !usedMembers.has(m.first_name) && m.first_name?.trim()
    );
    if (!holder) continue;
    usedMembers.add(holder.first_name);
    out.push(interest.icebreaker(holder.first_name.trim()));
  }
  // Repli si pas assez d'intérêts renseignés
  if (out.length === 0) {
    out.push("Premier tour de table : chacun raconte sa pire anecdote de transports bruxellois.");
  }
  return out;
}
