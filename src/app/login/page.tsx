"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import ProfileSetup from "@/components/ProfileSetup";
import { isFacebookLoginEnabled } from "@/lib/config/authUi";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => safeNextPath(searchParams.get("next")), [searchParams]);
  const { status, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithFacebook, profileStatus } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await signInWithEmail(email.trim(), password);
        router.push(nextPath);
      } else {
        // Compte léger : email + mot de passe. Le profil (prénom, photo, bio)
        // est complété juste après, dans l'étape ProfileSetup dédiée — moins
        // de friction qu'un formulaire géant à l'inscription.
        await signUpWithEmail(email.trim(), password);
        // Si signup ne crée pas de session (email confirmation activée), on tente un sign-in direct.
        await signInWithEmail(email.trim(), password);
        // Pas de redirect ici : profileStatus === "missing" → on affiche ProfileSetup.
      }
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
      <main className="min-h-screen bg-transparent px-4">
        <div className="py-10">
          <ProfileSetup onDone={() => router.push(nextPath)} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent px-4">
      <div className="max-w-lg mx-auto py-10 md:py-14">
        <Link href="/" className="text-sm font-semibold text-[color:var(--ink-2)] hover:text-[color:var(--ink)]">
          ← Accueil
        </Link>
        <div className="mt-4 rounded-3xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-6">
          <span className="meet42-kicker">
            <span className="meet42-kicker-dot" aria-hidden /> Bienvenue
          </span>
          <h1 className="font-display mt-3 text-[2rem] leading-none font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
            Rejoins Meet<span className="text-[color:var(--fire)]">42</span>
          </h1>
          <p className="mt-2 text-sm text-[color:var(--ink-2)]">
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
              className="w-full rounded-2xl border border-[color:var(--line-2)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--ink)] hover:bg-[color:var(--cream-3)] disabled:opacity-60"
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
          className="mt-6 flex gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-1"
          role="group"
          aria-label="Mode de connexion"
        >
          <button
            className={mode === "login" ? "flex-1 rounded-xl bg-[color:var(--espresso)] text-[color:var(--cream)] py-2 text-sm font-semibold" : "flex-1 rounded-xl py-2 text-sm font-semibold text-[color:var(--ink-2)]"}
            onClick={() => setMode("login")}
            type="button"
            aria-pressed={mode === "login"}
          >
            Connexion
          </button>
          <button
            className={mode === "signup" ? "flex-1 rounded-xl bg-[color:var(--espresso)] text-[color:var(--cream)] py-2 text-sm font-semibold" : "flex-1 rounded-xl py-2 text-sm font-semibold text-[color:var(--ink-2)]"}
            onClick={() => setMode("signup")}
            type="button"
            aria-pressed={mode === "signup"}
          >
            Créer un compte
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-4 bg-[color:var(--cream-2)] rounded-2xl border border-[color:var(--line)] p-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[color:var(--ink)]">Email</span>
            <input
              className="rounded-xl border border-[color:var(--line-2)] bg-white px-3 py-2 text-[color:var(--ink)] focus:border-[color:var(--fire)] focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[color:var(--ink)]">Mot de passe</span>
            <input
              className="rounded-xl border border-[color:var(--line-2)] bg-white px-3 py-2 text-[color:var(--ink)] focus:border-[color:var(--fire)] focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {mode === "signup" ? (
            <p className="rounded-xl border border-[color:var(--line)] bg-[color:var(--cream-3)]/60 px-3 py-2 text-xs leading-relaxed text-[color:var(--ink-2)]">
              Juste ton email et un mot de passe pour commencer. On te demandera une
              photo et deux phrases juste après — ça prend 30 secondes.
            </p>
          ) : null}

          {error ? (
            <div className="text-sm text-red-600" role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={busy} className="meet42-join-btn">
            {busy ? "Patiente..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-[color:var(--ink-3)]">
          On ne publie jamais rien en ton nom. Tes infos servent juste à former ton groupe.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-transparent px-4 py-16 text-center text-sm font-medium text-[color:var(--ink-2)]">Chargement…</main>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
