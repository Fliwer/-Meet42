"use client";

import React, { useState } from "react";

/**
 * Portail « accès réservé ». Affiché (via rewrite du proxy) tant que le
 * visiteur n'a pas entré le mot de passe. Overlay plein écran pour recouvrir
 * le header/nav de l'AppShell.
 */
export default function GatePage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Cookie posé → on recharge, le proxy laisse désormais passer.
        window.location.replace("/");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Mot de passe incorrect");
    } catch {
      setError("Réessaie dans un instant");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--cream)] px-5">
      <div className="w-full max-w-sm text-center">
        <div className="font-display text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
          Meet<span className="text-[color:var(--fire)]">42</span>
        </div>
        <h1 className="font-display mt-6 text-[1.7rem] leading-tight font-semibold text-[color:var(--ink)]">
          Accès réservé
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-2)]">
          Meet42 est en préparation. Entre le code d&apos;accès pour continuer.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Code d'accès"
            autoFocus
            autoComplete="off"
            className="rounded-xl border border-[color:var(--line-2)] bg-white px-4 py-3 text-center text-[color:var(--ink)] focus:border-[color:var(--fire)] focus:outline-none"
          />
          {error ? (
            <p className="text-sm font-medium text-red-600" role="alert" aria-live="polite">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy || password.length === 0} className="meet42-join-btn">
            {busy ? "Vérification…" : "Entrer"}
          </button>
        </form>

        <p className="mt-6 text-xs text-[color:var(--ink-3)]">On ouvre bientôt à tout le monde.</p>
      </div>
    </div>
  );
}
