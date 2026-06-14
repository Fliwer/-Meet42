import Link from "next/link";
import { SITE_CONTACT_EMAIL, mailtoHref } from "@/lib/config/site";

const year = new Date().getFullYear();

export default function MarketingFooter() {
  const contact = SITE_CONTACT_EMAIL
    ? mailtoHref("Meet42 — contact", "Bonjour,\n\n")
    : "/confiance";

  return (
    <footer className="border-t border-[color:var(--line)] bg-[color:var(--cream-3)]/60 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="font-display text-lg font-semibold text-[color:var(--ink)]">
              Meet<span className="text-[color:var(--fire)]">42</span>
            </div>
            <p className="mt-2 text-sm text-[color:var(--ink-2)] leading-relaxed">
              Petits groupes, vraies rencontres. Pensé pour Bruxelles, Ixelles et alentours — sans feed infini ni
              algorithmes opaques.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm" aria-label="Liens pied de page">
            <Link href="/confiance" className="font-semibold text-[color:var(--ink)] hover:text-[color:var(--fire)] hover:underline underline-offset-2">
              Confiance & données
            </Link>
            <a
              href={contact}
              className="font-semibold text-[color:var(--ink)] hover:text-[color:var(--fire)] hover:underline underline-offset-2"
              {...(SITE_CONTACT_EMAIL ? {} : { "aria-label": "Page confiance (contact à configurer)" })}
            >
              Contact
            </a>
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-[color:var(--line)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[color:var(--ink-3)]">
          <span>© {year} Meet42</span>
          <span className="text-[color:var(--ink-3)]">
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
