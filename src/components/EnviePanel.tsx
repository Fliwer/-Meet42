"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { getAuthHeaders } from "@/lib/plans/planApi";
import { ACTIVITIES, type ActivityId } from "@/lib/plans/activities";
import { COMMUNES, type CommuneId } from "@/lib/venues/venueTypes";

const WHEN_OPTIONS = [
  { id: "tonight", label: "Ce soir" },
  { id: "weekend", label: "Ce week-end" },
  { id: "week", label: "Cette semaine" },
] as const;
type WhenId = (typeof WHEN_OPTIONS)[number]["id"];

// État renvoyé par l'API après une envie : groupe complet, plan rejoint,
// plan graine créé, ou simplement mis en attente (pas de profil / hors-ligne).
type EnvieResultState = "formed" | "joined" | "seeded" | "pending";

// Brouillon d'envie persisté pour survivre au détour par /login (y compris le
// round-trip OAuth Google). Sans ça, l'utilisateur non connecté perd toute sa
// sélection au moment de « Trouve-moi un groupe » — la fuite nº1 du tunnel.
const DRAFT_KEY = "meet42:envie-draft";
const DRAFT_TTL_MS = 30 * 60 * 1000;

type EnvieDraft = {
  activities: ActivityId[];
  when: WhenId;
  commune: CommuneId | null;
  replay: boolean;
  ts: number;
};

function readDraft(): EnvieDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as EnvieDraft;
    if (!d || typeof d.ts !== "number" || Date.now() - d.ts > DRAFT_TTL_MS) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

