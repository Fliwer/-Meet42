"use client";

import React, { useId, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";

type Props = {
  value: string;
  onChange: (photoUrl: string) => void;
  /** Affiche le champ URL repliable (secours). */
  showUrlFallback?: boolean;
  /** Libellé au-dessus du bloc (ex. « Photo 2 »). */
  label?: string;
};

export default function ProfilePhotoField({ value, onChange, showUrlFallback = true, label = "Photo *" }: Props) {
  const { uploadProfilePhoto } = useAuth();
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadProfilePhoto(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d’upload");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-zinc-900">{label}</span>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-inner">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL profil / data URL
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-2xl text-zinc-400" aria-hidden>
              ?
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full max-w-xs text-sm text-zinc-700 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800"
            disabled={busy}
            onChange={onPick}
          />
          <p className="mt-1 text-xs text-zinc-500">JPG, PNG ou WebP — max 2 Mo</p>
        </div>
      </div>
      {busy ? <p className="text-xs font-medium text-zinc-600">Envoi de la photo…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {showUrlFallback ? (
        <details className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium text-zinc-700">Utiliser une URL à la place</summary>
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-xs text-zinc-500">Lien https vers une image</span>
            <input
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={value.startsWith("data:") ? "" : value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://..."
            />
          </label>
        </details>
      ) : null}
    </div>
  );
}
