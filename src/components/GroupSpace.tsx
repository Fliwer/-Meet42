"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { getAuthHeaders, apiFetchMyCheckin, apiSetMyCheckin } from "@/lib/plans/planApi";
import Avatar from "@/components/Avatar";
import type { GroupDto } from "@/app/api/plans/[id]/group/route";

/**
 * L'espace de groupe — le cœur émotionnel du 42.
 * Trois phases : avant (anticipation + « J'ai hâte »), le jour J (« J'arrive »),
 * après (« Belle rencontre »). Le Reveal (arrivée avec ?reveal=1) dévoile les
 * membres une à une. Toutes les infos personnelles restent internes au groupe.
 */

function mapsUrl(lat: number, lng: number, label: string) {
  const coords = `${lat},${lng}`;
  const q = label.trim() ? encodeURIComponent(`${label} (${coords})`) : encodeURIComponent(coords);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function whenLabel(iso: string) {
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

export default function GroupSpace({ planId, initialGroup }: { planId: string; initialGroup: GroupDto }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, user } = useAuth();
  const headers = { "content-type": "application/json", ...getAuthHeaders({ accessToken, userId: user?.id ?? null }) };

  const [group, setGroup] = useState<GroupDto>(initialGroup);
  const [hypeBusy, setHypeBusy] = useState(false);
  const [belleBusy, setBelleBusy] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<"on_my_way" | "arrived" | null>(null);
  const [checkinBusy, setCheckinBusy] = useState(false);

  // Le Reveal : on ne l'anime qu'à la première arrivée depuis un lien reveal
  const [revealing, setRevealing] = useState(
    () => searchParams.get("reveal") === "1" && initialGroup.phase !== "after"
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${planId}/group`, { headers: { ...getAuthHeaders({ accessToken, userId: user?.id ?? null }) } });
      if (res.ok) setGroup((await res.json()) as GroupDto);
    } catch {
      // silencieux
    }
  }, [planId, accessToken, user?.id]);

  useEffect(() => {
    if (group.phase !== "today") return;
    apiFetchMyCheckin({ planId, accessToken, userId: user?.id ?? null })
      .then((c) => setCheckin(c?.status ?? null))
      .catch(() => undefined);
  }, [group.phase, planId, accessToken, user?.id]);

  useEffect(() => {
    if (!revealing) return;
    const t = setTimeout(() => setRevealing(false), 900 + group.members.length * 260 + 400);
    return () => clearTimeout(t);
  }, [revealing, group.members.length]);

  async function toggleHype() {
    setHypeBusy(true);
    setGroup((g) => ({ ...g, i_am_hyped: !g.i_am_hyped, hype_count: g.hype_count + (g.i_am_hyped ? -1 : 1) }));
    try {
      await fetch(`/api/plans/${planId}/hype`, { method: "POST", headers });
    } finally {
      setHypeBusy(false);
      void refresh();
    }
  }

  async function toggleBelle(toUser: string, currentlyKept: boolean) {
    setBelleBusy(toUser);
    setGroup((g) => ({
      ...g,
      belles_given: currentlyKept ? g.belles_given.filter((u) => u !== toUser) : [...g.belles_given, toUser],
    }));
    try {
      await fetch(`/api/plans/${planId}/belle-rencontre`, {
        method: "POST",
        headers,
        body: JSON.stringify({ to_user: toUser, keep: !currentlyKept }),
      });
    } finally {
      setBelleBusy(null);
      void refresh();
    }
  }

  async function setMyCheckin(next: "on_my_way" | "arrived") {
    setCheckinBusy(true);
    try {
      await apiSetMyCheckin({ planId, status: next, accessToken, userId: user?.id ?? null });
      setCheckin(next);
    } finally {
      setCheckinBusy(false);
    }
  }

  const others = group.members.filter((m) => !m.is_me);
  const firstNames = others.map((m) => m.first_name);
  const namesLine =
    firstNames.length <= 1
      ? firstNames.join("")
      : `${firstNames.slice(0, -1).join(", ")} et ${firstNames[firstNames.length - 1]}`;

  return (
    <main className="min-h-screen bg-transparent px-4 pb-32">
      <div className="mx-auto max-w-2xl py-5 md:py-8">
        {/* En-tête */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm font-semibold text-[color:var(--ink-2)] hover:text-[color:var(--ink)]"
        >
          ← Accueil
        </button>

        <div className="mt-4">
          <span className="meet42-kicker">
            <span className="meet42-kicker-dot meet42-spark" aria-hidden />
            {group.phase === "after" ? "Ton 42 — c'était hier" : group.phase === "today" ? "Ton 42 — c'est aujourd'hui" : "Ton 42 est prêt"}
          </span>
          <h1 className="meet42-reveal-title font-display mt-1 text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-[color:var(--ink)] sm:text-[2.6rem]">
            {group.phase === "after" ? "Alors, c'était comment ?" : `Vous êtes ${group.members.length}.`}
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-[color:var(--ink-2)]">
            {whenLabel(group.start_time)}
          </p>
        </div>

        {/* Membres */}
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {group.members.map((m, i) => (
            <div
              key={m.user_id}
              className={revealing ? "meet42-reveal-card" : ""}
              style={revealing ? { animationDelay: `${300 + i * 260}ms` } : undefined}
            >
              <div
                className={
                  "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center " +
                  (m.is_me
                    ? "border-[color:var(--fire)] bg-[color:var(--fire-wash)]"
                    : "border-[color:var(--line)] bg-[color:var(--cream-2)]")
                }
              >
                <Avatar
                  src={m.photo_url}
                  name={m.first_name}
                  size={56}
                  className="h-14 w-14 rounded-full border-2 border-[color:var(--cream-2)] object-cover shadow-sm"
                  fallbackClassName="grid h-14 w-14 place-items-center rounded-full border-2 border-[color:var(--cream-2)] bg-[color:var(--espresso)] text-base font-bold text-[color:var(--cream)] shadow-sm"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[color:var(--ink)]">
                    {m.is_me ? "Toi" : m.first_name}
                  </div>
                  {m.age ? <div className="text-xs text-[color:var(--ink-3)]">{m.age} ans</div> : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Points communs */}
        {group.common_points.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--fire-ink)]">
              Vos points communs
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.common_points.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-[rgb(255_77_46_/_0.25)] bg-[color:var(--fire-wash)] px-3 py-1 text-sm font-semibold text-[color:var(--fire-ink)]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Brise-glace */}
        {group.icebreakers.length > 0 && group.phase !== "after" ? (
          <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-3)]/50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-3)]">
              Pour briser la glace
            </div>
            <ul className="mt-2 space-y-1.5">
              {group.icebreakers.map((ic) => (
                <li key={ic} className="flex gap-2 text-sm leading-relaxed text-[color:var(--ink)]">
                  <span aria-hidden className="text-[color:var(--fire)]">✦</span>
                  <span>{ic}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Lieu */}
        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-3)]">
                Point de rendez-vous
              </div>
              <div className="mt-1 text-sm font-semibold text-[color:var(--ink)]">{group.location_text}</div>
            </div>
            <a
              href={mapsUrl(group.lat, group.lng, group.location_text)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-xl border border-[color:var(--line-2)] bg-[color:var(--cream-3)] px-3 py-2 text-xs font-bold text-[color:var(--ink)] hover:bg-[color:var(--cream-2)]"
            >
              Itinéraire
            </a>
          </div>
        </div>

        {/* Action par phase */}
        {group.phase === "before" ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={toggleHype}
              disabled={hypeBusy}
              className={
                group.i_am_hyped
                  ? "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[color:var(--fire)] bg-[color:var(--fire-wash)] px-4 py-3.5 text-sm font-bold text-[color:var(--fire-ink)]"
                  : "meet42-join-btn"
              }
            >
              {group.i_am_hyped ? "🔥 T'as hâte — comme eux" : "J'ai hâte"}
            </button>
            <p className="mt-2 text-center text-xs font-semibold text-[color:var(--ink-2)]">
              {group.hype_count > 0
                ? `${group.hype_count} ${group.hype_count > 1 ? "personnes ont" : "personne a"} hâte d'y être`
                : "Sois le premier à le dire au groupe"}
            </p>
          </div>
        ) : null}

        {group.phase === "today" ? (
          <div className="mt-5 rounded-2xl border border-[rgb(255_77_46_/_0.3)] bg-[color:var(--fire-wash)] p-4">
            <div className="text-base font-bold text-[color:var(--ink)]">C&apos;est aujourd&apos;hui 🔥</div>
            <p className="mt-1 text-sm text-[color:var(--ink-2)]">
              {namesLine ? `${namesLine} t'attendent.` : "Ton groupe t'attend."} Préviens-les de ton arrivée.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setMyCheckin("on_my_way")}
                disabled={checkinBusy}
                className={
                  checkin === "on_my_way"
                    ? "flex-1 rounded-xl border-2 border-[color:var(--espresso)] bg-[color:var(--espresso)] px-3 py-2.5 text-sm font-bold text-[color:var(--cream)]"
                    : "flex-1 rounded-xl border-2 border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-3 py-2.5 text-sm font-semibold text-[color:var(--ink)]"
                }
              >
                🚶 En route
              </button>
              <button
                type="button"
                onClick={() => setMyCheckin("arrived")}
                disabled={checkinBusy}
                className={
                  checkin === "arrived"
                    ? "flex-1 rounded-xl border-2 border-emerald-500 bg-emerald-500 px-3 py-2.5 text-sm font-bold text-white"
                    : "flex-1 rounded-xl border-2 border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-3 py-2.5 text-sm font-semibold text-[color:var(--ink)]"
                }
              >
                ✅ J&apos;y suis
              </button>
            </div>
          </div>
        ) : null}

        {group.phase === "after" ? (
          <div className="mt-5">
            <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-4">
              <div className="text-base font-bold text-[color:var(--ink)]">Une belle rencontre ?</div>
              <p className="mt-1 text-sm leading-relaxed text-[color:var(--ink-2)]">
                Garde les personnes que tu aimerais recroiser. C&apos;est entre toi et nous — jamais montré à
                l&apos;autre. Si c&apos;est réciproque, on fera en sorte que vos chemins se recroisent.
              </p>
              <div className="mt-3 space-y-2">
                {others.map((m) => {
                  const kept = group.belles_given.includes(m.user_id);
                  const mutual = group.mutuals.includes(m.user_id);
                  return (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--cream-3)]/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={m.photo_url}
                          name={m.first_name}
                          size={36}
                          className="h-9 w-9 rounded-full object-cover"
                          fallbackClassName="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--espresso)] text-xs font-bold text-[color:var(--cream)]"
                        />
                        <div>
                          <div className="text-sm font-semibold text-[color:var(--ink)]">{m.first_name}</div>
                          {mutual ? (
                            <div className="text-xs font-semibold text-[color:var(--fire-ink)]">
                              ✨ Vous aimeriez vous revoir tous les deux
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleBelle(m.user_id, kept)}
                        disabled={belleBusy === m.user_id}
                        aria-pressed={kept}
                        className={
                          kept
                            ? "rounded-full border-2 border-[color:var(--fire)] bg-[color:var(--fire)] px-3.5 py-1.5 text-xs font-bold text-[#fff5f1]"
                            : "rounded-full border-2 border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-3.5 py-1.5 text-xs font-bold text-[color:var(--ink)] hover:border-[color:var(--fire)]"
                        }
                      >
                        {kept ? "♥ Gardé·e" : "Garder le lien"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
