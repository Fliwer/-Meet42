/**
 * Lieux réels des rituels — révélés au Reveal (J-1), jamais avant.
 * Rotation par semaine + index de groupe : deux groupes du même créneau
 * ne se retrouvent pas dans le même bar.
 */

export type Venue = { name: string; lat: number; lng: number };

const VENUES: Record<string, Venue[]> = {
  "jeudi-apero": [
    { name: "Café Belga, Place Eugène Flagey 18, 1050 Ixelles", lat: 50.8258, lng: 4.3666 },
    { name: "L'Amère à Boire, Chaussée d'Ixelles 174, 1050 Ixelles", lat: 50.8353, lng: 4.3589 },
    { name: "Le Tavernier, Chaussée de Boondael 445, 1050 Ixelles", lat: 50.8154, lng: 4.3922 },
    { name: "Kokob, Rue de la Paix 10, 1050 Ixelles", lat: 50.8346, lng: 4.3609 },
    { name: "Le Pantin, Chaussée d'Ixelles 355, 1050 Ixelles", lat: 50.8245, lng: 4.3659 },
    { name: "L'Ultime Atome, Chaussée Saint-Pierre 14, 1040 Etterbeek", lat: 50.8386, lng: 4.3815 },
  ],
  "dimanche-balade": [
    { name: "Étangs d'Ixelles — devant le kiosque, 1050 Ixelles", lat: 50.8237, lng: 4.3737 },
    { name: "Parc Tenbosch — entrée rue de l'Aqueduc, 1050 Ixelles", lat: 50.8248, lng: 4.3588 },
  ],
};

/** Numéro de semaine ISO (suffisant pour une rotation stable). */
function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function pickVenue(ritualId: string, occursAt: Date, groupIndex: number): Venue {
  const pool = VENUES[ritualId] ?? VENUES["jeudi-apero"];
  const offset = isoWeek(occursAt) + groupIndex;
  return pool[offset % pool.length];
}
