import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes plans",
  description: "Plans que tu organises ou auxquels tu participes sur Meet42.",
};

export default function MesPlansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
