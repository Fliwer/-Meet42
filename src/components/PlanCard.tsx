"use client";

import React from "react";
import Link from "next/link";
import { ACTIVITIES } from "@/lib/plans/activities";
import type { PlanSummary } from "@/lib/plans/planTypes";
import { formatDistanceKm } from "@/lib/plans/distance";
import { getPlanUrgencyBadges } from "@/lib/plans/planUrgency";
import { shortLocationLabel } from "@/lib/plans/feed";

const ACTIVITY_LABELS: Record<string, { title: string; emoji: string }> = {
  coffee: { title: "Café", emoji: "☕" },
  drinks: { title: "Apéro", emoji: "🍻" },
  talk: { title: "Discussion", emoji: "🗣️" },
  music: { title: "Musique au parc", emoji: "🎵" },
  bowling: { title: "Bowling", emoji: "🎳" },
  axe: { title: "Lancer de haches", emoji: "🪓" },
  escape: { title: "Escape game", emoji: "🧩" },
  billiard: { title: "Billard", emoji: "🎱" },
  kicker: { title: "Baby-foot", emoji: "⚽" },
  work: { title: "Coworking", emoji: "💻" },
  walk: { title: "Balade", emoji: "🚶" },
};

const VIBE_TAGS = [
  ["Bonne ambiance", "Discussions"],
  ["Énergie chill", "Nouveaux visages"],
  ["Convo facile", "Sans pression"],
  ["Social & fun", "Petit groupe"],
];

function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function activityDisplay(activityId: string) {
  const en = ACTIVITY_LABELS[activityId];
  if (en) return en;
  const fr = ACTIVITIES.find((a) => a.id === activityId);
  return { title: fr?.label ?? activityId, emoji: fr?.emoji ?? "✨" };
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).slice(0, 2);
  return p.map((x) => x[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatPlanWhen(iso: string) {
  const start = new Date(iso);
  const now = new Date();
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const diffDays = Math.round((startDay - sod) / (24 * 60 * 60 * 1000));
  let dayPart: string;
  if (diffDays === 0) dayPart = "Aujourd’hui";
  else if (diffDays === 1) dayPart = "Demain";
  else
    dayPart = new Intl.DateTimeFormat("fr-BE", { weekday: "short", day: "numeric", month: "short" }).format(start);
  const time = new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit" }).format(start);
  return { dayPart, time };
}

function shortPlace(text: string) {
  const t = text.trim();
  if (/brussels|bruxelles|ixelles|ixelle/i.test(t)) return "Bruxelles";
  return shortLocationLabel(t, 32);
}

/** « Alex, Sarah +2 y vont » */
function goingSocialLine(plan: PlanSummary): string {
  const prev = plan.participant_preview ?? [];
  const n = plan.participants_count;
  if (prev.length >= 2) {
    const [a, b] = [prev[0].first_name, prev[1].first_name];
    const extra = Math.max(0, n - 2);
    return extra > 0 ? `${a}, ${b} +${extra} y vont` : `${a}, ${b} y vont`;
  }
  if (prev.length === 1) {
    const extra = Math.max(0, n - 1);
    return extra > 0 ? `${prev[0].first_name} +${extra} y vont` : `${prev[0].first_name} y va`;
  }
  return n === 0 ? "Soyez le premier" : n === 1 ? "1 personne" : `${n} personnes`;
}

function formatStartsIn(iso: string): string | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "C’est maintenant";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return null;
  if (h >= 1) return `Dans ${h} h`;
  if (m >= 1) return `Dans ${m} min`;
  return "Bientôt";
}

export default function PlanCard({
  plan,
  onJoin,
  disabled,
}: {
  plan: PlanSummary;
  disabled?: boolean;
  onJoin: () => void;
}) {
  const meta = activityDisplay(plan.activity);
  const { dayPart, time } = formatPlanWhen(plan.start_time);
  const place = shortPlace(plan.location_text);
  const spotsLeft = Math.max(0, plan.max_participants - plan.participants_count);
  const urgency = getPlanUrgencyBadges(plan);
  const preview = plan.participant_preview ?? [];
  const startsIn = formatStartsIn(plan.start_time);
  const vibes = VIBE_TAGS[hashId(plan.id) % VIBE_TAGS.length];
  const socialGoing = goingSocialLine(plan);

  return (
    <article className="group relative flex flex-col rounded-3xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-[0_12px_40px_rgb(0,0,0,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgb(0,0,0,0.1)]">
      <Link
        href={`/plan/${plan.id}`}
        className="min-w-0 rounded-2xl -m-1 p-1 outline-offset-2 transition-colors hover:bg-zinc-50/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-900"
      >
        <div className="flex items-start gap-3">
          <span
            className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-50 to-fuchsia-50 text-3xl shadow-inner ring-1 ring-zinc-100"
            aria-hidden
          >
            {meta.emoji}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="text-lg font-black tracking-tight text-zinc-900 leading-tight">
              {meta.title} <span className="font-semibold text-zinc-500">plan</span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-zinc-600">
              {dayPart} · {time} · {place}
            </p>
            {startsIn ? (
              <p className="mt-1 text-xs font-bold text-indigo-600">{startsIn}</p>
            ) : null}
            {plan.distance_km != null ? (
              <p className="mt-0.5 text-xs text-zinc-400">~{formatDistanceKm(plan.distance_km)} de toi</p>
            ) : null}
          </div>
        </div>
      </Link>

      <p className="mt-3 text-sm font-semibold text-zinc-800">{socialGoing}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {vibes.map((v) => (
          <span key={v} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600">
            {v}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/90 bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-950">
          <span aria-hidden>⚡</span>
          {spotsLeft === 0
            ? "Complet"
            : spotsLeft === 1
              ? "1 place restante"
              : `${spotsLeft} places restantes`}
        </span>
        {urgency.map((u) => (
          <span
            key={u.label}
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${u.className}`}
          >
            {u.label}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-4">
        <div className="flex -space-x-2" aria-label="Participants">
          {preview.slice(0, 4).map((p, i) =>
            p.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL profil arbitraire
              <img
                key={`${p.first_name}-${i}`}
                src={p.photo_url}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-full border-2 border-white object-cover ring-1 ring-zinc-200"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                key={`${p.first_name}-${i}`}
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-zinc-200 to-zinc-100 text-xs font-black text-zinc-700 ring-1 ring-zinc-200"
                title={p.first_name}
              >
                {initials(p.first_name)}
              </div>
            )
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-zinc-900">
            {plan.participants_count}/{plan.max_participants} personnes
          </div>
          <div className="text-xs text-zinc-500 truncate">Hôte · {plan.creator.first_name}</div>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          className={
            plan.is_joined
              ? "w-full rounded-2xl bg-zinc-200 py-3.5 text-base font-black text-zinc-600 cursor-default min-h-[52px]"
              : "w-full rounded-2xl bg-zinc-900 py-3.5 text-base font-black text-white shadow-lg shadow-zinc-900/25 hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 min-h-[52px]"
          }
          disabled={disabled || plan.is_joined || spotsLeft === 0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onJoin();
          }}
        >
          {plan.is_joined ? "Tu es inscrit·e" : spotsLeft === 0 ? "Complet" : "Rejoindre"}
        </button>
      </div>
    </article>
  );
}
