"use client";

/**
 * Écran "Envies" — préfiguration du modèle TimeLeft de Meet42.
 *
 * L'utilisateur dit ce qui lui plaît (activités), quand il est dispo et dans
 * quel coin. Le matching automatique (regroupement en pools de 4–6) n'est PAS
 * encore branché côté backend — c'est annoncé honnêtement. En attendant, on
 * transforme l'envie en action concrète : créer un plan direct pré-rempli via
 * le parcours "Plans" qui, lui, fonctionne de bout en bout.
 */

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { ACTIVITIES, type ActivityId } from "@/lib/plans/activities";
import { COMMUNES, type CommuneId } from "@/lib/venues/venueTypes";

type WhenId = "tonight" | "weekend" | "week";

const WHEN_OPTIONS: Array<{ id: WhenId; label: string; hint: string }> = [
  { id: "tonight", label: "Ce soir", hint: "Dans les prochaines heures" },
  { id: "weekend", label: "Ce week-end", hint: "Sam. ou dim." },
  { id: "week", label: "Cette semaine", hint: "Quand un groupe se forme" },
];

export default function MatchPage() {
  const router = useRouter();
  const { status } = useAuth();

  const [selected, setSelected] = useState<Set<ActivityId>>(new Set());
  const [when, setWhen] = useState<WhenId | null>(null);
  const [commune, setCommune] = useState<CommuneId | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function toggleActivity(id: ActivityId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSubmitted(false);
  }

  const canSubmit = selected.size >= 1 && when !== null && commune !== null;

  const selectedActivities = useMemo(
    () => ACTIVITIES.filter((a) => selected.has(a.id)),
    [selected]
  );

  function onSubmit() {
    if (!canSubmit) return;
    if (status !== "authenticated") {
      router.push("/login?next=/match");
      return;
    }
    setSubmitted(true);
  }

  function createDirectPlan() {
    const first = selectedActivities[0]?.id;
    router.push(first ? `/create?activity=${first}` : "/create");
  }

  const communeLabel = COMMUNES.find((c) => c.id === commune)?.label ?? "";

  return (
    <main className="min-h-screen bg-transparent px-4 pb-32">
      <div className="mx-auto max-w-2xl py-6 md:py-9">
        {/* Hero */}
        <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-6 md:p-8">
          <span className="meet42-kicker">
            <span className="meet42-kicker-dot" aria-hidden />
            <span className="meet42-kicker-dot -ml-0.5" aria-hidden />
            Ton 42 · on te forme un groupe
          </span>
          <h1 className="font-display mt-3 text-[2.4rem] leading-[1.0] font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
            Dis ton envie
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--ink-2)]">
            Tu choisis ce qui te tente, et on te place dans un petit groupe de{" "}
            <span className="font-semibold text-[color:var(--ink)]">4 à 6 personnes</span>. Zéro organisation, juste
            l&apos;envie de sortir.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--fire-wash)] px-3 py-1 text-xs font-bold text-[color:var(--fire-ink)]">
            ✦ Matching automatique — bientôt
          </p>
        </div>

        {/* Étape 1 — Activités */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="meet42-section-title text-xl">Qu&apos;est-ce qui te tente ?</h2>
            <span className="text-xs font-medium text-[color:var(--ink-3)]">
              {selected.size > 0 ? `${selected.size} sélectionnée${selected.size > 1 ? "s" : ""}` : "Choisis-en au moins 1"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACTIVITIES.map((a) => {
              const active = selected.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleActivity(a.id)}
                  aria-pressed={active}
                  className={
                    active
                      ? "flex items-center gap-2 rounded-2xl border-2 border-[color:var(--fire)] bg-[color:var(--fire-wash)] px-3 py-3 text-left text-sm font-semibold text-[color:var(--ink)] transition active:scale-[0.98]"
                      : "flex items-center gap-2 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--cream-2)] px-3 py-3 text-left text-sm font-semibold text-[color:var(--ink-2)] transition hover:border-[color:var(--line-2)] active:scale-[0.98]"
                  }
                >
                  <span className="text-xl" aria-hidden>
                    {a.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{a.label}</span>
                  {active ? <span className="text-[color:var(--fire)]" aria-hidden>✓</span> : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* Étape 2 — Quand */}
        <section className="mt-7">
          <h2 className="meet42-section-title text-xl">Quand es-tu dispo ?</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {WHEN_OPTIONS.map((w) => {
              const active = when === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setWhen(w.id);
                    setSubmitted(false);
                  }}
                  aria-pressed={active}
                  className={
                    active
                      ? "rounded-2xl border-2 border-[color:var(--espresso)] bg-[color:var(--espresso)] px-3 py-3 text-center text-[color:var(--cream)] transition active:scale-[0.98]"
                      : "rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--cream-2)] px-3 py-3 text-center text-[color:var(--ink-2)] transition hover:border-[color:var(--line-2)] active:scale-[0.98]"
                  }
                >
                  <div className="text-sm font-bold">{w.label}</div>
                  <div className={active ? "mt-0.5 text-[11px] text-[color:var(--cream)]/70" : "mt-0.5 text-[11px] text-[color:var(--ink-3)]"}>
                    {w.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Étape 3 — Où */}
        <section className="mt-7">
          <h2 className="meet42-section-title text-xl">Dans quel coin ?</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {COMMUNES.map((c) => {
              const active = commune === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCommune(c.id);
                    setSubmitted(false);
                  }}
                  aria-pressed={active}
                  className={
                    active
                      ? "rounded-full border-2 border-[color:var(--espresso)] bg-[color:var(--espresso)] px-4 py-2 text-sm font-semibold text-[color:var(--cream)] transition active:scale-[0.98]"
                      : "rounded-full border-2 border-[color:var(--line)] bg-[color:var(--cream-2)] px-4 py-2 text-sm font-semibold text-[color:var(--ink-2)] transition hover:border-[color:var(--line-2)] active:scale-[0.98]"
                  }
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Confirmation honnête — le matching auto n'existe pas encore */}
        {submitted ? (
          <div className="mt-7 rounded-3xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-5">
            <div className="text-base font-bold text-[color:var(--ink)]">Le matching auto arrive bientôt 🚧</div>
            <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--ink-2)]">
              On finalise le moteur qui regroupera automatiquement les envies en groupes de 4 à 6. En attendant, ne reste
              pas sur ta faim :{" "}
              <span className="font-semibold text-[color:var(--ink)]">
                lance un plan direct pour {selectedActivities.map((a) => a.label.toLowerCase()).join(", ")} du côté de {communeLabel}
              </span>{" "}
              — d&apos;autres pourront le rejoindre tout de suite.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={createDirectPlan} className="meet42-cta-primary flex-1">
                Créer ce plan en direct
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="meet42-cta-ghost flex-1"
              >
                Voir les plans près de moi
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* CTA fixe (mobile) */}
      <div className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 px-4 md:hidden">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="meet42-join-btn"
          >
            {canSubmit ? "Trouve-moi un groupe" : "Choisis une envie, un moment et un coin"}
          </button>
        </div>
      </div>

      {/* CTA desktop (inline) */}
      <div className="mx-auto mt-2 hidden max-w-2xl md:block">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="meet42-join-btn"
        >
          {canSubmit ? "Trouve-moi un groupe" : "Choisis une envie, un moment et un coin"}
        </button>
      </div>
    </main>
  );
}
