"use client";

import React, { useEffect } from "react";
import Avatar from "@/components/Avatar";

type Face = { first_name: string; photo_url: string | null };

/**
 * « Group reveal » — moment de célébration quand le groupe se forme/se complète.
 * Les visages s'assemblent (pop animé) + burst de lumière corail.
 */
export default function GroupReveal({
  open,
  onClose,
  faces,
  count,
  max,
  complete,
}: {
  open: boolean;
  onClose: () => void;
  faces: Face[];
  count: number;
  max: number;
  complete: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 4600);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-label={complete ? "Groupe complet" : "Le groupe se forme"}
      onClick={onClose}
    >
      <div className="meet42-reveal-fade absolute inset-0 bg-[rgba(20,12,7,0.82)] backdrop-blur-md" aria-hidden />
      <div className="relative w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <span className="meet42-reveal-burst" aria-hidden />
        <div className="flex items-end justify-center -space-x-3">
          {(faces.length > 0 ? faces : [{ first_name: "?", photo_url: null }]).slice(0, 6).map((f, i) => (
            <span
              key={`${f.first_name}-${i}`}
              className="meet42-reveal-face"
              style={{ animationDelay: `${i * 90}ms`, zIndex: 10 - i }}
            >
              <Avatar
                src={f.photo_url}
                name={f.first_name}
                size={56}
                className="h-14 w-14 rounded-full border-2 border-[color:var(--cream)] object-cover shadow-lg"
                fallbackClassName="grid h-14 w-14 place-items-center rounded-full border-2 border-[color:var(--cream)] bg-[color:var(--fire)] text-base font-bold text-[#fff5f1] shadow-lg"
              />
            </span>
          ))}
        </div>

        <h2 className="font-display mt-7 text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-[color:var(--cream)]">
          {complete ? "Votre groupe est complet" : "Le groupe se forme"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[rgb(255_246_236_/_0.85)]">
          {complete
            ? `Vous êtes ${count} — ça se passe en vrai. On se retrouve sur place.`
            : `${count}/${max} déjà là. Encore un ou deux et c'est parti.`}
        </p>

        <button type="button" onClick={onClose} className="meet42-cta-primary mt-7 w-full">
          {complete ? "Voir mon groupe" : "Continuer"}
        </button>
      </div>
    </div>
  );
}
