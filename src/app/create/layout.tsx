import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un plan",
  description: "Propose un rendez-vous IRL en quelques secondes : activité, lieu, horaire, taille du groupe.",
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
