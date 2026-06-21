import Link from "next/link";
import { CANCELLATION_POLICY_FR } from "@/lib/plans/cancellation";
import { SITE_CONTACT_EMAIL, mailtoHref } from "@/lib/config/site";

export default function ConfiancePage() {
  const contact = SITE_CONTACT_EMAIL ? mailtoHref("Meet42 — question") : null;

  return (
    <main className="min-h-screen bg-transparent px-4 py-10 md:py-14">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-4xl font-semibold tracking-[-0.02em] text-[color:var(--ink)]">Confiance & données</h1>
        <p className="mt-2 text-[color:var(--ink-2)]">
          Transparence minimale pour lancer sereinement — une politique complète pourra évoluer avec le produit.
        </p>

        <section className="mt-10 space-y-4 text-sm text-[color:var(--ink-2)] leading-relaxed">
          <h2 className="text-base font-semibold text-[color:var(--ink)]">Données personnelles</h2>
          <p>
            Ton profil sert à te reconnaître sur place (prénom, âge, bio optionnelle). Les données d’authentification
            sont gérées par Supabase lorsque l’app est connectée à un projet Supabase ; en mode démo sans Supabase, un
            stockage local simplifié peut être utilisé.
          </p>
          <p>
            Nous ne revendons pas tes données à des courtiers publicitaires. Toute évolution (analytics, nouveaux usages)
            sera annoncée ici.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-[color:var(--ink)]">Annulation</h2>
          <p className="text-sm text-[color:var(--ink-2)] leading-relaxed">{CANCELLATION_POLICY_FR}</p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-[color:var(--ink)]">Contact</h2>
          {contact ? (
            <a href={contact} className="text-sm font-semibold text-[color:var(--ink)] underline underline-offset-2">
              {SITE_CONTACT_EMAIL}
            </a>
          ) : (
            <p className="text-sm text-[color:var(--ink-2)]">
              Définis la variable d’environnement <code className="rounded bg-[color:var(--cream-3)] px-1 py-0.5 text-xs">NEXT_PUBLIC_CONTACT_EMAIL</code> pour afficher un email de contact.
            </p>
          )}
        </section>

        <p className="mt-12 text-sm text-[color:var(--ink-3)]">
          <Link href="/" className="font-semibold text-[color:var(--ink)] hover:underline">
            Retour à l’accueil
          </Link>
        </p>
      </div>
    </main>
  );
}
