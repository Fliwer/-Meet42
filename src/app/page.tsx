"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { apiFetchPlansAround, apiJoinPlan } from "@/lib/plans/planApi";
import PlanCard from "@/components/PlanCard";
import ProfileSetup from "@/components/ProfileSetup";
import { ACTIVITIES } from "@/lib/plans/activities";
import type { PlanSummary } from "@/lib/plans/planTypes";

const FALLBACK_CITY = { name: "Bruxelles", lat: 50.8466, lng: 4.3528 };

export default function Home() {
  const router = useRouter();
  const { status, accessToken, user, profileStatus } = useAuth();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({
    lat: FALLBACK_CITY.lat,
    lng: FALLBACK_CITY.lng,
  });
  /** `gps` = position navigateur ; `default` = Bruxelles / Ixelles (secours). */
  const [zoneSource, setZoneSource] = useState<"default" | "gps">("default");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [plansBusy, setPlansBusy] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);

  const authUserId = useMemo(() => user?.id ?? null, [user?.id]);
  const [activityFilter, setActivityFilter] = useState<string | null>(null);

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
      try {
        const list = await apiFetchPlansAround({
          lat,
          lng,
          radiusKm: 10,
          limit: 24,
          accessToken,
          userId: authUserId,
        });
        setPlans(list);
      } catch (err) {
        setPlansError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setPlansBusy(false);
      }
    },
    [accessToken, authUserId]
  );

  useEffect(() => {
    if (!coords) return;
    void loadPlans(coords.lat, coords.lng);
  }, [coords, loadPlans]);

  async function onJoin(planId: string) {
    setJoinError(null);
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }
    if (profileStatus === "missing") {
      router.push("/login");
      return;
    }

    try {
      await apiJoinPlan({ planId, accessToken, userId: authUserId });
      router.push(`/plan/${planId}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Impossible de rejoindre le plan");
    }
  }

  const activityHints = useMemo(() => ACTIVITIES.map((a) => a.emoji).slice(0, 5).join(" "), []);
  const filteredPlans = useMemo(() => {
    const base = plans;
    if (!activityFilter) return base;
    return base.filter((p) => p.activity === activityFilter);
  }, [activityFilter, plans]);

  // Priorité UX: si profil manquant, on le bloque.
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
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-5 md:p-6 text-white shadow-lg ring-1 ring-white/10">
          <div className="text-xs font-semibold tracking-wide text-amber-200/90">IRL · BRUXELLES & IXELLES · 4 À 6</div>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold leading-tight">
            Le rendez-vous réel, sans fil d’attente infini.
          </h1>
          <p className="mt-2 text-sm text-white/85 leading-relaxed">
            Pas de swipe, pas de likes. Tu proposes ou tu rejoins un plan concret — café, apéro, marche : {activityHints}.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-white/80">
            <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">Petits groupes = vraies conversations</div>
            <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">Annulation possible jusqu’à 24 h avant</div>
            <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">Gratuit pour l’essentiel — voir les offres</div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.push("/create")}
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 shadow-sm"
            >
              Créer un plan (10s)
            </button>
            <button
              type="button"
              onClick={() => router.push("/tarifs")}
              className="rounded-2xl border border-amber-300/50 bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-500/25"
            >
              Tarifs & Pro
            </button>
            <button
              type="button"
              onClick={() => {
                setCoords({ lat: FALLBACK_CITY.lat, lng: FALLBACK_CITY.lng });
                setZoneSource("default");
              }}
              className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 active:bg-white/15 sm:flex-initial"
            >
              {geoBusy ? "..." : "Bruxelles / Ixelles"}
            </button>
          </div>
          <div className="mt-3 text-xs text-white/70">
            Les plans sont classés par distance depuis le point choisi (ta position ou Bruxelles par défaut).
          </div>
        </div>

        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 md:p-5" aria-labelledby="why-title">
          <h2 id="why-title" className="text-sm font-semibold text-zinc-900">
            Pourquoi les gens reviennent (et pourquoi ça peut te rapporter avec Pro)
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3 text-sm text-zinc-600">
            <li className="rounded-xl bg-zinc-50 px-3 py-2 border border-zinc-100">
              <span className="font-semibold text-zinc-900">Clarté</span> — lieu + heure + taille du groupe, tout de suite.
            </li>
            <li className="rounded-xl bg-zinc-50 px-3 py-2 border border-zinc-100">
              <span className="font-semibold text-zinc-900">Respect</span> — règle 24 h pour éviter les désistements de
              dernière minute.
            </li>
            <li className="rounded-xl bg-zinc-50 px-3 py-2 border border-zinc-100">
              <span className="font-semibold text-zinc-900">Local</span> — pensé pour Bruxelles/Ixelles ; partenariats cafés
              & bars possibles avec l’offre Pro.
            </li>
          </ul>
        </section>

        <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-zinc-900">Zone actuelle</div>
              <div className="text-sm text-zinc-600">
                {zoneSource === "gps" ? (
                  <>
                    Autour de ta position ·{" "}
                    <span className="font-mono text-xs">
                      {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : ""}
                    </span>
                  </>
                ) : (
                  <>{FALLBACK_CITY.name} / Ixelles (par défaut)</>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={requestLocation}
              disabled={geoBusy}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 active:bg-zinc-950 disabled:opacity-50"
            >
              {geoBusy ? "…" : "Utiliser ma position"}
            </button>
          </div>
          {geoError ? <div className="mt-3 text-sm text-red-600">{geoError}</div> : null}
          <div className="mt-3 text-xs text-zinc-500">
            Autorise la géolocalisation dans le navigateur pour voir les plans les plus proches de toi. Tu peux revenir à
            Bruxelles avec le bouton du bandeau ci-dessus.
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Prochains plans</h2>
            <div className="text-xs text-zinc-500">{zoneSource === "gps" ? "Près de toi" : "Bruxelles / Ixelles"}</div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActivityFilter(null)}
              className={
                activityFilter === null
                  ? "shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                  : "shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-700 border border-zinc-200"
              }
            >
              Tout
            </button>
            {ACTIVITIES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setActivityFilter(a.id)}
                className={
                  activityFilter === a.id
                    ? "shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                    : "shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-700 border border-zinc-200"
                }
              >
                {a.emoji} {a.label}
              </button>
            ))}
          </div>

          {plansBusy ? (
            <div className="mt-4 space-y-3">
              <div className="h-28 rounded-2xl bg-zinc-200 animate-pulse" />
              <div className="h-28 rounded-2xl bg-zinc-200 animate-pulse" />
              <div className="h-28 rounded-2xl bg-zinc-200 animate-pulse" />
            </div>
          ) : null}

          {plansError ? <div className="mt-4 text-sm text-red-600">{plansError}</div> : null}
          {joinError ? <div className="mt-3 text-sm text-red-600">{joinError}</div> : null}

          {!plansBusy && !plansError && coords ? (
            <div className="mt-4 space-y-3 md:space-y-0 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3">
              {filteredPlans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4 md:col-span-2 xl:col-span-3">
                  <div className="text-sm font-semibold text-zinc-900">Aucun plan pour l’instant</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    Crée un plan simple (4–6 personnes). Ça marche même avec peu d’utilisateurs.
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/create")}
                    className="mt-3 w-full rounded-2xl bg-zinc-900 px-5 py-3 text-white font-semibold hover:bg-zinc-800 active:bg-zinc-950"
                  >
                    Créer mon plan
                  </button>
                </div>
              ) : null}
              {filteredPlans.map((p) => (
                <PlanCard key={p.id} plan={p} onJoin={() => onJoin(p.id)} />
              ))}
            </div>
          ) : null}

        </div>
      </div>
    </main>
  );
}

