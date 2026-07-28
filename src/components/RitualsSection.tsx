"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { getAuthHeaders } from "@/lib/plans/planApi";
import { track } from "@/lib/analytics";
import type { RitualSlotDto } from "@/app/api/rituals/route";

/**
 * « Ton prochain 42 » — l'entrée principale du produit.
 * Réservation 1-tap sur les rituels de la semaine ; le groupe et le lieu
 * sont révélés la veille à midi (le Reveal). La sélection survit au détour
 * par /login (brouillon localStorage + replay, même pattern que l'envie).
 */

const DRAFT_KEY = "meet42:ritual-draft";
const DRAFT_TTL_MS = 30 * 60 * 1000;

// Vraies photos d'ambiance par rituel (locales → jamais cassées en démo)
const RITUAL_PHOTO: Record<string, string> = {
  "jeudi-jeux": "/activities/escape.jpg",
  "samedi-cafe": "/activities/cafe.jpg",
  "dimanche-balade": "/activities/balade.jpg",
};

type RitualDraft = { ritual_id: string; replay: boolean; ts: number };

function readDraft(): RitualDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as RitualDraft;
    if (!d || typeof d.ts !== "number" || Date.now() - d.ts > DRAFT_TTL_MS) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

function writeDraft(d: Omit<RitualDraft, "ts">) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, ts: Date.now() }));
  } catch {
    // mode privé — on dégrade
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function formatWhenFr(iso: string): string {
  const s = new Intl.DateTimeFormat("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Brussels",
  }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** « Reveal demain midi », « Reveal aujourd'hui à midi »… */
function closesLabel(closesIso: string): string {
  const diffH = (new Date(closesIso).getTime() - Date.now()) / 3600000;
  if (diffH <= 0) return "Groupes en cours de formation";
  if (diffH <= 24) return "Le Reveal, c'est aujourd'hui midi";
  if (diffH <= 48) return "Reveal demain midi";
  return `Reveal la veille à midi`;
}

export default function RitualsSection() {
  const router = useRouter();
  const { status, accessToken, user } = useAuth();
  const [slots, setSlots] = useState<RitualSlotDto[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const replayRitual = useRef<string | null>(null);

  const authHeaders = useMemo(
    () => getAuthHeaders({ accessToken, userId: user?.id ?? null }),
    [accessToken, user?.id]
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/rituals", { headers: { ...authHeaders } });
      const data = (await res.json()) as { slots?: RitualSlotDto[] };
      if (Array.isArray(data.slots)) {
        setSlots([...data.slots].sort((a, b) => new Date(a.occurs_at).getTime() - new Date(b.occurs_at).getTime()));
      }
    } catch {
      // silencieux : la section skeleton reste
    }
  }, [authHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const d = readDraft();
    if (d?.replay) replayRitual.current = d.ritual_id;
    setHydrated(true);
  }, []);

  const reserve = useCallback(
    async (ritualId: string) => {
      setBusyId(ritualId);
      setNotice(null);
      try {
        const res = await fetch("/api/rituals/reserve", {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeaders },
          body: JSON.stringify({ ritual_id: ritualId }),
        });
        if (res.status === 409) {
          // Profil requis : /login affiche l'étape profil quand il manque
          writeDraft({ ritual_id: ritualId, replay: true });
          router.push("/login?next=" + encodeURIComponent("/#rituels"));
          return;
        }
        if (res.ok) {
          clearDraft();
          setNotice(null);
          track("reserve_42", { ritual_id: ritualId });
          await load();
        } else {
          setNotice("Impossible de réserver, réessaie dans un instant.");
        }
      } catch {
        setNotice("Impossible de réserver, réessaie dans un instant.");
      } finally {
        setBusyId(null);
      }
    },
    [authHeaders, load, router]
  );

  // Replay après login : on rejoue la réservation sauvegardée.
  useEffect(() => {
    if (!hydrated || !replayRitual.current) return;
    if (status !== "authenticated") return;
    const rid = replayRitual.current;
    replayRitual.current = null;
    clearDraft();
    void reserve(rid);
  }, [hydrated, status, reserve]);

  function onReserveClick(slot: RitualSlotDto) {
    if (status !== "authenticated") {
      writeDraft({ ritual_id: slot.id, replay: true });
      router.push("/login?next=" + encodeURIComponent("/#rituels"));
      return;
    }
    void reserve(slot.id);
  }

  async function onCancel(slot: RitualSlotDto) {
    setBusyId(slot.id);
    try {
      await fetch("/api/rituals/reserve", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders },
        body: JSON.stringify({ ritual_id: slot.id, action: "cancel" }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <span className="meet42-kicker">
        <span className="meet42-kicker-dot" aria-hidden />
        <span className="meet42-kicker-dot -ml-0.5" aria-hidden />
        Réserve ta place, on s&apos;occupe du reste
      </span>
      <h2 className="meet42-section-title mt-1 text-[1.8rem] sm:text-[2.2rem]">Ton prochain 42</h2>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[color:var(--ink-2)]">
        Une nouvelle activité chaque semaine — escape game, padel, café, bowling, balade… Un groupe de
        4 à 6, un lieu choisi pour vous. Tu découvres ton groupe la veille à midi : c&apos;est le Reveal.
      </p>

      {notice ? <p className="mt-3 text-sm font-medium text-red-600">{notice}</p> : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {slots === null ? (
          <>
            <div className="h-64 animate-pulse rounded-[1.7rem] bg-[color:var(--cream-2)]" aria-hidden />
            <div className="h-64 animate-pulse rounded-[1.7rem] bg-[color:var(--cream-2)]" aria-hidden />
          </>
        ) : (
          slots.map((slot, idx) => {
            const featured = idx === 0;
            const photo = RITUAL_PHOTO[slot.id] ?? "/activities/cafe.jpg";
            const inner = (
              <div className="flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--cream-2)]">
                {/* Bandeau photo — vraie ambiance, titre en overlay */}
                <div className="relative h-36 w-full overflow-hidden sm:h-44">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(29,22,13,0.72),rgba(29,22,13,0.12)_55%,transparent)]" />
                  <span
                    className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-2xl border border-white/25 bg-[rgba(29,22,13,0.5)] text-2xl backdrop-blur-sm"
                    aria-hidden
                  >
                    {slot.emoji}
                  </span>
                  <div className="absolute inset-x-4 bottom-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[rgb(246_239_230_/_0.85)]">
                      {featured ? "Le plus proche" : "Le week-end"} · {slot.communeLabel}
                    </p>
                    <h3 className="font-display text-[1.5rem] leading-tight font-semibold text-[#f6efe6] sm:text-[1.75rem]">
                      {slot.label}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                <p className="text-sm font-semibold text-[color:var(--ink-2)]">{formatWhenFr(slot.occurs_at)}</p>

                <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-2)]">{slot.tagline}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="meet42-spots-chip">
                    {slot.reserved_count > 0 ? (
                      <>
                        <span className="meet42-live-pulse" style={{ background: "var(--fire)" }} aria-hidden />
                        {slot.reserved_count} {slot.reserved_count > 1 ? "réservés" : "réservé"}
                      </>
                    ) : (
                      <>Sois le premier ou la première</>
                    )}
                  </span>
                  <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--cream-3)]/60 px-2.5 py-1 text-xs font-semibold text-[color:var(--ink-2)]">
                    {closesLabel(slot.closes_at)}
                  </span>
                </div>

                <div className="mt-auto pt-5">
                  {slot.my_status === "matched" && slot.my_plan_id ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/plan/${slot.my_plan_id}?reveal=1`)}
                      className="meet42-join-btn"
                    >
                      🔥 Ton groupe est prêt — découvre-le
                    </button>
                  ) : slot.my_status === "pending" ? (
                    <div>
                      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                        <span aria-hidden>✓</span> Tu es dedans. Le Reveal arrive la veille à midi.
                      </div>
                      <button
                        type="button"
                        disabled={busyId === slot.id}
                        onClick={() => onCancel(slot)}
                        className="mt-2 text-xs font-semibold text-[color:var(--ink-3)] underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        Libérer ma place
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === slot.id}
                      onClick={() => onReserveClick(slot)}
                      className="meet42-join-btn"
                    >
                      {busyId === slot.id ? "On te garde une place…" : "Réserver ma place"}
                    </button>
                  )}
                </div>
                </div>
              </div>
            );
            return featured ? (
              <div
                key={slot.id}
                className="group rounded-[1.7rem] bg-[linear-gradient(135deg,rgb(255_77_46_/_0.6),rgb(232_144_42_/_0.45))] p-[3px] shadow-[0_18px_40px_-22px_rgba(255,77,46,0.5)]"
              >
                {inner}
              </div>
            ) : (
              <div key={slot.id} className="group">{inner}</div>
            );
          })
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[color:var(--ink-3)]">
        Gratuit. Tu peux libérer ta place jusqu&apos;à la veille midi. Lieux publics uniquement.
      </p>
    </div>
  );
}
