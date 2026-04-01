"use client";

import React from "react";
import Link from "next/link";
import { ACTIVITIES } from "@/lib/plans/activities";
import type { PlanSummary } from "@/lib/plans/planTypes";
import { formatDistanceKm } from "@/lib/plans/distance";

function activityMeta(activityId: string) {
  return ACTIVITIES.find((a) => a.id === activityId) ?? { id: activityId, label: activityId, emoji: "✨" };
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
  const meta = activityMeta(plan.activity);
  const start = new Date(plan.start_time);
  const time = new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit" }).format(start);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/plan/${plan.id}`}
          className="min-w-0 flex-1 rounded-xl -m-1 p-1 outline-offset-2 hover:bg-zinc-50/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-900"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              {meta.emoji}
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900 truncate">{meta.label}</div>
              <div className="text-sm text-zinc-600">{time}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{plan.participants_count}/{plan.max_participants}</span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
              {plan.distance_km == null ? "Distance —" : `~${formatDistanceKm(plan.distance_km)}`}
            </span>
          </div>
        </Link>
        <div className="shrink-0">
          <button
            type="button"
            className={
              plan.is_joined
                ? "rounded-full bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 cursor-default"
                : "rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 active:bg-zinc-950 disabled:opacity-50"
            }
            disabled={disabled || plan.is_joined}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJoin();
            }}
          >
            {plan.is_joined ? "Vous y êtes" : "Rejoindre"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {plan.creator.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- photo_url profil (domaine arbitraire)
            <img
              src={plan.creator.photo_url}
              alt={`Photo de ${plan.creator.first_name}`}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-zinc-200" aria-hidden />
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-900 truncate">Créé par {plan.creator.first_name}</div>
            <div className="text-xs text-zinc-600 truncate">{plan.location_text}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

