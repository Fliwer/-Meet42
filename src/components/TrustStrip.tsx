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
            className="grid h-10 w-10 shrink-0 -rotate-3 place-items-center rounded-xl border border-[rgb(255_77_46_/_0.2)] bg-[linear-gradient(135deg,var(--fire-wash),var(--cream-3))] text-base text-[color:var(--fire-ink)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.8)]"
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
