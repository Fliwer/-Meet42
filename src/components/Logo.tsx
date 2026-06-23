import React from "react";

/**
 * Marque Meet42 — squircle plum + pin de rencontre (deux personnes à un lieu).
 * Réutilisable : header, footer, splash. La taille pilote tout (carré).
 */
export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="m42-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2c1f13" />
          <stop offset="0.55" stopColor="#211710" />
          <stop offset="1" stopColor="#181009" />
        </linearGradient>
        <linearGradient id="m42-coral" x1="12" y1="10" x2="28" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff7a5c" />
          <stop offset="1" stopColor="#e83c18" />
        </linearGradient>
      </defs>

      {/* Squircle */}
      <rect width="40" height="40" rx="12" fill="url(#m42-bg)" />
      {/* Halo feu discret */}
      <circle cx="29" cy="11" r="9" fill="#ff4d2e" opacity="0.3" />

      {/* Pin de rencontre */}
      <path
        d="M20 6.5c-5.4 0-9.6 4.1-9.6 9.4 0 6.6 7.9 14.4 9.2 15.6a0.6 0.6 0 0 0 0.8 0c1.3-1.2 9.2-9 9.2-15.6 0-5.3-4.2-9.4-9.6-9.4z"
        fill="#f5efe2"
      />
      {/* Duo (petit groupe) dans le pin */}
      <circle cx="16.7" cy="15.2" r="2.5" fill="url(#m42-coral)" />
      <circle cx="23.3" cy="15.2" r="2.5" fill="#2c1f13" />
    </svg>
  );
}

export default function Logo({
  size = 34,
  showWord = true,
  className,
  onDark = false,
}: {
  size?: number;
  showWord?: boolean;
  className?: string;
  /** Variante claire (texte crème) pour usage sur photo/fond sombre. */
  onDark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      {showWord ? (
        <span
          className={`text-[1.6rem] leading-none font-black tracking-tight ${
            onDark ? "text-[color:var(--cream)]" : "text-[color:var(--ink)]"
          }`}
        >
          Meet
          <span className="text-[color:var(--fire)]">42</span>
        </span>
      ) : null}
    </span>
  );
}
