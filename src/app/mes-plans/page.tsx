"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { getAuthHeaders } from "@/lib/plans/planApi";
import { ACTIVITIES } from "@/lib/plans/activities";
import type { CarnetDto } from "@/app/api/me/carnet/route";

function pastWhen(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}`;
}

export default function CarnetPage() {
  const router = useRouter();
  const { status, accessToken, user, profileStatus } = useAuth();
  const userId = user?.id ?? null;

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<CarnetDto | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/me/carnet", { headers: { ...getAuthHeaders({ accessToken, userId }) } });
      if (!res.ok) throw new Error("Erreur");
      setData((await res.json()) as CarnetDto);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }, [accessToken, userId]);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated" || profileStatus === "missing") {
      router.push("/login?next=/mes-plans");
      return;
    }
    void load();
  }, [load, profileStatus, router, status]);

  if (status === "loading" || (busy && !data && !err)) {
    return (
      <main className="min-h-screen bg-transparent px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="h-28 animate-pulse rounded-3xl bg-[color:var(--cream-2)]" />
          <div className="h-20 animate-pulse rounded-2xl bg-[color:var(--cream-2)]" />
        </div>
      </main>
    );
  }

  const stats = data?.stats;

  return (
    <main className="min-h-screen bg-transparent px-4 pb-32 pt-6 md:pt-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-[color:var(--ink-2)] hover:text-[color:var(--ink)]">
          ← Accueil
        </Link>

        <div className="mt-4">
          <span className="meet42-kicker">
            <span className="meet42-kicker-dot" aria-hidden />
            <span className="meet42-kicker-dot -ml-0.5" aria-hidden />
            Ton carnet
          </span>
          <h1 className="font-display mt-1 text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-[color:var(--ink)] sm:text-[2.6rem]">
            {data?.milestone.title ?? "Ton carnet"}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--ink-2)]">{data?.milestone.sub}</p>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-4 text-center">
            <div className="font-display text-2xl font-semibold text-[color:var(--ink)]">{stats?.fortyTwoCount ?? 0}</div>
            <div className="mt-0.5 text-xs text-[color:var(--ink-2)]">42 vécus</div>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-4 text-center">
            <div className="font-display text-2xl font-semibold text-[color:var(--ink)]">{stats?.peopleMet ?? 0}</div>
            <div className="mt-0.5 text-xs text-[color:var(--ink-2)]">rencontres</div>
          </div>
          <div className="rounded-2xl border border-[rgb(255_77_46_/_0.25)] bg-[color:var(--fire-wash)] p-4 text-center">
            <div className="font-display text-2xl font-semibold text-[color:var(--fire-ink)]">{stats?.cercle ?? 0}</div>
            <div className="mt-0.5 text-xs font-semibold text-[color:var(--fire-ink)]">ton cercle</div>
          </div>
        </div>

        {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}

        {/* À venir */}
        {data && data.upcoming.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold text-[color:var(--ink)]">À venir</h2>
            <div className="mt-3 space-y-2.5">
              {data.upcoming.map((u) => (
                <div
                  key={`${u.ritual_id}-${u.when_label}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>{u.emoji}</span>
                    <div>
                      <div className="font-semibold text-[color:var(--ink)]">{u.label}</div>
                      <div className="text-sm text-[color:var(--ink-2)]">{u.when_label}</div>
                    </div>
                  </div>
                  {u.status === "matched" && u.plan_id ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/plan/${u.plan_id}?reveal=1`)}
                      className="shrink-0 rounded-xl bg-[color:var(--fire)] px-3.5 py-2 text-xs font-bold text-[#fff5f1]"
                    >
                      Voir mon groupe
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                      Réservé
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Tes 42 passés */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-[color:var(--ink)]">Tes 42</h2>
          {data && data.past.length > 0 ? (
            <div className="mt-3 space-y-2.5">
              {data.past.map((p) => {
                const meta = ACTIVITIES.find((a) => a.id === p.activity);
                return (
                  <Link
                    key={p.plan_id}
                    href={`/plan/${p.plan_id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden>{meta?.emoji ?? "✨"}</span>
                      <div>
                        <div className="font-semibold text-[color:var(--ink)]">{meta?.label ?? p.activity}</div>
                        <div className="text-sm text-[color:var(--ink-2)]">
                          {pastWhen(p.start_time)} · vous étiez {p.member_count}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[color:var(--ink)]">→</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-[color:var(--line-2)] bg-[color:var(--cream-2)] p-8 text-center">
              <p className="text-sm leading-relaxed text-[color:var(--ink-2)]">
                Ton carnet est encore vierge. Ton premier 42 y écrira sa première page.
              </p>
              <Link href="/#rituels" className="meet42-cta-primary mt-4 inline-block">
                Réserver mon premier 42
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
