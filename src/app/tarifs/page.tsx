import { redirect } from "next/navigation";

/** Pas de page tarifs pour l’instant — redirection vers l’accueil. */
export default function TarifsPage() {
  redirect("/");
}
