"use client";

import React from "react";

const items = [
  { icon: "✓", label: "Petits groupes", sub: "4–6 personnes, jamais plus" },
  { icon: "🛡", label: "Profils réels", sub: "3 photos + connexion Google" },
  { icon: "⏱", label: "Sans pression", sub: "Désinscription jusqu’à 24 h avant" },
];

export default function TrustStrip({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? "flex flex-wrap gap-2" : "grid gap-3 sm:grid-cols-3"}>
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] px-4 py-3"
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--fire-wash)] text-base text-[color:var(--fire-ink)]"
            aria-hidden
          >
            {it.icon}
          </span>
          <div>
            <div className="text-sm font-bold text-[color:var(--ink)]">{it.label}</div>
            <div className="text-xs leading-snug text-[color:var(--ink-2)]">{it.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
