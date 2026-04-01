import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confiance & données",
  description: "Comment Meet42 traite tes données, les règles d’annulation et le contact.",
};

export default function ConfianceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
