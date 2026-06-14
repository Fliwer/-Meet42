"use client";

/**
 * Écran "Envies" — Phase 1 du modèle TimeLeft de Meet42.
 *
 * L'utilisateur ne crée plus / ne cherche plus un plan précis : il dit simplement
 * ce qui lui plaît (activités), quand il est dispo et dans quel coin. Il rejoint
 * ainsi un "pool". Le matcher (Phase 2) regroupera ensuite les pools en groupes
 * de 4 à 6 personnes et révélera le lieu + l'heure + les membres (Phase 3).
 *
 * Phase 1 = la sélection + confirmation côté client. Aucune persistance backend
 * pour l'instant (branchement à venir en Phase 2).
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
    // Phase 2 : POST vers /api/match/join (création/abonnement au pool).
    setSubmitted(true);
  }

  const whenLabel = WHEN_OPTIONS.find((w) => w.id === when)?.label.toLowerCase() ?? "";
  const communeLabel = COMMUNES.find((c) => c.id === commune)?.label ?? "";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 pb-32">
      <div className="mx-auto max-w-2xl py-6 md:py-9">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-6 text-white shadow-lg ring-1 ring-white/10">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Laisse-toi matcher
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Dis-nous ton envie ✨</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            Tu choisis ce qui te tente, on s&apos;occupe du reste : on te place dans un
            petit groupe de <span className="font-semibold text-white">4 à 6 personnes</span>.
            Zéro organisation, juste l&apos;envie de sortir.
          </p>
        </div>

        {/* Étape 1 — Activités */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-zinc-900">Qu&apos;est-ce qui te tente ?</h2>
            <span className="text-xs font-medium text-zinc-500">
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
                      ? "flex items-center gap-2 rounded-2xl border-2 border-[#FF6B5B] bg-[#FF6B5B]/10 px-3 py-3 text-left text-sm font-semibold text-zinc-900 shadow-sm transition active:scale-[0.98]"
                      : "flex items-center gap-2 rounded-2xl border-2 border-zinc-200 bg-white px-3 py-3 text-left text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 active:scale-[0.98]"
                  }
                >
                  <span className="text-xl" aria-hidden>
                    {a.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{a.label}</span>
                  {active ? <span className="text-[#FF6B5B]" aria-hidden>✓</span> : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* Étape 2 — Quand */}
        <section className="mt-7">
          <h2 className="text-lg font-bold text-zinc-900">Quand es-tu dispo ?</h2>
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
                      ? "rounded-2xl border-2 border-zinc-900 bg-zinc-900 px-3 py-3 text-center text-white shadow-sm transition active:scale-[0.98]"
                      : "rounded-2xl border-2 border-zinc-200 bg-white px-3 py-3 text-center text-zinc-700 transition hover:border-zinc-300 active:scale-[0.98]"
                  }
                >
                  <div className="text-sm font-bold">{w.label}</div>
                  <div className={active ? "mt-0.5 text-[11px] text-white/70" : "mt-0.5 text-[11px] text-zinc-500"}>
                    {w.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Étape 3 — Où */}
        <section className="mt-7">
          <h2 className="text-lg font-bold text-zinc-900">Dans quel coin ?</h2>
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
                      ? "rounded-full border-2 border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98]"
                      : "rounded-full border-2 border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 active:scale-[0.98]"
                  }
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Confirmation Phase 1 */}
        {submitted ? (
          <div className="mt-7 rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-5">
            <div className="text-base font-bold text-emerald-900">C&apos;est noté ! 🎉</div>
            <p className="mt-1.5 text-sm leading-relaxed text-emerald-800">
              On te cherche un groupe pour{" "}
              <span className="font-semibold">
                {selectedActivities.map((a) => `${a.emoji} ${a.label.toLowerCase()}`).join(", ")}
              </span>{" "}
              {whenLabel} du côté de <span className="font-semibold">{communeLabel}</span>.
              Dès qu&apos;un groupe de 4 à 6 se forme, on te prévient avec le lieu et l&apos;heure.
            </p>
            <p className="mt-3 text-xs text-emerald-700">
              (Le matching automatique arrive très bientôt — pour l&apos;instant ton envie est enregistrée.)
            </p>
          </div>
        ) : null}
      </div>

      {/* CTA fixe */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="w-full rounded-2xl bg-[#FF6B5B] px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-[#FF6B5B]/30 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
          >
            {canSubmit ? "Trouve-moi un groupe" : "Choisis une envie, un moment et un coin"}
          </button>
        </div>
      </div>

      {/* CTA desktop (inline) */}
      <div className="mx-auto hidden max-w-2xl md:block">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="w-full rounded-2xl bg-[#FF6B5B] px-4 py-4 text-base font-black text-white shadow-xl shadow-[#FF6B5B]/30 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
        >
          {canSubmit ? "Trouve-moi un groupe" : "Choisis une envie, un moment et un coin"}
        </button>
      </div>
    </main>
  );
}
