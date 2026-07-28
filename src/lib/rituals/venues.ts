/**
 * Lieux réels des rituels — révélés au Reveal (J-1), jamais avant.
 * Rotation par semaine + index de groupe : deux groupes du même créneau
 * ne se retrouvent pas dans le même bar.
 */

export type Venue = { name: string; lat: number; lng: number };

const VENUES: Record<string, Venue[]> = {
  "jeudi-jeux": [
    { name: "Escape Hunt Brussels, Rue Théodore Verhaegen 132, 1060 Saint-Gilles", lat: 50.8273, lng: 4.3498 },
    { name: "Enygma Escape Rooms, Rue du Vieux Marché aux Grains 33, 1000 Bruxelles", lat: 50.848, lng: 4.3457 },
    { name: "One Hour, Rue de Flandre 63, 1000 Bruxelles", lat: 50.8523, lng: 4.3452 },
    { name: "Crosly Bowling, Bd de l'Empereur 36, 1000 Bruxelles", lat: 50.8422, lng: 4.3556 },
  ],
  "samedi-cafe": [
    { name: "OR Coffee Roasters, Rue Auguste Orts 9, 1000 Bruxelles", lat: 50.8476, lng: 4.3526 },
    { name: "Mok Coffee, Rue Antoine Dansaert 196, 1000 Bruxelles", lat: 50.8501, lng: 4.3448 },
    { name: "Café Capitale, Rue du Midi 129, 1000 Bruxelles", lat: 50.8459, lng: 4.3512 },
    { name: "My Little Cup, Galerie du Roi 16, 1000 Bruxelles", lat: 50.8478, lng: 4.3556 },
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
