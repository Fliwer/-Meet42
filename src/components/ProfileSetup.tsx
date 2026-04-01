"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";

export default function ProfileSetup({
  onDone,
  onCancel,
  variant = "setup",
}: {
  onDone?: () => void;
  onCancel?: () => void;
  variant?: "setup" | "edit";
}) {
  const { updateProfile, profile, profileStatus } = useAuth();

  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [age, setAge] = useState<number>(profile?.age ?? 22);
  const [photoUrl, setPhotoUrl] = useState(profile?.photo_url ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setAge(profile?.age ?? 22);
    setPhotoUrl(profile?.photo_url ?? "");
    setBio(profile?.bio ?? "");
  }, [profile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!firstName.trim()) throw new Error("Prénom requis");
      if (!Number.isFinite(age) || age < 18 || age > 99) throw new Error("Âge invalide");

      await updateProfile({
        first_name: firstName.trim(),
        age,
        photo_url: photoUrl.trim() ? photoUrl.trim() : undefined,
        bio: bio.trim() ? bio.trim() : undefined,
      });
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const isEdit = variant === "edit";

  return (
    <div className="w-full max-w-lg mx-auto">
      {isEdit ? (
        <h2 className="text-2xl font-bold text-zinc-900">Modifier ton profil</h2>
      ) : (
        <h1 className="text-2xl font-bold text-zinc-900">Ton profil</h1>
      )}
      <p className="mt-1 text-zinc-600">
        {isEdit ? "Mets à jour les infos affichées sur tes plans." : "Juste pour que les gens te reconnaissent sur place."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-900">Prénom</span>
          <input
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Ex: Lina"
            autoComplete="given-name"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-900">Âge</span>
          <input
            type="number"
            min={18}
            max={99}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-900">Photo (URL)</span>
          <input
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-900">Bio courte</span>
          <textarea
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 min-h-24"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ex: partante pour boire un verre et discuter rapidement."
          />
        </label>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {profileStatus === "error" ? <div className="text-sm text-red-600">Erreur lors de la sauvegarde.</div> : null}

        <div className={isEdit ? "flex flex-col gap-2 sm:flex-row" : ""}>
          {isEdit && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 sm:flex-1"
            >
              Annuler
            </button>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className={`rounded-2xl bg-zinc-900 px-5 py-3 text-white font-semibold hover:bg-zinc-800 active:bg-zinc-950 disabled:opacity-50 ${isEdit ? "sm:flex-1" : ""}`}
          >
            {saving ? "Sauvegarde..." : isEdit ? "Enregistrer" : "Continuer"}
          </button>
        </div>
      </form>
    </div>
  );
}

