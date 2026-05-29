import Link from "next/link";
import { SITE_CONTACT_EMAIL, mailtoHref } from "@/lib/config/site";

const year = new Date().getFullYear();

export default function MarketingFooter() {
  const contact = SITE_CONTACT_EMAIL
    ? mailtoHref("Meet42 — contact", "Bonjour,\n\n")
    : "/confiance";

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50/80 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="font-bold text-zinc-900">Meet42</div>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              Petits groupes, vraies rencontres. Pensé pour Bruxelles, Ixelles et alentours — sans feed infini ni
              algorithmes opaques.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm" aria-label="Liens pied de page">
            <Link href="/confiance" className="font-semibold text-zinc-900 hover:underline underline-offset-2">
              Confiance & données
            </Link>
            <a
              href={contact}
              className="font-semibold text-zinc-900 hover:underline underline-offset-2"
              {...(SITE_CONTACT_EMAIL ? {} : { "aria-label": "Page confiance (contact à configurer)" })}
            >
              Contact
            </a>
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-zinc-500">
          <span>© {year} Meet42</span>
          <span className="text-zinc-400">
            {SITE_CONTACT_EMAIL
              ? "Presse, partenariats : écris-nous."
              : process.env.NODE_ENV === "development"
                ? "Dev : définis NEXT_PUBLIC_CONTACT_EMAIL pour le contact mailto."
                : "Contact dédié : bientôt."}
          </span>
        </div>
      </div>
    </footer>
  );
}
