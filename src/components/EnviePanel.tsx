"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { ACTIVITIES, type ActivityId } from "@/lib/plans/activities";
import { COMMUNES, type CommuneId } from "@/lib/venues/venueTypes";

const WHEN_OPTIONS = [
  { id: "tonight", label: "Ce soir" },
  { id: "weekend", label: "Ce week-end" },
  { id: "week", label: "Cette semaine" },
] as const;
type WhenId = (typeof WHEN_OPTIONS)[number]["id"];

/**
 * Panneau « Dis ton envie » embarqué sur le home — l'entrée principale
 * (Envies-first) : l'utilisateur exprime une envie et on le place dans un
 * groupe. Marche même sans plans existants → moteur d'acquisition / cold-start.
 */
export default function EnviePanel() {
  const router = useRouter();
  const { status } = useAuth();

  const [selected, setSelected] = useState<Set<ActivityId>>(new Set());
  const [when, setWhen] = useState<WhenId>("tonight");
  const [commune, setCommune] = useState<CommuneId | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function toggle(id: ActivityId) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setSubmitted(false);
  }

  const selectedActivities = useMemo(() => ACTIVITIES.filter((a) => selected.has(a.id)), [selected]);
  const canSubmit = selected.size >= 1 && commune !== null;
  const communeLabel = COMMUNES.find((c) => c.id === commune)?.label ?? "";

  function onSubmit() {
    if (!canSubmit) return;
    if (status !== "authenticated") {
      router.push("/login?next=/");
      return;
    }
    setSubmitted(true);
  }

  function createDirect() {
    const first = selectedActivities[0]?.id;
    router.push(first ? `/create?activity=${first}` : "/create");
  }

  const chipOn =
    "inline-flex items-center gap-1.5 rounded-full border-2 border-[color:var(--fire)] bg-[color:var(--fire-wash)] px-3.5 py-1.5 text-sm font-semibold text-[color:var(--ink)] transition active:scale-95";
  const chipOff =
    "inline-flex items-center gap-1.5 rounded-full border-2 border-[color:var(--line)] bg-[color:var(--cream-2)] px-3.5 py-1.5 text-sm font-semibold text-[color:var(--ink-2)] transition hover:border-[color:var(--line-2)] active:scale-95";
  const pillOn =
    "rounded-full border-2 border-[color:var(--espresso)] bg-[color:var(--espresso)] px-4 py-1.5 text-sm font-semibold text-[color:var(--cream)]";
  const pillOff =
    "rounded-full border-2 border-[color:var(--line)] bg-[color:var(--cream-2)] px-4 py-1.5 text-sm font-semibold text-[color:var(--ink-2)] hover:border-[color:var(--line-2)]";

  return (
    <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-5 shadow-[0_20px_44px_-26px_rgba(29,22,13,0.5)] sm:p-7">
      <span className="meet42-kicker">
        <span className="meet42-kicker-dot" aria-hidden />
        <span className="meet42-kicker-dot -ml-0.5" aria-hidden />
        On te forme un groupe
      </span>
      <h2 className="meet42-section-title mt-2 text-[1.8rem] sm:text-[2.2rem]">Dis ton envie ce soir</h2>
      <p className="mt-1 text-sm text-[color:var(--ink-2)]">
        Tu choisis, on te place dans un groupe de 4–6. Zéro organisation — l'anti-swipe.
      </p>

      <div className="mt-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-3)]">Qu'est-ce qui te tente ?</div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {ACTIVITIES.map((a) => (
            <button key={a.id} type="button" onClick={() => toggle(a.id)} aria-pressed={selected.has(a.id)} className={selected.has(a.id) ? chipOn : chipOff}>
              <span aria-hidden>{a.emoji}</span> {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-3)]">Quand ?</div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {WHEN_OPTIONS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setWhen(w.id);
                  setSubmitted(false);
                }}
                aria-pressed={when === w.id}
                className={when === w.id ? pillOn : pillOff}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-3)]">Dans quel coin ?</div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {COMMUNES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCommune(c.id);
                  setSubmitted(false);
                }}
                aria-pressed={commune === c.id}
                className={commune === c.id ? pillOn : pillOff}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!submitted ? (
        <button type="button" disabled={!canSubmit} onClick={onSubmit} className="meet42-join-btn mt-6">
          {canSubmit ? "Trouve-moi un groupe" : "Choisis une envie et un coin"}
        </button>
      ) : (
        <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-3)]/50 p-4">
          <div className="text-sm font-bold text-[color:var(--ink)]">C'est noté 🎯</div>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--ink-2)]">
            On te cherche un groupe pour <span className="font-semibold text-[color:var(--ink)]">{selectedActivities.map((a) => a.label.toLowerCase()).join(", ")}</span> du côté de {communeLabel}. Le matching automatique arrive — en attendant, lance le plan toi-même, d'autres pourront le rejoindre tout de suite.
          </p>
          <button type="button" onClick={createDirect} className="meet42-cta-primary mt-3 w-full">
            Créer ce plan en direct
          </button>
        </div>
      )}
    </div>
  );
}
