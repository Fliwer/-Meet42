"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import ActivityPicker from "@/components/ActivityPicker";
import { ACTIVITIES, type ActivityId } from "@/lib/plans/activities";
import { apiCreatePlan, apiFetchMyPlans, apiFetchVenueAvailability } from "@/lib/plans/planApi";
import { CANCELLATION_POLICY_FR } from "@/lib/plans/cancellation";
import { QUICK_FORMATS } from "@/lib/plans/quickFormats";
import { COMMUNES, type CommuneId, type VenueAvailability } from "@/lib/venues/venueTypes";

const BRUSSELS_CENTER = { lat: 50.8466, lng: 4.3528 };
const DEFAULT_LATER_MINUTES = 30;
const VENUE_BASED_ACTIVITIES = new Set<ActivityId>(["bowling", "axe", "escape", "billiard"]);
const SAFE_FIRST_ACTIVITIES = new Set<ActivityId>(["coffee", "drinks", "talk", "walk"]);
const DENSE_SLOT_DAYS = new Set<number>([3, 5, 0]); // mercredi, vendredi, dimanche
const DENSE_SLOT_HOUR = 19;

type SuggestedSpot = { name: string; lat: number; lng: number };

const SUGGESTED_SPOTS: Record<ActivityId, SuggestedSpot[]> = {
  coffee: [
    { name: "OR Coffee Roasters (Centre)", lat: 50.8476, lng: 4.3526 },
    { name: "Mok Coffee (Dansaert)", lat: 50.8501, lng: 4.3448 },
    { name: "Café Capitale", lat: 50.8459, lng: 4.3571 },
  ],
  drinks: [
    { name: "Café Belga, Place Eugène Flagey 18, 1050 Ixelles", lat: 50.8258, lng: 4.3666 },
    { name: "L'Amère à Boire, Chaussée d'Ixelles 174, 1050 Ixelles", lat: 50.8353, lng: 4.3589 },
    { name: "Le Montmartre, Chaussée de Boondael 344, 1050 Ixelles", lat: 50.8181907, lng: 4.3852689 },
    { name: "Le Tavernier, Chaussée de Boondael 445, 1050 Ixelles", lat: 50.8154, lng: 4.3922 },
    { name: "Kokob, Rue de la Paix 10, 1050 Ixelles", lat: 50.8346, lng: 4.3609 },
    { name: "Le Pantin, Chaussée d'Ixelles 355, 1050 Ixelles", lat: 50.8245, lng: 4.3659 },
    { name: "Beer Mania, Chaussée de Wavre 174-176, 1050 Ixelles", lat: 50.8383, lng: 4.3728 },
    { name: "Le Cactus, Rue de Stassart 49, 1050 Ixelles", lat: 50.8385, lng: 4.3582 },
  ],
  talk: [
    { name: "Parc Tenbosch (coin calme), 1050 Ixelles", lat: 50.8248, lng: 4.3588 },
    { name: "Étangs d'Ixelles (promenade), 1050 Ixelles", lat: 50.8237, lng: 4.3737 },
    { name: "Place du Châtelain (terrasse), 1050 Ixelles", lat: 50.8268, lng: 4.3544 },
  ],
  music: [
    { name: "Bois de la Cambre (pelouse), 1000 Bruxelles", lat: 50.8111, lng: 4.3736 },
    { name: "Parc du Cinquantenaire (musique chill), 1000 Bruxelles", lat: 50.8399, lng: 4.3946 },
    { name: "Parc de Bruxelles (casque partagé), 1000 Bruxelles", lat: 50.843, lng: 4.3646 },
  ],
  bowling: [
    { name: "Crosly Bowling", lat: 50.8422, lng: 4.3906 },
    { name: "Bowling Stones", lat: 50.849, lng: 4.4342 },
  ],
  axe: [
    { name: "WoodCutter Ixelles", lat: 50.8279, lng: 4.3715 },
    { name: "Lancer de hache Bruxelles Centre", lat: 50.8487, lng: 4.3518 },
  ],
  escape: [
    { name: "Escape Hunt Brussels", lat: 50.848, lng: 4.3577 },
    { name: "Enygma Escape Rooms", lat: 50.8273, lng: 4.3498 },
  ],
  billiard: [
    { name: "Billard Royal Ixelles", lat: 50.8326, lng: 4.3604 },
    { name: "Golden 8 Pool Forest", lat: 50.8175, lng: 4.3342 },
  ],
  kicker: [
    { name: "Café Belga (kicker)", lat: 50.8258, lng: 4.3666 },
    { name: "Le Montmartre (kicker), Chaussée de Boondael 344, 1050 Ixelles", lat: 50.8181907, lng: 4.3852689 },
    { name: "Le Tavernier (kicker), Chaussée de Boondael 445, 1050 Ixelles", lat: 50.8154, lng: 4.3922 },
    { name: "Le Coq (kicker)", lat: 50.8481, lng: 4.3498 },
    { name: "De Markten (kicker)", lat: 50.8511, lng: 4.3482 },
  ],
  work: [
    { name: "Silversquare Bailli", lat: 50.8267, lng: 4.3601 },
    { name: "Silversquare Central", lat: 50.8467, lng: 4.3596 },
    { name: "The Mug Brussels (coworking café)", lat: 50.8474, lng: 4.3582 },
    { name: "WeWork Brussels Central", lat: 50.8466, lng: 4.3572 },
    { name: "Library Muntpunt (work spot)", lat: 50.8464, lng: 4.3559 },
  ],
  walk: [
    { name: "Parc de Bruxelles", lat: 50.843, lng: 4.3646 },
    { name: "Bois de la Cambre", lat: 50.8111, lng: 4.3736 },
    { name: "Parc du Cinquantenaire", lat: 50.8399, lng: 4.3946 },
  ],
};

