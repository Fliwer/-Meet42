"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { SITE_CONTACT_EMAIL, mailtoHref } from "@/lib/config/site";

export default function TarifsPage() {
  const router = useRouter();
  const { status } = useAuth();

  const waitlistHref = SITE_CONTACT_EMAIL
    ? mailtoHref(
        "Meet42 Pro — liste d’attente",
        "Bonjour,\n\nJe souhaite être prévenu(e) du lancement Meet42 Pro et des offres partenaires (cafés / lieux).\n\n"
      )
    : "/confiance";

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/90">Monétisation transparente</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-bold text-zinc-900 leading-tight">
          Un produit gratuit solide. Un Pro qui rapporte de la valeur, pas de la frustration.
        </h1>
        <p className="mt-4 text-lg text-zinc-600 leading-relaxed">
          Meet42 reste utilisable gratuitement pour créer et rejoindre des plans IRL. L’offre payante visera des{" "}
          <strong className="text-zinc-800">organisateurs réguliers</strong> et des{" "}
          <strong className="text-zinc-800">lieux partenaires</strong> — jamais de piège à « microtransactions » sur
          chaque message.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Aujourd’hui</div>
            <h2 className="mt-2 text-xl font-bold text-zinc-900">Gratuit</h2>
            <p className="mt-2 text-sm text-zinc-600">Tout le cœur du produit : plans 4–6, géoloc, annulation 24 h.</p>
            <ul className="mt-5 space-y-2.5 text-sm text-zinc-800">
              <li className="flex gap-2">
                <span className="text-emerald-600" aria-hidden>
                  ✓
                </span>
                Création et participation aux plans
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600" aria-hidden>
                  ✓
                </span>
                Profil simple (prénom, âge, bio)
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600" aria-hidden>
                  ✓
                </span>
                Règle d’annulation 24 h (respect du groupe)
              </li>
            </ul>
            <Link
              href="/create"
              className="mt-6 inline-flex w-full justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Créer un plan
            </Link>
          </section>

          <section className="rounded-3xl border-2 border-amber-200 bg-gradient-to-b from-amber-50/80 to-white p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-3 right-3 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              Bientôt
            </div>
            <div className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Pour scale & revenus</div>
            <h2 className="mt-2 text-xl font-bold text-zinc-900">Meet42 Pro</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Pensé pour les personnes qui animent vraiment la vie locale — et pour les commerces qui veulent du trafic
              qualifié, pas des pubs aveugles.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-zinc-800">
              <li className="flex gap-2">
                <span className="text-amber-600" aria-hidden>
                  ★
                </span>
                Mise en avant des plans (visibilité prioritaire)
              </li>
              <li className="flex gap-2">
                <span className="text-amber-600" aria-hidden>
                  ★
                </span>
                Boost ponctuel d’un plan (« soirée apéro », événement)
              </li>
              <li className="flex gap-2">
                <span className="text-amber-600" aria-hidden>
                  ★
                </span>
                Statistiques simples pour hôtes (taux de remplissage)
              </li>
              <li className="flex gap-2">
                <span className="text-amber-600" aria-hidden>
                  ★
                </span>
                Offres partenaires cafés / bars (packs visibilité locale)
              </li>
            </ul>
            <div className="mt-6 flex flex-col gap-2">
              {waitlistHref.startsWith("mailto:") ? (
                <a
                  href={waitlistHref}
                  className="inline-flex w-full justify-center rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-amber-950 hover:bg-amber-400"
                >
                  Rejoindre la liste Pro
                </a>
              ) : (
                <Link
                  href={waitlistHref}
                  className="inline-flex w-full justify-center rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-amber-950 hover:bg-amber-400"
                >
                  Rejoindre la liste Pro
                </Link>
              )}
              {status === "anonymous" ? (
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 underline-offset-2 hover:underline"
                >
                  Créer un compte gratuit d’abord
                </button>
              ) : null}
            </div>
          </section>
        </div>

        <section className="mt-12 rounded-2xl border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-zinc-900">Pourquoi c’est un bon modèle business</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600 leading-relaxed">
            <li>
              <strong className="text-zinc-800">Usage gratuit large</strong> → croissance et bouche-à-oreille sans
              friction.
            </li>
            <li>
              <strong className="text-zinc-800">Pro ciblé</strong> → revenus récurrents auprès des organisateurs et des
              lieux, pas de taxe sur l’amitié.
            </li>
            <li>
              <strong className="text-zinc-800">Partenariats locaux</strong> → marges plus hautes qu’une simple pub
              display, avec mesure (passages en établissement).
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
