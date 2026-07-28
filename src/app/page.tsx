"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ApiError, isLikelyNetworkFailure } from "@/lib/api/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { apiFetchPlansAround, apiJoinPlan } from "@/lib/plans/planApi";
import Avatar from "@/components/Avatar";
import RitualsSection from "@/components/RitualsSection";
import type { PlanSummary } from "@/lib/plans/planTypes";
import { matchesMoment, type MomentFilter } from "@/lib/plans/feed";

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

          <p className="mt-3 max-w-xl text-[15px] sm:text-xl leading-snug text-[rgb(255_246_236_/_0.92)]">
            Escape game, padel, bowling, café… Chaque semaine, une vraie activité à Bruxelles avec un groupe de 4 à 6 inconnus. Tu réserves, on te révèle ton groupe la veille. C&apos;est ton <span className="font-semibold text-white">42</span>.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => document.getElementById("rituels")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="meet42-cta-primary w-full sm:w-auto"
            >
              Réserve ton 42
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
                : "Gratuit · lieux publics · groupes de 4 à 6"}
            </p>
          </div>
        </div>
      </section>

      {/* Bandeau défilant — le champ des possibles, façon marquee */}
      <div className="meet42-marquee border-y border-[color:var(--line)] bg-[color:var(--espresso)] py-3.5">
        <div className="meet42-marquee-track">
          {[0, 1].map((rep) => (
            <React.Fragment key={rep}>
              {["Escape game", "Padel", "Bowling", "Café", "Karaoké", "Mini-golf", "Lancer de haches", "Blind test", "Balade", "Billard"].map((a) => (
                <span key={`${rep}-${a}`} className="inline-flex items-center gap-2.5 font-display text-lg font-semibold text-[#f6efe6] sm:text-xl">
                  <span className="text-[color:var(--fire)]" aria-hidden>✦</span> {a}
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-28 md:pb-12">

        <section id="rituels" className="pt-8 scroll-mt-24">
          <RitualsSection />
        </section>

        {/* Manifeste — la phrase de positionnement (mémorable, éditoriale) */}
        <section className="mt-14 overflow-hidden rounded-[2rem] bg-[color:var(--espresso)] px-6 py-12 sm:px-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--fire)]">
              <span className="meet42-live-pulse meet42-spark" style={{ background: "var(--fire)" }} aria-hidden />
              La réponse à ta semaine
            </span>
            <p className="font-display mt-5 text-[1.7rem] leading-[1.15] font-semibold tracking-[-0.02em] text-[#f6efe6] sm:text-[2.9rem] sm:leading-[1.1]">
              Les autres apps te font{" "}
              <span className="italic text-[rgb(246_239_230_/_0.55)]">rencontrer des gens.</span>
              <span className="mt-2 block">
                Meet<span className="text-[color:var(--fire)]">42</span> fait que les bonnes personnes{" "}
                <span className="meet42-underline">restent dans ta vie.</span>
              </span>
            </p>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-[rgb(246_239_230_/_0.72)] sm:text-base">
              Parce qu&apos;une belle rencontre ne devrait pas être un hasard qui disparaît le lendemain.
              Des groupes de 4 à 6, en vrai, à Bruxelles. Zéro swipe.
            </p>
          </div>
        </section>


        {/* Comment ça marche — pour le visiteur qui découvre */}
        <section className="mt-14" aria-label="Comment ça marche">
          <span className="meet42-kicker">
            <span className="meet42-kicker-dot" aria-hidden /> Simple comme un plan entre potes
          </span>
          <h2 className="meet42-section-title mt-1 text-[1.8rem] sm:text-[2.2rem]">Comment ça marche</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "1",
                when: "Aujourd'hui",
                title: "Réserve ta place",
                text: "Un tap, c'est tout. Tu choisis ton 42 de la semaine — escape game, padel, café, bowling, balade…",
              },
              {
                n: "2",
                when: "La veille, midi",
                title: "Le Reveal",
                text: "Tu découvres ton groupe de 4 à 6, le lieu, vos points communs et de quoi briser la glace.",
              },
              {
                n: "3",
                when: "Le jour J",
                title: "Vous vous retrouvez en vrai",
                text: "Un bar, une heure, des vraies personnes. Pas de swipe, pas de blabla infini — une rencontre.",
              },
            ].map((s) => (
              <div key={s.n} className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-5">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--fire)] font-display text-lg font-bold text-white">
                    {s.n}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--fire-ink)]">{s.when}</span>
                </div>
                <h3 className="font-display mt-3 text-xl font-semibold text-[color:var(--ink)]">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--ink-2)]">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pourquoi Meet42 est différent — le moat, la vision */}
        <section className="mt-16" aria-label="Pourquoi Meet42">
          <span className="meet42-kicker">
            <span className="meet42-kicker-dot" aria-hidden />
            <span className="meet42-kicker-dot -ml-0.5" aria-hidden />
            Pas une app de rencontres de plus
          </span>
          <h2 className="meet42-section-title mt-1 max-w-2xl text-[1.8rem] sm:text-[2.4rem]">
            Trois choses que personne d&apos;autre ne fait
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                emoji: "👋",
                title: "Zéro swipe, que du vrai",
                text: "On ne matche pas des profils derrière un écran. On réunit 4 à 6 personnes autour d'une vraie activité, en vrai. L'anti-Tinder, assumé.",
              },
              {
                emoji: "🔥",
                title: "L'anticipation, pas l'impatience",
                text: "Le Reveal : la veille, tu découvres ton groupe, le lieu, vos points communs. Cinq jours d'attente délicieuse — le voyage commence avant la soirée.",
              },
              {
                emoji: "♥",
                title: "Ton cercle qui grandit",
                text: "Chaque belle rencontre nourrit ton cercle. Plus tu vis de 42, plus tes groupes te ressemblent. Une couche sociale bâtie sur des moments vécus — impossible à copier.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="flex flex-col rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--cream-2)] p-6 shadow-[0_1px_0_rgb(255_255_255_/_0.65)_inset,0_14px_30px_-20px_rgb(29_22_13_/_0.45)]"
              >
                <span
                  className="grid h-12 w-12 -rotate-3 place-items-center rounded-2xl border border-[rgb(255_77_46_/_0.2)] bg-[linear-gradient(135deg,var(--fire-wash),var(--cream-3))] text-2xl shadow-[inset_0_1px_0_rgb(255_255_255_/_0.8)]"
                  aria-hidden
                >
                  {c.emoji}
                </span>
                <h3 className="font-display mt-4 text-xl font-semibold text-[color:var(--ink)]">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-2)]">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Témoignages — preuve sociale, la voix des membres */}
        <section className="mt-16" aria-label="Témoignages">
          <span className="meet42-kicker">
            <span className="meet42-kicker-dot" aria-hidden /> Ils ont vécu leur 42
          </span>
          <h2 className="meet42-section-title mt-1 text-[1.8rem] sm:text-[2.4rem]">
            La meilleure façon de rencontrer du monde
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                quote: "Fini les cafés gênants en tête-à-tête. On a fait un escape game de dingue, et je revois deux personnes du groupe depuis.",
                name: "Camille",
                meta: "26 ans · Ixelles",
              },
              {
                quote: "Je suis plutôt timide, l'idée du groupe m'a rassurée. Résultat : un apéro, trois fous rires, et un mec vraiment sympa.",
                name: "Sofia",
                meta: "31 ans · Saint-Gilles",
              },
              {
                quote: "Meilleure façon de rencontrer du monde quand tu débarques dans une nouvelle ville. Mon cercle bruxellois s'est construit ici.",
                name: "Alex",
                meta: "28 ans · Etterbeek",
              },
            ].map((t) => (
              <figure
                key={t.name}
                className="flex flex-col rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--cream-2)] p-6 shadow-[0_1px_0_rgb(255_255_255_/_0.65)_inset,0_14px_30px_-22px_rgb(29_22_13_/_0.4)]"
              >
                <span className="font-display text-4xl leading-none text-[color:var(--fire)]" aria-hidden>&ldquo;</span>
                <blockquote className="mt-1 flex-1 text-sm leading-relaxed text-[color:var(--ink)]">{t.quote}</blockquote>
                <figcaption className="mt-4 flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--espresso)] text-sm font-bold text-[color:var(--cream)]">
                    {t.name.charAt(0)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[color:var(--ink)]">{t.name}</span>
                    <span className="block text-xs text-[color:var(--ink-3)]">{t.meta}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* CTA final — dernière chance de convertir avant de partir */}
        <section className="mt-14 rounded-[2rem] bg-[color:var(--espresso)] px-6 py-10 text-center sm:px-10 sm:py-14">
          <h2 className="font-display text-[1.9rem] leading-tight font-semibold tracking-[-0.02em] text-[#f6efe6] sm:text-[2.6rem]">
            Ce soir, il se passe quelque chose
            <span className="block text-[color:var(--fire)]">près de chez toi.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[rgb(246_239_230_/_0.75)] sm:text-base">
            Réserve ta place, on s&apos;occupe du reste. Gratuit, sans swipe, et ça se passe en vrai.
          </p>
          <button
            type="button"
            onClick={() => document.getElementById("rituels")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="meet42-cta-primary mx-auto mt-6"
          >
            Réserve ton 42
          </button>
        </section>
      </div>

    </main>
  );
}
