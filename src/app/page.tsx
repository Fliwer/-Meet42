"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, isLikelyNetworkFailure } from "@/lib/api/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { apiFetchPlansAround, apiJoinPlan } from "@/lib/plans/planApi";
import EventCard, { EventCardEmpty, EventCardLoading } from "@/components/EventCard";
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

  const hasPlansToday = todayStats.plansToday > 0;
  const cityLabel = zoneSource === "gps" ? "Près de toi" : `En direct à ${FALLBACK_CITY.name}`;
  const isTonightActive =
    momentFilter === "today" && hasPlansToday && new Date().getHours() >= 15;

  if (status === "authenticated" && profileStatus === "missing") {
    return (
      <main className="min-h-screen bg-zinc-50">
        <div className="px-4 py-10">
          <ProfileSetup onDone={() => router.push("/")} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-28 md:pb-12">
        {/* Live strip — signaux réels */}
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-emerald-950 shadow-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
            ● Live
          </span>
          <span>{cityLabel}</span>
          {hasPlansToday ? (
            <>
              <span className="text-emerald-700/80" aria-hidden>
                ·
              </span>
              <span>
                {todayStats.plansToday} {todayStats.plansToday > 1 ? "plans" : "plan"} aujourd’hui
              </span>
              <span className="text-emerald-700/80" aria-hidden>
                ·
              </span>
              <span>
                {todayStats.peopleToday} {todayStats.peopleToday > 1 ? "participants" : "participant"}
              </span>
            </>
          ) : (
            <>
              <span className="text-emerald-700/80" aria-hidden>
                ·
              </span>
              <span>Sois le premier à lancer un plan aujourd’hui</span>
            </>
          )}
        </div>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 px-5 py-8 md:px-8 md:py-9 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl" />
          <h1 className="relative text-4xl md:text-5xl font-black tracking-tight leading-[1.05]">
            Rencontre du monde.
            <br />
            Fais quelque chose.
          </h1>
          <p className="relative mt-4 max-w-lg text-base md:text-lg text-zinc-200/95 leading-snug">
            Activités en petit groupe près de toi (4–6 personnes)
          </p>

          {hasPlansToday ? (
            <p className="relative mt-5 text-sm font-bold text-emerald-300 md:text-base">
              {todayStats.plansToday} {todayStats.plansToday > 1 ? "plans près de toi" : "plan près de toi"} aujourd’hui · {todayStats.peopleToday} {todayStats.peopleToday > 1 ? "participants" : "participant"}
            </p>
          ) : (
            <p className="relative mt-5 text-sm font-bold text-emerald-300 md:text-base">
              Propose une sortie, les premiers arrivent en quelques minutes
            </p>
          )}

          <div className="relative mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => document.getElementById("plans-feed")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl bg-white px-8 py-3.5 text-base font-black text-zinc-900 shadow-lg hover:bg-zinc-100 active:scale-[0.99] transition min-h-[52px]"
            >
              Voir les plans près de moi
            </button>
            <button
              type="button"
              onClick={() => router.push("/create")}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10 min-h-[44px] sm:ml-1"
            >
              Créer un plan
            </button>
          </div>
        </section>

        {isTonightActive ? (
          <div className="mt-4 rounded-2xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-950">
            Ce soir, c’est chaud — la plupart des plans sont aujourd’hui
          </div>
        ) : null}

        <section id="plans-feed" className="mt-5 scroll-mt-20">
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
              {displayPlans.map((p) => (
                <EventCard key={p.id} plan={p} onJoin={() => onJoinPlan(p)} disabled={joiningId === p.id} />
              ))}
            </div>
          ) : null}
        </section>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <TrustStrip />
        </div>
      </div>

      <div className="md:hidden fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 px-4 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <button
            type="button"
            onClick={() => router.push("/create")}
            className="w-full rounded-2xl bg-[#FF6B5B] px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-[#FF6B5B]/30 active:scale-[0.99] transition"
          >
            Créer un plan
          </button>
        </div>
      </div>
    </main>
  );
}
