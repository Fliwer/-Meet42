import type { Metadata } from "next";
import { getPlanForMeta, formatStartFr } from "@/lib/plans/getPlanForMeta";

/**
 * Metadata dynamiques des pages plan — le titre/description qu'affiche un lien
 * /plan/xxx partagé. La page elle-même est un composant client, d'où ce layout
 * serveur dédié.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const plan = await getPlanForMeta(id);
  if (!plan) {
    return {
      title: "Un plan t'attend",
      description: "Rejoins un groupe de 4 à 6 autour d'une vraie activité à Bruxelles. Sans swipe.",
    };
  }

  const spotsLeft = Math.max(0, plan.max_participants - plan.participants_count);
  const when = formatStartFr(plan.start_time);
  const title = `${plan.activityEmoji} ${plan.activityLabel} · ${when}`;
  const description =
    spotsLeft > 0
      ? `${spotsLeft} ${spotsLeft > 1 ? "places restantes" : "place restante"} dans ce groupe de ${plan.max_participants} — ${plan.location_text}. Rejoins en 1 min.`
      : `Groupe complet — mais d'autres plans t'attendent près de toi sur Meet42.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
