"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth, type Meet42Profile } from "@/lib/auth/useAuth";
import { profilePhotoUrlsSchema } from "@/lib/profile/photoUrlSchema";
import { INTERESTS } from "@/lib/profile/interests";
import { track, identify } from "@/lib/analytics";

const BIO_MIN = 20;
const BIO_MAX = 240;
const INTERESTS_MIN = 3;

function firstPhotoFromProfile(profile: Meet42Profile | null): string {
  const listed = profile?.photo_urls?.filter((u) => u?.trim()) ?? [];
  return listed[0] ?? profile?.photo_url?.trim() ?? "";
}

/** Vrai si une réservation de 42 attend la fin du profil (contexte du parcours). */
function hasPendingRitualDraft(): boolean {
  try {
    const raw = window.localStorage.getItem("meet42:ritual-draft");
    if (!raw) return false;
    const d = JSON.parse(raw) as { ts?: number };
    return typeof d?.ts === "number" && Date.now() - d.ts < 30 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Création / édition de profil — une photo, trois passions, deux phrases.
 * Pensé comme la dernière marche avant le 42, pas comme un formulaire :
 * si une réservation attend, on le dit et le CTA finit le geste.
 */
export default function ProfileSetup({
  onDone,
  onCancel,
  variant = "setup",
}: {
  onDone?: () => void;
  onCancel?: () => void;
  variant?: "setup" | "edit";
}) {
  const { updateProfile, profile, profileStatus, user, uploadProfilePhoto } = useAuth();

  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [age, setAge] = useState<number>(profile?.age ?? 25);
  const [photoUrl, setPhotoUrl] = useState<string>(() => firstPhotoFromProfile(profile));
  const [interests, setInterests] = useState<Set<string>>(new Set(profile?.interests ?? []));
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReservation, setPendingReservation] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setAge(profile?.age ?? 25);
    setPhotoUrl(firstPhotoFromProfile(profile));
    setInterests(new Set(profile?.interests ?? []));
    setBio(profile?.bio ?? "");
  }, [profile]);

  useEffect(() => {
    setPendingReservation(hasPendingRitualDraft());
  }, []);

  function toggleInterest(id: string) {
    setInterests((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadProfilePhoto(file);
      setPhotoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer la photo");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!firstName.trim()) throw new Error("Ton prénom, c'est tout ce qu'on montre — il en faut un");
      if (!Number.isFinite(age) || age < 18 || age > 99) throw new Error("Âge invalide (18-99)");
      if (!photoUrl.trim()) throw new Error("Ajoute une photo — ton groupe doit pouvoir te reconnaître au bar");
      const parsed = profilePhotoUrlsSchema.safeParse([photoUrl.trim()]);
      if (!parsed.success) throw new Error("Cette photo n'est pas valide, réessaie");
      if (interests.size < INTERESTS_MIN) throw new Error(`Choisis au moins ${INTERESTS_MIN} passions — c'est ce qui crée les points communs`);
      const trimmedBio = bio.trim();
      if (trimmedBio.length < BIO_MIN) throw new Error(`Encore ${BIO_MIN - trimmedBio.length} caractères et c'est bon`);
      if (trimmedBio.length > BIO_MAX) throw new Error(`Un peu trop long (max ${BIO_MAX})`);

      await updateProfile({
        first_name: firstName.trim(),
        age,
        photo_urls: parsed.data,
        bio: trimmedBio,
        interests: [...interests],
      });
      if (variant === "setup") {
        if (user?.id) identify(user.id);
        track("profile_completed", { interests: interests.size });
      }
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const isEdit = variant === "edit";
  const initial = firstName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* En-tête chaleureux et contextuel */}
      {isEdit ? (
        <>
          <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)]">Modifier ton profil</h2>
          <p className="mt-1 text-[color:var(--ink-2)]">Ce que ton groupe voit de toi.</p>
        </>
      ) : (
        <>
          <span className="meet42-kicker">
            <span className="meet42-kicker-dot" aria-hidden />
            <span className="meet42-kicker-dot -ml-0.5" aria-hidden />
            {pendingReservation ? "Ta place est gardée" : "Dernière étape"}
          </span>
          <h1 className="font-display mt-2 text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-[color:var(--ink)] sm:text-[2.4rem]">
            Ton groupe veut savoir qui tu es.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-2)]">
            {pendingReservation
              ? "Encore 30 secondes et ta réservation est validée. Une photo, trois passions, deux phrases — c'est ce que ton groupe découvrira au Reveal."
              : "Une photo, trois passions, deux phrases. C'est ce que ton groupe découvrira au Reveal — rien d'autre."}
          </p>
        </>
      )}

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
        {/* Photo — le héros de l'écran, un seul geste */}
        <div className="flex flex-col items-center gap-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickFile} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label={photoUrl ? "Changer ma photo" : "Ajouter ma photo"}
            className="group relative"
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="h-32 w-32 rounded-full border-4 border-[color:var(--cream-2)] object-cover shadow-[0_14px_30px_-14px_rgba(29,22,13,0.5)]"
              />
            ) : (
              <span className="grid h-32 w-32 place-items-center rounded-full border-2 border-dashed border-[color:var(--line-2)] bg-[color:var(--cream-2)] text-4xl font-bold text-[color:var(--ink-3)] transition group-hover:border-[color:var(--fire)]">
                {uploading ? "…" : initial}
              </span>
            )}
            <span
              className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full border-2 border-[color:var(--cream)] bg-[color:var(--fire)] text-lg shadow-md transition group-hover:scale-110"
              aria-hidden
            >
              📷
            </span>
          </button>
          <span className="text-xs font-semibold text-[color:var(--ink-3)]">
            {uploading ? "Envoi en cours…" : photoUrl ? "Touche pour changer" : "Ajoute ta photo — celle où on te reconnaît"}
          </span>
        </div>

        {/* Prénom + âge côte à côte */}
        <div className="grid grid-cols-[1fr_6.5rem] gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[color:var(--ink)]">Prénom</span>
            <input
              className="rounded-xl border border-[color:var(--line-2)] bg-white px-3 py-2.5 text-[color:var(--ink)] focus:border-[color:var(--fire)] focus:outline-none"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Lina"
              autoComplete="given-name"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[color:var(--ink)]">Âge</span>
            <input
              type="number"
              min={18}
              max={99}
              className="rounded-xl border border-[color:var(--line-2)] bg-white px-3 py-2.5 text-[color:var(--ink)] focus:border-[color:var(--fire)] focus:outline-none"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
            />
          </label>
        </div>

        {/* Passions */}
        <div className="flex flex-col gap-2.5">
          <div>
            <span className="text-sm font-medium text-[color:var(--ink)]">Ce qui te fait vibrer</span>
            <p className="text-xs text-[color:var(--ink-3)]">
              Choisis-en au moins {INTERESTS_MIN} — c&apos;est ce qui crée les points communs et brise-glace de ton groupe.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((it) => {
              const on = interests.has(it.id);
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => toggleInterest(it.id)}
                  aria-pressed={on}
                  className={
                    on
                      ? "inline-flex items-center gap-1.5 rounded-full border-2 border-[color:var(--fire)] bg-[color:var(--fire-wash)] px-3.5 py-1.5 text-sm font-semibold text-[color:var(--ink)] transition active:scale-95"
                      : "inline-flex items-center gap-1.5 rounded-full border-2 border-[color:var(--line)] bg-[color:var(--cream-2)] px-3.5 py-1.5 text-sm font-semibold text-[color:var(--ink-2)] transition hover:border-[color:var(--line-2)] active:scale-95"
                  }
                >
                  <span aria-hidden>{it.emoji}</span> {it.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bio courte */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[color:var(--ink)]">Deux phrases sur toi</span>
          <textarea
            className="min-h-[88px] rounded-xl border border-[color:var(--line-2)] bg-white px-3 py-2.5 text-sm leading-relaxed text-[color:var(--ink)] focus:border-[color:var(--fire)] focus:outline-none"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            placeholder="Ex. Nouveau à Bruxelles, fan de padel et de ramen. Là pour élargir mon cercle."
            maxLength={BIO_MAX}
          />
          <span className="text-xs text-[color:var(--ink-3)]">
            {bio.trim().length < BIO_MIN ? `Encore ${BIO_MIN - bio.trim().length} caractères` : "Parfait ✓"}
          </span>
        </label>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : null}
        {profileStatus === "error" ? <div className="text-sm text-red-600">Erreur lors de la sauvegarde.</div> : null}

        <div className={isEdit ? "flex flex-col gap-2 sm:flex-row" : ""}>
          {isEdit && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-2xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-5 py-3 font-semibold text-[color:var(--ink)] hover:bg-[color:var(--cream-3)] disabled:opacity-50 sm:flex-1"
            >
              Annuler
            </button>
          ) : null}
          <button type="submit" disabled={saving || uploading} className={`meet42-join-btn ${isEdit ? "sm:flex-1" : ""}`}>
            {saving
              ? "Un instant…"
              : isEdit
                ? "Enregistrer"
                : pendingReservation
                  ? "Valider et réserver ma place"
                  : "C'est parti"}
          </button>
        </div>

        {!isEdit ? (
          <p className="-mt-2 text-center text-xs leading-relaxed text-[color:var(--ink-3)]">
            Visible uniquement par les membres de tes 42. Jamais public, jamais de swipe.
          </p>
        ) : null}
      </form>
    </div>
  );
}