function writeDraft(d: Omit<EnvieDraft, "ts">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, ts: Date.now() }));
  } catch {
    // quota/private mode — on dégrade silencieusement
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Panneau « Dis ton envie » embarqué sur le home — l'entrée principale
 * (Envies-first). L'utilisateur exprime une envie (collectée), et la preuve
 * sociale agrégée montre la demande du jour. Marche même sans plans existants
 * → moteur d'acquisition / anti cold-start. Matching = concierge au début.
 */
export default function EnviePanel() {
  const router = useRouter();
  const { status, accessToken, user } = useAuth();

  const [selected, setSelected] = useState<Set<ActivityId>>(new Set());
  const [when, setWhen] = useState<WhenId>("tonight");
  const [commune, setCommune] = useState<CommuneId | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [resultPlanId, setResultPlanId] = useState<string | null>(null);
  const [resultState, setResultState] = useState<EnvieResultState | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  // Vrai une fois le brouillon localStorage relu — garde le replay de se
  // déclencher avant que la sélection sauvegardée soit réhydratée.
  const [hydrated, setHydrated] = useState(false);
  const replayPending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/envies/stats")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setCount(typeof d?.count === "number" ? d.count : 0);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Réhydrate le brouillon au montage (retour depuis /login, refresh…).
  useEffect(() => {
    const d = readDraft();
    if (d) {
      setSelected(new Set(d.activities));
      setWhen(d.when);
      setCommune(d.commune);
      if (d.replay) replayPending.current = true;
    }
    setHydrated(true);
  }, []);

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
  const activitiesLabel = useMemo(
    () => selectedActivities.map((a) => a.label.toLowerCase()).join(", "),
    [selectedActivities]
  );
  const canSubmit = selected.size >= 1 && commune !== null;
  const communeLabel = COMMUNES.find((c) => c.id === commune)?.label ?? "";

  const submitEnvie = useCallback(async () => {
    if (selected.size < 1 || commune === null) return;
    setBusy(true);
    try {
      const res = await fetch("/api/envies", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...getAuthHeaders({ accessToken, userId: user?.id ?? null }),
        },
        body: JSON.stringify({
          activities: ACTIVITIES.filter((a) => selected.has(a.id)).map((a) => a.id),
          when_slot: when,
          commune,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        matched?: boolean;
        planId?: string;
        state?: EnvieResultState;
      };
      const state: EnvieResultState = data?.state ?? (data?.matched ? "formed" : "pending");
      setResultState(state);
      setResultPlanId(data?.planId ?? null);
      setSubmitted(true);
      setCount((c) => (c ?? 0) + 1);
      clearDraft();
    } catch {
      // on confirme quand même côté UX (l'envie sera retentée plus tard)
      setResultState("pending");
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  }, [accessToken, commune, selected, user?.id, when]);

  // Partage natif (mobile) avec repli copie de lien — moteur d'invitation.
  const sharePlan = useCallback(async () => {
    if (!resultPlanId) return;
    const url = `${window.location.origin}/plan/${resultPlanId}`;
    const text = "J'ai lancé un plan sur Meet42, viens compléter le groupe 👇";
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (nav.share) {
        await nav.share({ title: "Meet42", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNote("Lien copié — envoie-le à tes potes !");
    } catch {
      // partage annulé / indisponible — silencieux
    }
  }, [resultPlanId]);

  async function onSubmit() {
    if (!canSubmit || busy) return;
    if (status !== "authenticated") {
      // On sauvegarde l'envie AVANT de partir au login pour la rejouer au retour.
      writeDraft({ activities: [...selected], when, commune, replay: true });
      router.push("/login?next=" + encodeURIComponent("/#envie-panel"));
      return;
    }
    await submitEnvie();
  }

  // Au retour du login : si un replay est en attente et qu'on est authentifié,
  // on envoie l'envie automatiquement — l'utilisateur retrouve son groupe sans
  // refaire la sélection.
  useEffect(() => {
    if (!hydrated || !replayPending.current) return;
    if (status !== "authenticated") return;
    if (selected.size < 1 || commune === null) {
      replayPending.current = false;
      clearDraft();
      return;
    }
    replayPending.current = false;
    void submitEnvie();
  }, [hydrated, status, selected, commune, submitEnvie]);

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

      {/* Preuve sociale agrégée */}
      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--fire-ink)]">
        {count !== null && count > 0 ? (
          <>
            <span aria-hidden>🔥</span> {count} Bruxellois ont dit leur envie aujourd&apos;hui
          </>
        ) : (
          <>
            <span aria-hidden>✦</span> Sois le premier à dire ton envie aujourd&apos;hui
          </>
        )}
      </p>
      <p className="mt-1 text-sm text-[color:var(--ink-2)]">
        Tu choisis, on te place dans un groupe de 4–6. Zéro organisation — l&apos;anti-swipe.
      </p>

      <div className="mt-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-3)]">Qu&apos;est-ce qui te tente ?</div>
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
        <button type="button" disabled={!canSubmit || busy} onClick={onSubmit} className="meet42-join-btn mt-6">
          {busy ? "On enregistre…" : canSubmit ? "Trouve-moi un groupe" : "Choisis une envie et un coin"}
        </button>
      ) : resultState === "formed" && resultPlanId ? (
        <div className="mt-6 rounded-2xl border-2 border-[color:var(--fire)] bg-[color:var(--fire-wash)] p-4">
          <div className="text-base font-bold text-[color:var(--ink)]">🎉 Ton groupe est formé !</div>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--ink-2)]">
            On t&apos;a trouvé un groupe pour <span className="font-semibold text-[color:var(--ink)]">{activitiesLabel}</span> du côté de {communeLabel}. Ça se passe en vrai — découvre qui en est.
          </p>
          <button type="button" onClick={() => router.push(`/plan/${resultPlanId}`)} className="meet42-cta-primary mt-3 w-full">
            Voir mon groupe
          </button>
        </div>
      ) : (resultState === "joined" || resultState === "seeded") && resultPlanId ? (
        <div className="mt-6 rounded-2xl border-2 border-[color:var(--fire)] bg-[color:var(--fire-wash)] p-4">
          <div className="text-base font-bold text-[color:var(--ink)]">
            {resultState === "joined" ? "🙌 Tu as rejoint un groupe en formation" : "🚀 Ton plan est lancé"}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--ink-2)]">
            {resultState === "joined" ? (
              <>
                D&apos;autres veulent <span className="font-semibold text-[color:var(--ink)]">{activitiesLabel}</span> à {communeLabel} — tu es des leurs. Plus on est, mieux c&apos;est : ramène un pote.
              </>
            ) : (
              <>
                On a créé ton plan <span className="font-semibold text-[color:var(--ink)]">{activitiesLabel}</span> à {communeLabel}. Il s&apos;ouvre aux autres dès maintenant — invite un pote pour le remplir plus vite.
              </>
            )}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => router.push(`/plan/${resultPlanId}`)} className="meet42-cta-primary w-full sm:flex-1">
              Voir mon plan
            </button>
            <button type="button" onClick={sharePlan} className="meet42-cta-ghost w-full sm:flex-1">
              Inviter un pote
            </button>
          </div>
          {shareNote ? <p className="mt-2 text-xs font-semibold text-emerald-700">{shareNote}</p> : null}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-3)]/50 p-4">
          <div className="text-sm font-bold text-[color:var(--ink)]">C&apos;est noté 🎯</div>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--ink-2)]">
            On te cherche un groupe pour <span className="font-semibold text-[color:var(--ink)]">{activitiesLabel}</span> du côté de {communeLabel}. En attendant, lance le plan toi-même — d&apos;autres pourront le rejoindre tout de suite.
          </p>
          <button type="button" onClick={createDirect} className="meet42-cta-primary mt-3 w-full">
            Créer ce plan en direct
          </button>
        </div>
      )}
    </div>
  );
}
