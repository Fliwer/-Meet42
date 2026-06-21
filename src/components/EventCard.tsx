"use client";

import Link from "next/link";
import type { PlanSummary } from "@/lib/plans/planTypes";
import { ACTIVITIES } from "@/lib/plans/activities";
import Avatar from "@/components/Avatar";

const ACTIVITY_VIBES: Record<string, string> = {
  coffee: "Cozy & chill",
  drinks: "Afterwork chaud",
  talk: "Connexion humaine",
  music: "No stress music",
  bowling: "Compétitif fun",
  axe: "Adrénaline garantie",
  escape: "Team challenge",
  billiard: "Convo facile",
  kicker: "Match endiablé",
  work: "Focus à plusieurs",
  walk: "Bruxelles vibes",
};

const ACTIVITY_BY_ID = new Map(ACTIVITIES.map((a) => [a.id, a]));

function activityMeta(activity: string) {
  const base = ACTIVITY_BY_ID.get(activity as (typeof ACTIVITIES)[number]["id"]);
  if (!base) return { label: "Sortie Meet42", emoji: "✨", vibe: "Petit groupe" };
  return { label: base.label, emoji: base.emoji, vibe: ACTIVITY_VIBES[base.id] ?? "Petit groupe" };
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((target - today) / (24 * 60 * 60 * 1000));
  const dayLabel =
    dayDiff === 0
      ? "Aujourd'hui"
      : dayDiff === 1
        ? "Demain"
        : new Intl.DateTimeFormat("fr-BE", { weekday: "short", day: "numeric", month: "short" }).format(date);
  const hour = new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${dayLabel} · ${hour}`;
}

function spotsLabel(spotsLeft: number) {
  if (spotsLeft <= 0) return "Complet";
  if (spotsLeft === 1) return "1 place restante";
  return `${spotsLeft} places restantes`;
}

type EventCardProps = {
  plan: PlanSummary;
  onJoin: () => void;
  disabled?: boolean;
};

export default function EventCard({ plan, onJoin, disabled }: EventCardProps) {
  const meta = activityMeta(plan.activity);
  const preview = plan.participant_preview ?? [];
  const spotsLeft = Math.max(0, plan.max_participants - plan.participants_count);
  const isLocked = disabled || plan.is_joined || spotsLeft === 0;

  return (
    <article className="meet42-event-card group">
      <Link
        href={`/plan/${plan.id}`}
        className="relative block rounded-3xl p-4 sm:p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d2e]"
      >
        <div className="flex items-start gap-3">
          <span className="meet42-event-emoji" aria-hidden>
            {meta.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="meet42-event-vibe">{meta.vibe}</p>
            <h3 className="meet42-event-title">{meta.label}</h3>
            <p className="meet42-event-meta">
              {formatWhen(plan.start_time)} · {plan.location_text}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2" aria-label="Participants">
              {preview.slice(0, 4).map((p, idx) => (
                <Avatar
                  key={`${p.first_name}-${idx}`}
                  src={p.photo_url}
                  name={p.first_name}
                  className="meet42-avatar"
                  fallbackClassName="meet42-avatar-fallback"
                />
              ))}
              {preview.length === 0 ? (
                <span className="rounded-full border border-dashed border-[color:var(--line-2)] px-2 py-1 text-xs text-[color:var(--ink-3)]">
                  Sois le premier
                </span>
              ) : null}
            </div>
            <span className="text-xs font-semibold text-[color:var(--ink-2)]">
              {plan.participants_count}/{plan.max_participants}
            </span>
          </div>
          <span className="meet42-spots-chip">{spotsLabel(spotsLeft)}</span>
        </div>
      </Link>

      <div className="relative px-4 pb-4 sm:px-5 sm:pb-5">
        <button
          type="button"
          disabled={isLocked}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onJoin();
          }}
          className="meet42-join-btn"
        >
          {plan.is_joined ? "Tu participes" : spotsLeft === 0 ? "Complet" : "Rejoindre"}
        </button>
      </div>
    </article>
  );
}

export function EventCardLoading() {
  return (
    <div className="meet42-event-card animate-pulse p-4 sm:p-5" aria-hidden>
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-2xl bg-[color:var(--cream-3)]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-[color:var(--cream-3)]" />
          <div className="h-5 w-2/3 rounded bg-[color:var(--cream-3)]" />
          <div className="h-4 w-full rounded bg-[color:var(--cream-3)]" />
        </div>
      </div>
      <div className="mt-6 h-12 rounded-2xl bg-[rgb(255_77_46_/_0.35)]" />
    </div>
  );
}

export function EventCardEmpty({
  title = "Aucune sortie pour ce filtre",
  description = "Essaie une autre catégorie ou crée ta propre sortie en 30 secondes.",
  ctaLabel = "Créer une sortie",
  onCreate,
}: {
  title?: string;
  description?: string;
  ctaLabel?: string;
  onCreate: () => void;
}) {
  return (
    <section className="meet42-event-card p-6 sm:p-8 text-center">
      <p className="meet42-event-vibe">Meet42 te propose plus</p>
      <h3 className="meet42-event-title">{title}</h3>
      <p className="mt-2 text-sm text-[color:var(--ink-2)]">{description}</p>
      <button type="button" onClick={onCreate} className="meet42-join-btn mt-5 sm:w-auto sm:px-8">
        {ctaLabel}
      </button>
    </section>
  );
}
