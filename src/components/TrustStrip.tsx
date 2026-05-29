"use client";

import React from "react";

const items = [
  { icon: "✓", label: "Petits groupes", sub: "4–6 personnes" },
  { icon: "🛡", label: "Profils réels", sub: "3 photos + connexion (email / Google)" },
  { icon: "⏱", label: "Sans pression", sub: "Tu peux te désinscrire jusqu’à 24 h avant" },
];

export default function TrustStrip({ compact }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "flex flex-wrap gap-2"
          : "grid gap-2 sm:grid-cols-3"
      }
    >
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-2xl border border-zinc-200/80 bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>
              {it.icon}
            </span>
            <div>
              <div className="text-xs font-semibold text-zinc-900">{it.label}</div>
              <div className="text-[11px] text-zinc-500 leading-snug">{it.sub}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
