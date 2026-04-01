import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Meet42 gratuit pour l’essentiel. Offre Pro à venir : visibilité, outils hôtes, monétisation équitable.",
};

export default function TarifsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
