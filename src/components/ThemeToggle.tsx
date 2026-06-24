"use client";

import React, { useEffect, useState } from "react";

/**
 * Bascule Clair ↔ Espresso. Applique la classe `.dark` sur <html> et persiste
 * le choix (localStorage). L'anti-flash initial est géré par un script inline
 * dans le layout.
 */
export default function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("meet42-theme", next ? "dark" : "light");
    } catch {
      // stockage indisponible : on garde juste l'état en mémoire
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode Espresso"}
      title={dark ? "Mode clair" : "Mode Espresso"}
      className={
        onDark
          ? "grid h-9 w-9 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/15"
          : "grid h-9 w-9 place-items-center rounded-full text-[color:var(--ink-2)] transition-colors hover:bg-[color:var(--cream-3)]"
      }
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
          </g>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M20.5 14.2A8 8 0 0 1 9.8 3.5a0.6 0.6 0 0 0-0.8-0.8 9.2 9.2 0 1 0 12.3 12.3 0.6 0.6 0 0 0-0.8-0.8Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
