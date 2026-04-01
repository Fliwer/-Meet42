"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import ProfileSetup from "@/components/ProfileSetup";

export default function ProfilePage() {
  const router = useRouter();
  const { status, profileStatus, profile, refreshProfile, signOut } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.push("/login");
    }
  }, [router, status]);

  async function onRefresh() {
    setBusy(true);
    setError(null);
    try {
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8">
        <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
          Chargement...
        </div>
      </main>
    );
  }

  if (status !== "authenticated") return null;

  if (profileStatus === "missing") {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8">
        <ProfileSetup onDone={() => router.push("/")} />
      </main>
    );
  }

  if (editing) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <ProfileSetup
            variant="edit"
            onCancel={() => setEditing(false)}
            onDone={async () => {
              setEditing(false);
              await refreshProfile();
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-3xl bg-white border border-zinc-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-zinc-600">Profil</div>
              <div className="mt-1 text-xl font-bold text-zinc-900 truncate">
                {profile?.first_name ?? "—"}
              </div>
              <div className="mt-1 text-sm text-zinc-600">
                {profile?.age ? `${profile.age} ans` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Déconnexion
            </button>
          </div>

          {profile?.bio ? (
            <div className="mt-4 rounded-2xl bg-zinc-50 border border-zinc-200 p-3 text-sm text-zinc-700">
              {profile.bio}
            </div>
          ) : (
            <div className="mt-4 text-sm text-zinc-600">
              Ajoute une bio courte pour que les gens sachent à qui s’attendre.
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex-1 min-w-[140px] rounded-2xl bg-zinc-900 px-5 py-3 text-white font-semibold hover:bg-zinc-800 active:bg-zinc-950"
            >
              Modifier le profil
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={busy}
              className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-zinc-900 font-semibold hover:bg-zinc-50 disabled:opacity-50"
            >
              {busy ? "…" : "Rafraîchir"}
            </button>
          </div>

          {error ? (
            <div className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-3xl bg-white border border-zinc-200 p-5">
          <div className="text-sm font-semibold text-zinc-900">Conseils pour matcher IRL (sans dating)</div>
          <ul className="mt-2 text-sm text-zinc-700 list-disc pl-5 space-y-1">
            <li>Plan simple, lieu clair, horaires proches.</li>
            <li>Max 4 personnes pour éviter l’effet « groupe ».</li>
            <li>
              Annulation ou retrait possible jusqu’à{" "}
              <span className="font-medium text-zinc-900">24 h avant</span> le début du plan.
            </li>
          </ul>
          <Link href="/mes-plans" className="mt-4 inline-block text-sm font-semibold text-zinc-900 underline-offset-2 hover:underline">
            Voir mes plans →
          </Link>
        </div>
      </div>
    </main>
  );
}
