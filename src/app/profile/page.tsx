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
      <main className="min-h-screen bg-[color:var(--cream-3)]/50 px-4 py-8">
        <div className="max-w-2xl mx-auto rounded-2xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] p-4 text-sm text-[color:var(--ink-2)]">
          Chargement...
        </div>
      </main>
    );
  }

  if (status !== "authenticated") return null;

  if (profileStatus === "missing") {
    return (
      <main className="min-h-screen bg-[color:var(--cream-3)]/50 px-4 py-8">
        <ProfileSetup onDone={() => router.push("/")} />
      </main>
    );
  }

  if (editing) {
    return (
      <main className="min-h-screen bg-[color:var(--cream-3)]/50 px-4 py-8">
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
    <main className="min-h-screen bg-[color:var(--cream-3)]/50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-3xl bg-[color:var(--cream-2)] border border-[color:var(--line-2)] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-4">
              {(profile?.photo_urls?.length ? profile.photo_urls : profile?.photo_url ? [profile.photo_url] : []).length ? (
                <div className="flex shrink-0 gap-2">
                  {(profile?.photo_urls?.length
                    ? profile.photo_urls.slice(0, 6)
                    : profile?.photo_url
                      ? [profile.photo_url]
                      : []
                  ).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- URL profil
                    <img
                      key={`${src}-${i}`}
                      src={src}
                      alt=""
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-xl border border-[color:var(--line-2)] object-cover shadow-sm"
                    />
                  ))}
                </div>
              ) : null}
              <div className="min-w-0">
              <div className="text-sm text-[color:var(--ink-2)]">Profil</div>
              <div className="mt-1 text-xl font-bold text-[color:var(--ink)] truncate">
                {profile?.first_name ?? "—"}
              </div>
              <div className="mt-1 text-sm text-[color:var(--ink-2)]">
                {profile?.age ? `${profile.age} ans` : ""}
              </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-2xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)] hover:bg-[color:var(--cream-3)]/50"
            >
              Déconnexion
            </button>
          </div>

          {profile?.bio ? (
            <div className="mt-4 rounded-2xl bg-[color:var(--cream-3)]/50 border border-[color:var(--line-2)] p-3 text-sm text-[color:var(--ink-2)]">
              {profile.bio}
            </div>
          ) : (
            <div className="mt-4 text-sm text-[color:var(--ink-2)]">
              Ajoute une bio courte pour que les gens sachent à qui s’attendre.
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex-1 min-w-[140px] rounded-2xl bg-[color:var(--espresso)] px-5 py-3 text-[color:var(--cream)] font-semibold hover:opacity-90 active:opacity-95"
            >
              Modifier le profil
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={busy}
              className="rounded-2xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-5 py-3 text-[color:var(--ink)] font-semibold hover:bg-[color:var(--cream-3)]/50 disabled:opacity-50"
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

        <div className="mt-4 rounded-3xl bg-[color:var(--cream-2)] border border-[color:var(--line-2)] p-6 shadow-sm">
          <div className="text-sm font-semibold text-[color:var(--ink)]">Conseils pour organiser de belles rencontres IRL</div>
          <ul className="mt-2 text-sm text-[color:var(--ink-2)] list-disc pl-5 space-y-1">
            <li>Plan simple, lieu clair, horaires proches.</li>
            <li>Groupes de 4 à 6 pour un bon équilibre convivial.</li>
            <li>
              Annulation ou retrait possible jusqu’à{" "}
              <span className="font-medium text-[color:var(--ink)]">24 h avant</span> le début du plan.
            </li>
          </ul>
          <Link href="/mes-plans" className="mt-4 inline-block text-sm font-semibold text-[color:var(--ink)] underline-offset-2 hover:underline">
            Voir mes plans →
          </Link>
        </div>
      </div>
    </main>
  );
}