function toDatetimeLocalValue(d: Date) {
  // YYYY-MM-DDTHH:mm (local time)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoToDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? toDatetimeLocalValue(d) : toDatetimeLocalValue(new Date());
}

function nextDenseSlots(count: number): Date[] {
  const out: Date[] = [];
  let cur = new Date();
  while (out.length < count) {
    const candidate = new Date(cur);
    candidate.setMinutes(0, 0, 0);
    candidate.setHours(DENSE_SLOT_HOUR, 0, 0, 0);
    if (candidate <= cur) candidate.setDate(candidate.getDate() + 1);
    while (!DENSE_SLOT_DAYS.has(candidate.getDay())) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(DENSE_SLOT_HOUR, 0, 0, 0);
    }
    out.push(candidate);
    cur = new Date(candidate);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export default function CreatePage() {
  const router = useRouter();
  const { status, accessToken, user, profileStatus, refreshProfile } = useAuth();
  const appliedFormatRef = useRef<string | null>(null);

  const userId = user?.id ?? null;
  const [step, setStep] = useState<1 | 2>(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activity, setActivity] = useState<ActivityId>(ACTIVITIES[0].id);

  const [useNow, setUseNow] = useState(true);
  const [datetimeLocal, setDatetimeLocal] = useState(() => {
    const d = new Date(Date.now() + DEFAULT_LATER_MINUTES * 60 * 1000);
    return toDatetimeLocalValue(d);
  });

  const [locationText, setLocationText] = useState("Bruxelles centre");

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(BRUSSELS_CENTER);

  const [maxParticipants, setMaxParticipants] = useState<4 | 5 | 6>(6);
  const [selectedCommune, setSelectedCommune] = useState<CommuneId>("ixelles");
  const [venueBusy, setVenueBusy] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [venueSlots, setVenueSlots] = useState<VenueAvailability[]>([]);
  const [isFirstExperienceUser, setIsFirstExperienceUser] = useState<boolean | null>(null);

  const applyQuickFormat = useCallback((formatId: string) => {
    const format = QUICK_FORMATS.find((f) => f.id === formatId);
    if (!format) return;
    setActivity(format.activity);
    setUseNow(false);
    setDatetimeLocal(toDatetimeLocalValue(new Date(Date.now() + format.minutesFromNow * 60 * 1000)));
    setLocationText(format.locationText);
    setCoords({ lat: format.lat, lng: format.lng });
    setMaxParticipants(format.maxParticipants);
    setStep(2);
  }, []);

  useEffect(() => {
    // Guard UX: si pas authentifié/profil => on redirige.
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }
    if (profileStatus === "missing") {
      router.push("/login");
      return;
    }
  }, [profileStatus, router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    let cancelled = false;
    apiFetchMyPlans({ accessToken, userId })
      .then((rows) => {
        if (!cancelled) setIsFirstExperienceUser(rows.length === 0);
      })
      .catch(() => {
        if (!cancelled) setIsFirstExperienceUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, status, userId]);

  useEffect(() => {
    const formatId = new URLSearchParams(window.location.search).get("format");
    if (!formatId) return;
    if (appliedFormatRef.current === formatId) return;
    appliedFormatRef.current = formatId;
    applyQuickFormat(formatId);
  }, [applyQuickFormat]);

  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("activity");
    if (!a) return;
    if (ACTIVITIES.some((x) => x.id === a)) setActivity(a as ActivityId);
  }, []);

  const startTimeIso = useMemo(() => {
    if (useNow) return new Date().toISOString();
    const parsed = new Date(datetimeLocal);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
  }, [datetimeLocal, useNow]);

  const startTimeLabel = useMemo(() => {
    const d = new Date(startTimeIso);
    return d.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }, [startTimeIso]);

  async function onCreate() {
    setCreating(true);
    setError(null);
    try {
      if (!coords) throw new Error("Impossible de récupérer la position");
      if (!locationText.trim()) throw new Error("Ajoute un lieu");

      // Sécurité UI: rafraîchir profil si nécessaire
      await refreshProfile().catch(() => undefined);

      const res = await apiCreatePlan({
        payload: {
          activity,
          start_time_iso: startTimeIso,
          location_text: locationText.trim(),
          lat: coords.lat,
          lng: coords.lng,
          max_participants: maxParticipants,
        },
        accessToken,
        userId,
      });

      router.push(`/plan/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  const selectedMeta = ACTIVITIES.find((a) => a.id === activity);
  const suggestedSpots = SUGGESTED_SPOTS[activity] ?? [];
  const venueBased = VENUE_BASED_ACTIVITIES.has(activity);
  const safeActivityOptions = useMemo(() => ACTIVITIES.filter((a) => SAFE_FIRST_ACTIVITIES.has(a.id)), []);
  const denseSlots = useMemo(() => nextDenseSlots(6), []);
  const firstExperienceMode = isFirstExperienceUser === true;
  const slotsByVenue = useMemo(() => {
    const map = new Map<string, { venueName: string; locationText: string; slots: VenueAvailability[] }>();
    for (const s of venueSlots) {
      const e = map.get(s.venue_id);
      if (e) {
        e.slots.push(s);
      } else {
        map.set(s.venue_id, {
          venueName: s.venue_name,
          locationText: s.location_text,
          slots: [s],
        });
      }
    }
    return Array.from(map.values());
  }, [venueSlots]);

  useEffect(() => {
    if (!venueBased || step !== 2) return;
    let cancelled = false;
    setVenueBusy(true);
    setVenueError(null);
    apiFetchVenueAvailability({
      activity,
      commune: selectedCommune,
      accessToken,
      userId,
    })
      .then((items) => {
        if (cancelled) return;
        setVenueSlots(items);
      })
      .catch((err) => {
        if (cancelled) return;
        setVenueError(err instanceof Error ? err.message : "Impossible de charger les créneaux");
      })
      .finally(() => {
        if (!cancelled) setVenueBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activity, accessToken, selectedCommune, step, userId, venueBased]);

  useEffect(() => {
    if (!firstExperienceMode) return;
    if (!SAFE_FIRST_ACTIVITIES.has(activity)) {
      setActivity("coffee");
    }
  }, [activity, firstExperienceMode]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8">
        <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
          Chargement...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4">
      <div className="max-w-3xl mx-auto py-6 md:py-9">
        <div className="rounded-3xl border border-zinc-200/80 bg-white px-5 py-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Création rapide</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">Choisis ton prochain moment</h1>
          <p className="mt-2 text-sm text-zinc-600">Prends un format standard ou personnalise, puis publie en moins d’une minute.</p>
          <div className="mt-4 flex items-center gap-2">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={
                  step === n
                    ? "grid h-7 w-7 place-items-center rounded-full bg-zinc-900 text-xs font-semibold text-white"
                    : step > n
                      ? "grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800"
                      : "grid h-7 w-7 place-items-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500"
                }
              >
                {n}
              </div>
            ))}
            <div className="ml-2 text-xs font-medium text-zinc-500">
              {step === 1 ? "Activité" : "Quand & où — publier"}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
          {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}

          {step === 1 ? (
            <>
              <div className="text-sm font-semibold text-zinc-900">Étape 1: choisis une activité</div>
              {firstExperienceMode ? (
                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Safe mode premier event: activités publiques et neutres pour maximiser une première expérience réussie.
                </div>
              ) : null}
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {QUICK_FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => applyQuickFormat(f.id)}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-left hover:bg-zinc-100"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Format standard</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900">{f.title}</div>
                    <div className="mt-0.5 text-xs text-zinc-600">{f.subtitle}</div>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                {firstExperienceMode ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {safeActivityOptions.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setActivity(a.id)}
                        className={
                          activity === a.id
                            ? "rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                            : "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800"
                        }
                      >
                        {a.emoji} {a.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <ActivityPicker value={activity} onChange={(v) => setActivity(v)} />
                )}
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  className="rounded-2xl bg-zinc-900 px-5 py-3 text-white font-semibold hover:bg-zinc-800 active:bg-zinc-950 flex-1"
                  onClick={() => setStep(2)}
                >
                  Continuer
                </button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="text-sm font-semibold text-zinc-900">Étape 2: heure & lieu</div>

              <div className="mt-4 rounded-2xl bg-zinc-50 border border-zinc-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-900">Heure</div>
                  <div className="text-xs text-zinc-500">{selectedMeta?.emoji} {selectedMeta?.label}</div>
                </div>

                <div className="mt-2 text-xs text-zinc-600">Créneaux denses recommandés (mer/ven/dim à 19h)</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {denseSlots.map((slot) => {
                    const value = toDatetimeLocalValue(slot);
                    const selected = !useNow && datetimeLocal === value;
                    return (
                      <button
                        key={slot.toISOString()}
                        type="button"
                        onClick={() => {
                          setUseNow(false);
                          setDatetimeLocal(value);
                        }}
                        className={
                          selected
                            ? "rounded-xl bg-zinc-900 px-3 py-2 text-left text-sm font-semibold text-white"
                            : "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm font-semibold text-zinc-800"
                        }
                      >
                        {slot.toLocaleDateString("fr-BE", { weekday: "short", day: "2-digit", month: "2-digit" })} ·{" "}
                        {slot.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                      </button>
                    );
                  })}
                </div>

                {!firstExperienceMode ? (
                  <div className="mt-3">
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className={
                          useNow
                            ? "flex-1 rounded-xl bg-zinc-900 text-white py-2 text-sm font-semibold"
                            : "flex-1 rounded-xl bg-white text-zinc-900 py-2 text-sm font-semibold border border-zinc-200"
                        }
                        onClick={() => setUseNow(true)}
                      >
                        Maintenant
                      </button>
                      <button
                        type="button"
                        className={
                          !useNow
                            ? "flex-1 rounded-xl bg-zinc-900 text-white py-2 text-sm font-semibold"
                            : "flex-1 rounded-xl bg-white text-zinc-900 py-2 text-sm font-semibold border border-zinc-200"
                        }
                        onClick={() => setUseNow(false)}
                      >
                        Heure personnalisée
                      </button>
                    </div>
                    {!useNow ? (
                      <label className="mt-3 flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900">Date & heure</span>
                        <input
                          type="datetime-local"
                          className="rounded-xl border border-zinc-200 px-3 py-2"
                          value={datetimeLocal}
                          onChange={(e) => setDatetimeLocal(e.target.value)}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-zinc-900">Lieu du rendez-vous</span>
                  <span className="text-xs text-zinc-600">Écris une adresse ou un repère, ou choisis une suggestion ci-dessous.</span>
                  <input
                    className="rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="Ex : Café Belga, Place Flagey, 1050 Ixelles"
                  />
                </label>

                {venueBased ? (
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="text-xs font-semibold text-zinc-700">Disponibilités partenaires par commune</div>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {COMMUNES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCommune(c.id)}
                          className={
                            selectedCommune === c.id
                              ? "shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white"
                              : "shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700"
                          }
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    {venueBusy ? <div className="mt-3 text-xs text-zinc-500">Chargement des créneaux…</div> : null}
                    {venueError ? <div className="mt-3 text-xs text-red-600">{venueError}</div> : null}
                    {!venueBusy && !venueError ? (
                      <div className="mt-3 space-y-2">
                        {slotsByVenue.length === 0 ? (
                          <div className="text-xs text-zinc-500">
                            Aucun créneau trouvé pour cette commune. Essaie une autre commune.
                          </div>
                        ) : null}
                        {slotsByVenue.map((group) => (
                          <div key={group.venueName} className="rounded-xl border border-zinc-200 bg-white p-2.5">
                            <div className="text-xs font-semibold text-zinc-800">{group.venueName}</div>
                            <div className="text-[11px] text-zinc-500">{group.locationText}</div>
                            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                              {group.slots.map((slot) => {
                                const d = new Date(slot.slot_start_iso);
                                const label = `${d.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("fr-BE", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`;
                                const full = slot.spots_left <= 0;
                                return (
                                  <button
                                    key={`${slot.venue_id}-${slot.slot_start_iso}`}
                                    type="button"
                                    disabled={full}
                                    onClick={() => {
                                      setUseNow(false);
                                      setDatetimeLocal(isoToDatetimeLocalValue(slot.slot_start_iso));
                                      setLocationText(slot.location_text);
                                      setCoords({ lat: slot.lat, lng: slot.lng });
                                    }}
                                    className={
                                      full
                                        ? "shrink-0 rounded-lg border border-zinc-200 bg-zinc-100 px-2 py-1 text-[11px] text-zinc-400"
                                        : "shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-900"
                                    }
                                  >
                                    {label} · {slot.spots_left}/{slot.capacity_total}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border-2 border-zinc-200 bg-gradient-to-b from-white to-zinc-50/90 p-4 shadow-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-base font-bold text-zinc-900">Lieux réels suggérés</h3>
                      {activity === "work" ? (
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Travail</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">
                      Un clic remplit le champ au-dessus avec l’adresse (tu peux encore l’éditer).
                    </p>
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {suggestedSpots.map((spot) => (
                        <li key={spot.name}>
                          <button
                            type="button"
                            onClick={() => {
                              setLocationText(spot.name);
                              setCoords({ lat: spot.lat, lng: spot.lng });
                            }}
                            className="flex w-full min-h-[3.25rem] items-center rounded-xl border-2 border-zinc-200 bg-white px-3 py-2.5 text-left text-sm font-medium leading-snug text-zinc-900 shadow-sm transition hover:border-zinc-900 hover:bg-zinc-50 active:scale-[0.99]"
                          >
                            <span className="mr-2 shrink-0 text-lg" aria-hidden>
                              📍
                            </span>
                            <span className="min-w-0 flex-1">{spot.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-sm font-semibold text-zinc-900">Taille du groupe</div>
                <div className="mt-2 flex gap-2">
                  {[4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={
                        maxParticipants === n
                          ? "flex-1 rounded-xl bg-zinc-900 text-white py-2.5 text-sm font-semibold"
                          : "flex-1 rounded-xl bg-white text-zinc-900 py-2.5 text-sm font-semibold border border-zinc-200"
                      }
                      onClick={() => setMaxParticipants(n as 4 | 5 | 6)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-500">Petits groupes uniquement — c’est notre promesse.</p>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white p-3">
                <div className="text-sm font-semibold text-zinc-900">Résumé express</div>
                <div className="mt-2 text-sm text-zinc-700 space-y-0.5">
                  <div>
                    {selectedMeta?.emoji} {selectedMeta?.label}
                  </div>
                  <div>{useNow ? "Maintenant" : startTimeLabel}</div>
                  <div className="line-clamp-2">{locationText}</div>
                  <div className="font-medium text-zinc-900">Jusqu’à {maxParticipants} personnes</div>
                </div>
                <p className="mt-3 text-xs text-zinc-600 leading-relaxed border-t border-zinc-100 pt-3">{CANCELLATION_POLICY_FR}</p>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  className="rounded-2xl bg-white px-5 py-3.5 text-zinc-900 font-semibold border border-zinc-200 flex-1 min-h-[48px]"
                  onClick={() => setStep(1)}
                >
                  Retour
                </button>
                <button
                  type="button"
                  disabled={creating}
                  className="rounded-2xl bg-zinc-900 px-5 py-3.5 text-white font-semibold hover:bg-zinc-800 active:bg-zinc-950 disabled:opacity-50 flex-1 min-h-[48px]"
                  onClick={onCreate}
                >
                  {creating ? "Publication…" : "Publier le plan"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}

