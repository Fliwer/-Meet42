/**
 * Jalons du Carnet, on célèbre le tissu social qui se construit, jamais on ne
 * culpabilise (anti-Duolingo sombre). Le graphe grandit → l'utilisateur voit
 * qu'il construit quelque chose autour de lui.
 */

export type CarnetStats = {
  fortyTwoCount: number; // 42 vécus
  peopleMet: number; // rencontres réelles
  cercle: number; // belles rencontres mutuelles
};

export type Milestone = { title: string; sub: string };

/** Le jalon « en cours » à mettre en avant, selon la densité atteinte. */
export function headlineMilestone(s: CarnetStats): Milestone {
  if (s.fortyTwoCount === 0) {
    return { title: "Ton histoire commence", sub: "Réserve ton premier 42, le reste s'écrit tout seul." };
  }
  if (s.cercle >= 10) {
    return { title: "Tu as un vrai cercle bruxellois", sub: `${s.cercle} personnes que tu recroises avec plaisir.` };
  }
  if (s.cercle >= 3) {
    return { title: "Ton cercle grandit", sub: `${s.cercle} belles rencontres réciproques, ça se construit.` };
  }
  if (s.cercle >= 1) {
    return { title: "Tu as créé ton premier cercle", sub: "Une rencontre réciproque, la première d'une longue série." };
  }
  if (s.peopleMet >= 20) {
    return { title: `${s.peopleMet} rencontres à Bruxelles`, sub: "Ton univers social s'élargit, un 42 à la fois." };
  }
  if (s.fortyTwoCount >= 3) {
    return { title: "Tu prends le rythme", sub: `${s.fortyTwoCount} 42 vécus. Meet42 fait désormais partie de tes semaines.` };
  }
  return { title: "Ton premier 42, c'est fait", sub: "Le plus dur est derrière. À quand le prochain ?" };
}
