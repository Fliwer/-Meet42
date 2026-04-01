"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import ProfileSetup from "@/components/ProfileSetup";

export default function LoginPage() {
  const router = useRouter();
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
      if (mode === "login") await signInWithEmail(email.trim(), password);
      else await signUpWithEmail(email.trim(), password);
      // Profil sera demandé si nécessaire.
      if (profileStatus === "missing") return;
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
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
    router.push("/");
  }, [router, status, profileStatus]);

  if (status === "authenticated" && profileStatus === "missing") {
    return (
      <main className="min-h-screen bg-zinc-50 px-4">
        <div className="py-10">
          <ProfileSetup onDone={() => router.push("/")} />
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
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={onGoogle}
              type="button"
              disabled={busy}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60"
            >
              Continuer avec Google
            </button>
            <button
              onClick={onFacebook}
              type="button"
              disabled={busy}
              className="w-full rounded-2xl border border-white/25 bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              Continuer avec Facebook
            </button>
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
          Astuce: le bouton Google/Facebook ci-dessus ouvre directement le provider OAuth.
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          MVP: si Supabase n’est pas configuré, l’app tourne en mode “mock” (données locales).
        </p>
      </div>
    </main>
  );
}

