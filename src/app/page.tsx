"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ApiError, isLikelyNetworkFailure } from "@/lib/api/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { apiFetchPlansAround, apiJoinPlan } from "@/lib/plans/planApi";
import EventCard, { EventCardEmpty, EventCardLoading } from "@/components/EventCard";
import Avatar from "@/components/Avatar";
import EnviePanel from "@/components/EnviePanel";
import ProfileSetup from "@/components/ProfileSetup";
import { QUICK_FORMATS } from "@/lib/plans/quickFormats";
import type { PlanSummary } from "@/lib/plans/planTypes";
import { matchesMoment, type MomentFilter } from "@/lib/plans/feed";
import TrustStrip from "@/components/TrustStrip";

const FALLBACK_CITY = { name: "Bruxelles", lat: 50.8466, lng: 4.3528 };

const ACTIVITY_FILTERS: { id: string | null; label: string; emoji: string }[] = [
  { id: null, label: "Tout", emoji: "✨" },
  { id: "coffee", label: "Café", emoji: "☕" },
  { id: "drinks", label: "Apéro", emoji: "🍻" },
  { id: "walk", label: "Balade", emoji: "🚶" },
];

function isHappeningSoon(iso: string, windowMin: number) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  return t >= now && t <= now + windowMin * 60 * 1000;
}

