"use client";

import { useState } from "react";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  /** Classe appliquée à l'<img> photo */
  className?: string;
  /** Classe appliquée au fallback (initiale) */
  fallbackClassName?: string;
  size?: number;
};

/**
 * Avatar robuste : affiche la photo si elle charge, sinon retombe sur
 * l'initiale du prénom. Gère les URLs cassées (onError) — important car
 * d'anciennes photos / profils de test peuvent avoir des URLs invalides.
 */
export default function Avatar({ src, name, className, fallbackClassName, size = 32 }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();

  if (!src?.trim() || failed) {
    return (
      <span className={fallbackClassName} title={name ?? undefined} aria-hidden>
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL photo externe utilisateur
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
