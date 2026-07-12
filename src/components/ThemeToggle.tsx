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
        <span className="text-lg transition-transform duration-300 hover:rotate-12 select-none" aria-hidden>
          ☀️
        </span>
      ) : (
        <span className="text-lg transition-transform duration-300 hover:scale-110 select-none" aria-hidden>
          ☕
        </span>
      )}
    </button>
  );
}
