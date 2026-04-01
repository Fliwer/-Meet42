"use client";

import React from "react";
import { ACTIVITIES, type ActivityId } from "@/lib/plans/activities";

export default function ActivityPicker({
  value,
  onChange,
}: {
  value: ActivityId;
  onChange: (next: ActivityId) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3" role="group" aria-label="Choisir une activité">
      {ACTIVITIES.map((a) => (
        <button
          key={a.id}
          type="button"
          aria-pressed={value === a.id}
          onClick={() => onChange(a.id)}
          className={
            value === a.id
              ? "rounded-2xl border border-zinc-900 bg-zinc-900 text-white px-3 py-3 text-left"
              : "rounded-2xl border border-zinc-200 bg-white text-zinc-900 px-3 py-3 text-left hover:bg-zinc-50"
          }
        >
          <div className="text-2xl" aria-hidden>
            {a.emoji}
          </div>
          <div className="mt-1 text-sm font-semibold">{a.label}</div>
        </button>
      ))}
    </div>
  );
}

