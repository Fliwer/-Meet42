"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import ProfileSetup from "@/components/ProfileSetup";
import ProfilePhotoField from "@/components/ProfilePhotoField";
import { isFacebookLoginEnabled } from "@/lib/config/authUi";
import { profilePhotoUrlsSchema } from "@/lib/profile/photoUrlSchema";

const SIGNUP_BIO_MIN = 20;
const SIGNUP_BIO_MAX = 240;

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => safeNextPath(searchParams.get("next")), [searchParams]);
  const { status, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithFacebook, profileStatus, updateProfile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState<number>(22);
  const [photoUrls, setPhotoUrls] = useState<[string, string, string]>(["", "", ""]);
  const [signupBio, setSignupBio] = useState("");

  function patchSignupPhoto(index: 0 | 1 | 2, url: string) {
    setPhotoUrls((prev) => {
      const next: [string, string, string] = [...prev];
      next[index] = url;
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await signInWithEmail(email.trim(), password);
      } else {
        if (!firstName.trim()) throw new Error("Prénom requis");
        if (!Number.isFinite(age) || age < 18 || age > 99) throw new Error("Âge invalide");
        const urls = photoUrls.map((u) => u.trim()).filter(Boolean);
        if (urls.length < 1) throw new Error("Ajoute au moins 1 photo");
        const parsedPhotos = profilePhotoUrlsSchema.safeParse(urls);
        if (!parsedPhotos.success) throw new Error("Une ou plusieurs photos sont invalides");
        const bio = signupBio.trim();
        if (bio.length < SIGNUP_BIO_MIN) throw new Error(`Présente-toi en au moins ${SIGNUP_BIO_MIN} caractères`);
        if (bio.length > SIGNUP_BIO_MAX) throw new Error(`Bio trop longue (max ${SIGNUP_BIO_MAX} caractères)`);

        await signUpWithEmail(email.trim(), password);
        // Si signup ne crée pas de session (email confirmation activée), on tente un sign-in direct.
        await signInWithEmail(email.trim(), password);
        await updateProfile({
          first_name: firstName.trim(),
          age,
          photo_urls: parsedPhotos.data,
          bio,
        });
      }
      router.push(nextPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      if (mode === "signup" && /confirm|verified|email/i.test(msg)) {
        setError("Compte créé. Vérifie ton email puis reconnecte-toi pour finaliser ton profil.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur Google");
      setBusy(false);
    }
  }

  async function onFacebook() {
    setBusy(true);
    setError(null);
    try {
      await signInWithFacebook();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur Facebook");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    if (profileStatus === "missing") return;
    router.push(nextPath);
  }, [router, status, profileStatus, nextPath]);

  if (status === "authenticated" && profileStatus === "missing") {
    return (
      <main className="min-h-screen bg-zinc-50 px-4">
        <div className="py-10">
          <ProfileSetup onDone={() => router.push(nextPath)} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4">
      <div className="max-w-lg mx-auto py-10 md:py-14">
        <Link href="/" className="text-sm font-semibold text-zinc-600 hover:text-zinc-900">
          ← Accueil
        </Link>
        <div className="mt-4 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-5 text-white shadow-lg ring-1 ring-white/10">
          <h1 className="text-2xl font-bold">Bienvenue sur Meet42</h1>
          <p className="mt-2 text-sm text-white/80">
            Connexion en un clic, puis tu rejoins un plan réel en quelques secondes.
          </p>
          <div
            className={
              isFacebookLoginEnabled()
                ? "mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
                : "mt-4 flex flex-col gap-2"
            }
          >
            <button
              onClick={onGoogle}
              type="button"
              disabled={busy}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60"
            >
              Continuer avec Google
            </button>
            {isFacebookLoginEnabled() ? (
              <button
                onClick={onFacebook}
                type="button"
                disabled={busy}
                className="w-full rounded-2xl border border-white/25 bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                Continuer avec Facebook
              </button>
            ) : null}
          </div>
        </div>

        <div
          className="mt-6 flex gap-2 rounded-2xl border border-zinc-200 bg-white p-1"
          role="group"
          aria-label="Mode de connexion"
        >
          <button
            className={mode === "login" ? "flex-1 rounded-xl bg-zinc-900 text-white py-2 text-sm font-semibold" : "flex-1 rounded-xl py-2 text-sm font-semibold text-zinc-800"}
            onClick={() => setMode("login")}
            type="button"
            aria-pressed={mode === "login"}
          >
            Connexion
          </button>
          <button
            className={mode === "signup" ? "flex-1 rounded-xl bg-zinc-900 text-white py-2 text-sm font-semibold" : "flex-1 rounded-xl py-2 text-sm font-semibold text-zinc-800"}
            onClick={() => setMode("signup")}
            type="button"
            aria-pressed={mode === "signup"}
          >
            Créer un compte
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-4 bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-900">Email</span>
            <input
              className="rounded-xl border border-zinc-200 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-900">Mot de passe</span>
            <input
              className="rounded-xl border border-zinc-200 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {mode === "signup" ? (
            <>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700">
                Profil de base (créé pendant l&apos;inscription)
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-900">Prénom</span>
                <input
                  className="rounded-xl border border-zinc-200 px-3 py-2"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex. Lina"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-900">Âge</span>
                <input
                  type="number"
                  min={18}
                  max={99}
                  className="rounded-xl border border-zinc-200 px-3 py-2"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                />
              </label>
              <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
                <p className="text-sm font-semibold text-zinc-900">1 photo minimum</p>
                <ProfilePhotoField label="Photo 1 *" value={photoUrls[0]} onChange={(u) => patchSignupPhoto(0, u)} />
                <ProfilePhotoField label="Photo 2 (optionnelle)" value={photoUrls[1]} onChange={(u) => patchSignupPhoto(1, u)} />
                <ProfilePhotoField label="Photo 3 (optionnelle)" value={photoUrls[2]} onChange={(u) => patchSignupPhoto(2, u)} />
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-900">À propos de toi</span>
                <textarea
                  className="min-h-[96px] rounded-xl border border-zinc-200 px-3 py-2 text-sm leading-relaxed"
                  value={signupBio}
                  onChange={(e) => setSignupBio(e.target.value.slice(0, SIGNUP_BIO_MAX))}
                  placeholder="Quelques phrases : ce que tu aimes, ce que tu cherches…"
                  maxLength={SIGNUP_BIO_MAX}
                />
                <span className="text-xs text-zinc-500">
                  {signupBio.trim().length}/{SIGNUP_BIO_MAX} — minimum {SIGNUP_BIO_MIN} caractères
                </span>
              </label>
            </>
          ) : null}

          {error ? (
            <div className="text-sm text-red-600" role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="rounded-2xl bg-zinc-900 px-5 py-3 text-white font-semibold hover:bg-zinc-800 active:bg-zinc-950 disabled:opacity-50"
          >
            {busy ? "Patiente..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-500">
          Astuce : le bouton Google ci-dessus ouvre le flux OAuth Google
          {isFacebookLoginEnabled() ? " ; Facebook aussi." : "."}
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          MVP: si Supabase n’est pas configuré, l’app tourne en mode “mock” (données locales).
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-50 px-4 py-16 text-center text-sm font-medium text-zinc-600">Chargement…</main>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