export default function Home() {
  const router = useRouter();
  const { status, accessToken, user, profileStatus } = useAuth();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({
    lat: FALLBACK_CITY.lat,
    lng: FALLBACK_CITY.lng,
  });
  const [zoneSource, setZoneSource] = useState<"default" | "gps">("default");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [plansBusy, setPlansBusy] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [plansErrorNetwork, setPlansErrorNetwork] = useState(false);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const authUserId = useMemo(() => user?.id ?? null, [user?.id]);
  const [activityFilter, setActivityFilter] = useState<string | null>(null);
  const [momentFilter, setMomentFilter] = useState<MomentFilter>("today");

  async function requestLocation() {
    setGeoBusy(true);
    setGeoError(null);
    try {
      if (!navigator.geolocation) throw new Error("Géolocalisation indisponible");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setZoneSource("gps");
          setGeoBusy(false);
        },
        (err) => {
          setGeoBusy(false);
          setGeoError(err.message || "Impossible d’obtenir ta position");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } catch (err) {
      setGeoBusy(false);
      setGeoError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const loadPlans = useCallback(
    async (lat: number, lng: number) => {
      setPlansBusy(true);
      setPlansError(null);
      setPlansErrorNetwork(false);
      try {
        const list = await apiFetchPlansAround({
          lat,
          lng,
          radiusKm: 12,
          limit: 36,
          accessToken,
          userId: authUserId,
        });
        setPlans(list);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur de chargement";
        const network =
          (err instanceof ApiError && err.kind === "network") ||
          (!(err instanceof ApiError) && isLikelyNetworkFailure(err));
        setPlansError(message);
        setPlansErrorNetwork(network);
      } finally {
        setPlansBusy(false);
      }
    },
    [accessToken, authUserId]
  );

  useEffect(() => {
    if (status === "loading") return;
    if (!coords) return;
    void loadPlans(coords.lat, coords.lng);
  }, [coords, loadPlans, status]);

  async function onJoinPlan(plan: PlanSummary) {
    setJoinError(null);
    if (status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(`/plan/${plan.id}`)}`);
      return;
    }
    if (profileStatus === "missing") {
      router.push("/");
      return;
    }

    setJoiningId(plan.id);
    try {
      await apiJoinPlan({ planId: plan.id, accessToken, userId: authUserId });
      router.push(`/plan/${plan.id}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Impossible de rejoindre ce plan");
    } finally {
      setJoiningId(null);
    }
  }

  const displayPlans = useMemo(() => {
    if (!coords || plansBusy || plansError) return []; // pas de grille tant que le chargement a échoué
    return plans
      .filter((p) => {
        if (activityFilter && p.activity !== activityFilter) return false;
        return matchesMoment(p.start_time, momentFilter);
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [activityFilter, coords, momentFilter, plans, plansBusy, plansError]);

  const todayStats = useMemo(() => {
    const today = plans.filter((p) => matchesMoment(p.start_time, "today"));
    const plansToday = today.length;
    const peopleToday = today.reduce((s, p) => s + p.participants_count, 0);
    const happeningNow = today.filter((p) => isHappeningSoon(p.start_time, 180)).length;
    return { plansToday, peopleToday, happeningNow };
  }, [plans]);

  // « Ton 42 » : le meilleur plan du jour choisi pour toi
  // (à venir, pas déjà rejoint, pas complet, le plus proche dans le temps).
  const ton42 = useMemo(() => {
    const now = Date.now();
    return (
      [...plans]
        .filter(
          (p) =>
            new Date(p.start_time).getTime() >= now &&
            !p.is_joined &&
            p.participants_count < p.max_participants
        )
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] ?? null
    );
  }, [plans]);

  const heroFaces = useMemo(() => {
    const faces: { first_name: string; photo_url: string | null }[] = [];
    for (const p of plans) {
      for (const f of p.participant_preview ?? []) {
        if (faces.length >= 5) break;
        faces.push(f);
      }
      if (faces.length >= 5) break;
    }
    return faces;
  }, [plans]);

  const hasPlansToday = todayStats.plansToday > 0;
  const isTonightActive =
    momentFilter === "today" && hasPlansToday && new Date().getHours() >= 15;

  if (status === "authenticated" && profileStatus === "missing") {
    return (
      <main className="min-h-screen bg-transparent">
        <div className="px-4 py-10">
          <ProfileSetup onDone={() => router.push("/")} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent">
      {/* Hero full-bleed cinématique */}
      <section className="meet42-hero--photo relative isolate flex min-h-[50vh] sm:min-h-[88vh] items-end overflow-hidden">
        <Image src="/hero2.jpg" alt="" fill priority sizes="100vw" className="meet42-hero-img object-[92%_38%] sm:object-[center_38%]" />
        <div className="meet42-hero-scrim" aria-hidden />
        <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-10 pt-16 pb-10 sm:pt-28 sm:pb-16 md:pb-24">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[rgb(255_246_236_/_0.85)]">
            <span className="meet42-live-pulse" aria-hidden style={{ background: "#15a05c" }} />
            {hasPlansToday
              ? `En direct · ${FALLBACK_CITY.name} · ${todayStats.plansToday} ${todayStats.plansToday > 1 ? "plans" : "plan"} ce soir`
              : `En direct · ${FALLBACK_CITY.name}`}
          </span>

          <h1 className="font-display mt-4 max-w-3xl text-[1.95rem] leading-[1.0] sm:text-[4.2rem] sm:leading-[0.95] md:text-[5.4rem] font-semibold tracking-[-0.02em] text-[#f6efe6]">
            Rencontre du monde.
            <span className="block">
              <span className="meet42-underline">Fais quelque chose.</span>
            </span>
          </h1>

          <p className="mt-3 max-w-lg text-[15px] sm:text-xl leading-snug text-[rgb(255_246_236_/_0.9)]">
            Des sorties à 4–6 personnes près de toi — un café, un apéro, une balade. Tu rejoins, tu viens, tu rencontres. Pas de swipe.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => document.getElementById("envie-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="meet42-cta-primary w-full sm:w-auto"
            >
              Dis ton envie ce soir
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("plans-feed")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="meet42-cta-ghost w-full sm:w-auto"
            >
              Parcourir les plans
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3">
            {heroFaces.length > 0 ? (
              <div className="flex -space-x-2" aria-hidden>
                {heroFaces.map((f, i) => (
                  <Avatar
                    key={`${f.first_name}-${i}`}
                    src={f.photo_url}
                    name={f.first_name}
                    className="meet42-avatar"
                    fallbackClassName="meet42-avatar-fallback"
                  />
                ))}
              </div>
            ) : null}
            <p className="text-sm font-semibold text-[rgb(255_246_236_/_0.9)]">
              {hasPlansToday
                ? `${todayStats.peopleToday} participant·es · ${todayStats.plansToday} ${todayStats.plansToday > 1 ? "plans" : "plan"} aujourd’hui`
                : "Sois le premier à lancer un plan aujourd’hui."}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 pb-28 md:pb-12">

        <section id="envie-panel" className="pt-8 scroll-mt-24">
          <EnviePanel />
        </section>

        {ton42 ? (
          <section className="pt-8" aria-label="Ton 42 du jour">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <span className="meet42-kicker">
                  <span className="meet42-kicker-dot" aria-hidden />
                  <span className="meet42-kicker-dot -ml-0.5" aria-hidden />
                  Ton 42 · choisi pour toi
                </span>
                <h2 className="meet42-section-title mt-1 text-[1.8rem] sm:text-[2.2rem]">Ta rencontre du jour</h2>
              </div>
              <span className="hidden shrink-0 text-xs font-semibold text-[color:var(--ink-3)] sm:inline">1 par jour</span>
            </div>
            <div className="rounded-[1.7rem] bg-[linear-gradient(135deg,rgb(255_77_46_/_0.6),rgb(232_144_42_/_0.45))] p-[3px] shadow-[0_18px_40px_-22px_rgba(255,77,46,0.5)]">
              <EventCard plan={ton42} onJoin={() => onJoinPlan(ton42)} disabled={joiningId === ton42.id} />
            </div>
          </section>
        ) : null}

        {isTonightActive ? (
          <div className="mt-4 rounded-2xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-950">
            Ce soir, c’est chaud — la plupart des plans sont aujourd’hui
          </div>
        ) : null}

        <section id="plans-feed" className="mt-10 scroll-mt-20">
          <div className="mb-5 flex items-end gap-3">
            <h2 className="meet42-section-title text-[1.8rem] sm:text-[2.2rem]">
              {momentFilter === "today" ? "Aujourd’hui" : "Demain"}
              <span className="text-[color:var(--fire)]"> à Bruxelles</span>
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Quand">
              {(
                [
                  { id: "today" as const, label: "Aujourd’hui" },
                  { id: "tomorrow" as const, label: "Demain" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMomentFilter(m.id)}
                  className={
                    momentFilter === m.id
                      ? "rounded-full border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-black text-white"
                      : "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Activité">
              {ACTIVITY_FILTERS.map((a) => (
                <button
                  key={a.id ?? "all"}
                  type="button"
                  onClick={() => setActivityFilter(a.id)}
                  className={
                    activityFilter === a.id
                      ? "rounded-full border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-black text-white"
                      : "rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
                  }
                >
                  <span aria-hidden>{a.emoji}</span> {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-700">
              {zoneSource === "gps" ? "Autour de ta position" : `Autour de ${FALLBACK_CITY.name}`}
            </span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={requestLocation}
              disabled={geoBusy}
              className="font-bold text-zinc-900 underline-offset-2 hover:underline disabled:opacity-50"
            >
              {geoBusy ? "…" : "Utiliser ma position"}
            </button>
            {geoError ? <span className="text-red-600">{geoError}</span> : null}
          </div>

          {plansBusy ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <EventCardLoading />
              <EventCardLoading />
              <EventCardLoading />
              <EventCardLoading />
              <EventCardLoading />
              <EventCardLoading />
            </div>
          ) : null}

          {!plansBusy && plansError && plansErrorNetwork ? (
            <div
              className="mt-5 rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6 sm:p-8 text-center shadow-sm"
              role="alert"
            >
              <p className="text-lg font-black text-rose-950">Connexion impossible</p>
              <p className="mt-2 text-sm leading-relaxed text-rose-900/90">{plansError}</p>
              <button
                type="button"
                onClick={() => {
                  if (!coords) return;
                  void loadPlans(coords.lat, coords.lng);
                }}
                className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-rose-900 px-8 py-3 text-sm font-black text-white shadow-md hover:bg-rose-950 active:scale-[0.99]"
              >
                Réessayer
              </button>
            </div>
          ) : null}
          {!plansBusy && plansError && !plansErrorNetwork ? (
            <div className="mt-4 text-sm font-medium text-red-600" role="alert">
              {plansError}
            </div>
          ) : null}
          {joinError ? <div className="mt-2 text-sm font-medium text-red-600">{joinError}</div> : null}

          {!plansBusy && !plansError && coords ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayPlans.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EventCardEmpty onCreate={() => router.push(`/create?format=${QUICK_FORMATS[0]?.id ?? ""}`)} />
                </div>
              ) : null}
              {displayPlans.map((p, idx) => (
                <div
                  key={p.id}
                  className="meet42-rise"
                  style={{ animationDelay: `${Math.min(idx, 8) * 55}ms` }}
                >
                  <EventCard plan={p} onJoin={() => onJoinPlan(p)} disabled={joiningId === p.id} />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <div className="mt-12">
          <span className="meet42-kicker mb-3">
            <span className="meet42-kicker-dot" aria-hidden /> Pourquoi c’est safe
          </span>
          <TrustStrip />
        </div>
      </div>

    </main>
  );
}
