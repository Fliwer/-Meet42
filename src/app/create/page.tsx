"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import ActivityPicker from "@/components/ActivityPicker";
import { ACTIVITIES, type ActivityId } from "@/lib/plans/activities";
import { apiCreatePlan, apiFetchVenueAvailability } from "@/lib/plans/planApi";
import { CANCELLATION_POLICY_FR } from "@/lib/plans/cancellation";
import { COMMUNES, type CommuneId, type VenueAvailability } from "@/lib/venues/venueTypes";

const BRUSSELS_CENTER = { lat: 50.8466, lng: 4.3528 };
const DEFAULT_LATER_MINUTES = 30;
const VENUE_BASED_ACTIVITIES = new Set<ActivityId>(["bowling", "axe", "escape", "billiard"]);

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

export default function CreatePage() {
  const router = useRouter();
  const { status, accessToken, user, profileStatus, refreshProfile } = useAuth();

  const userId = user?.id ?? null;
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
      <div className="max-w-2xl mx-auto py-6 md:py-8">
        <h1 className="text-2xl font-bold text-zinc-900">Créer un plan</h1>
        <p className="mt-1 text-zinc-600">3 étapes. Petits groupes. Tu passes à l’IRL vite.</p>

        <div className="mt-5 flex items-center gap-2 text-xs text-zinc-600">
          <span className={step === 1 ? "font-semibold text-zinc-900" : ""}>1</span>
          <span>/</span>
          <span className={step === 2 ? "font-semibold text-zinc-900" : ""}>2</span>
          <span>/</span>
          <span className={step === 3 ? "font-semibold text-zinc-900" : ""}>3</span>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
          {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}

          {step === 1 ? (
            <>
              <div className="text-sm font-semibold text-zinc-900">Étape 1: choisis une activité</div>
              <div className="mt-3">
                <ActivityPicker value={activity} onChange={(v) => setActivity(v)} />
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

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className={useNow ? "flex-1 rounded-xl bg-zinc-900 text-white py-2 text-sm font-semibold" : "flex-1 rounded-xl bg-white text-zinc-900 py-2 text-sm font-semibold border border-zinc-200"}
                    onClick={() => setUseNow(true)}
                  >
                    Maintenant
                  </button>
                  <button
                    type="button"
                    className={!useNow ? "flex-1 rounded-xl bg-zinc-900 text-white py-2 text-sm font-semibold" : "flex-1 rounded-xl bg-white text-zinc-900 py-2 text-sm font-semibold border border-zinc-200"}
                    onClick={() => setUseNow(false)}
                  >
                    Plus tard
                  </button>
                </div>

                {!useNow ? (
                  <div className="mt-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-zinc-900">Date & heure</span>
                      <input
                        type="datetime-local"
                        className="rounded-xl border border-zinc-200 px-3 py-2"
                        value={datetimeLocal}
                        onChange={(e) => setDatetimeLocal(e.target.value)}
                      />
                    </label>
                    <div className="mt-2 flex gap-2">
                      {[15, 30, 60].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() + m * 60 * 1000);
                            setDatetimeLocal(toDatetimeLocalValue(d));
                          }}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700"
                        >
                          +{m} min
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-zinc-900">Lieu (texte simple)</span>
                  <input
                    className="rounded-xl border border-zinc-200 px-3 py-2"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="Ex: près de la gare"
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
                  <>
                    <div className="mt-2 text-xs text-zinc-500">
                      Lieux réels suggérés {activity === "work" ? "(travail)" : ""}.
                    </div>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {suggestedSpots.map((spot) => (
                        <button
                          key={spot.name}
                          type="button"
                          onClick={() => {
                            setLocationText(spot.name);
                            setCoords({ lat: spot.lat, lng: spot.lng });
                          }}
                          className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          {spot.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  className="rounded-2xl bg-white px-5 py-3 text-zinc-900 font-semibold border border-zinc-200 flex-1"
                  onClick={() => setStep(1)}
                >
                  Retour
                </button>
                <button
                  type="button"
                  className="rounded-2xl bg-zinc-900 px-5 py-3 text-white font-semibold hover:bg-zinc-800 active:bg-zinc-950 flex-1"
                  onClick={() => setStep(3)}
                >
                  Continuer
                </button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="text-sm font-semibold text-zinc-900">Étape 3: nombre max</div>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-sm font-medium text-zinc-900">Max participants</div>
                <div className="mt-2 flex gap-2">
                  {[4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={
                        maxParticipants === n
                          ? "flex-1 rounded-xl bg-zinc-900 text-white py-2 text-sm font-semibold"
                          : "flex-1 rounded-xl bg-white text-zinc-900 py-2 text-sm font-semibold border border-zinc-200"
                      }
                      onClick={() => setMaxParticipants(n as 4 | 5 | 6)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  MVP: groupes petits (4 à 6). Simple, pas d’algorithmes.
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white p-3">
                <div className="text-sm font-semibold text-zinc-900">Résumé</div>
                <div className="mt-2 text-sm text-zinc-700">
                  <div>
                    Activité: {selectedMeta?.emoji} {selectedMeta?.label}
                  </div>
                  <div>Heure: {useNow ? "Maintenant" : startTimeLabel}</div>
                  <div>Lieu: {locationText}</div>
                  <div>Max: {maxParticipants}</div>
                </div>
                <p className="mt-3 text-xs text-zinc-600 leading-relaxed border-t border-zinc-100 pt-3">{CANCELLATION_POLICY_FR}</p>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  className="rounded-2xl bg-white px-5 py-3 text-zinc-900 font-semibold border border-zinc-200 flex-1"
                  onClick={() => setStep(2)}
                >
                  Retour
                </button>
                <button
                  type="button"
                  disabled={creating}
                  className="rounded-2xl bg-zinc-900 px-5 py-3 text-white font-semibold hover:bg-zinc-800 active:bg-zinc-950 disabled:opacity-50 flex-1"
                  onClick={onCreate}
                >
                  {creating ? "Création..." : "Créer et publier"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}

