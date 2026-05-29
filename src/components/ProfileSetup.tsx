"use client";

import React, { useEffect, useState } from "react";
import { useAuth, type Meet42Profile } from "@/lib/auth/useAuth";
import { profilePhotoUrlsSchema } from "@/lib/profile/photoUrlSchema";
import ProfilePhotoField from "@/components/ProfilePhotoField";

const BIO_MIN = 20;
const BIO_MAX = 240;

function threeSlotsFromProfile(profile: Meet42Profile | null): [string, string, string] {
  const listed = profile?.photo_urls?.filter((u) => u?.trim()) ?? [];
  const one = profile?.photo_url?.trim();
  if (listed.length >= 3) return [listed[0] ?? "", listed[1] ?? "", listed[2] ?? ""];
  if (listed.length === 2) return [listed[0] ?? "", listed[1] ?? "", ""];
  if (listed.length === 1) return [listed[0] ?? "", "", ""];
  if (one) return [one, "", ""];
  return ["", "", ""];
}

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
  const [photoUrls, setPhotoUrls] = useState<[string, string, string]>(() => threeSlotsFromProfile(profile));
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setAge(profile?.age ?? 22);
    setPhotoUrls(threeSlotsFromProfile(profile));
    setBio(profile?.bio ?? "");
  }, [profile]);

  function setPhotoAt(index: 0 | 1 | 2, url: string) {
    setPhotoUrls((prev) => {
      const next: [string, string, string] = [...prev];
      next[index] = url;
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!firstName.trim()) throw new Error("Prénom requis");
      if (!Number.isFinite(age) || age < 18 || age > 99) throw new Error("Âge invalide");
      const trimmedBio = bio.trim();
      if (trimmedBio.length < BIO_MIN) throw new Error(`Présente-toi en au moins ${BIO_MIN} caractères`);
      if (trimmedBio.length > BIO_MAX) throw new Error(`Bio trop longue (max ${BIO_MAX} caractères)`);

      const urls = photoUrls.map((u) => u.trim()).filter(Boolean);
      if (urls.length < 3) throw new Error("Ajoute au moins 3 photos différentes");
      const parsed = profilePhotoUrlsSchema.safeParse(urls);
      if (!parsed.success) throw new Error("Une ou plusieurs photos sont invalides");

      await updateProfile({
        first_name: firstName.trim(),
        age,
        photo_urls: parsed.data,
        bio: trimmedBio,
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
        {isEdit
          ? "Mets à jour les infos affichées sur tes plans."
          : "Trois photos + quelques mots : les gens voient qui tu es avant de venir."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-900">Prénom</span>
          <input
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Ex. Lina"
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

        <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
          <p className="text-sm font-semibold text-zinc-900">3 photos minimum *</p>
          <ProfilePhotoField label="Photo 1 *" value={photoUrls[0]} onChange={(u) => setPhotoAt(0, u)} />
          <ProfilePhotoField label="Photo 2 *" value={photoUrls[1]} onChange={(u) => setPhotoAt(1, u)} />
          <ProfilePhotoField label="Photo 3 *" value={photoUrls[2]} onChange={(u) => setPhotoAt(2, u)} />
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-900">À propos de toi *</span>
          <textarea
            className="min-h-[100px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            placeholder="Ex. J’aime les apéros posés et le billard le week-end. Je cherche à élargir mon cercle à Bruxelles."
            maxLength={BIO_MAX}
          />
          <span className="text-xs text-zinc-500">
            {bio.trim().length}/{BIO_MAX} — minimum {BIO_MIN} caractères
          </span>
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
