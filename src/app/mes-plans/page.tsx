"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { apiFetchMyPlans } from "@/lib/plans/planApi";
import { ACTIVITIES } from "@/lib/plans/activities";
import type { PlanSummary } from "@/lib/plans/planTypes";

export default function MesPlansPage() {
  const router = useRouter();
  const { status, accessToken, user, profileStatus } = useAuth();
  const userId = user?.id ?? null;

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    setErr(null);
    try {
      const list = await apiFetchMyPlans({ accessToken, userId });
      setPlans(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }, [accessToken, userId]);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }
    if (profileStatus === "missing") {
      router.push("/login");
      return;
    }
    void load();
  }, [load, profileStatus, router, status]);

  if (status === "loading" || (busy && plans.length === 0 && !err)) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8">
        <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
          Chargement...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-sm font-semibold text-zinc-600 hover:text-zinc-900">
          ← Carte des plans
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900">Mes plans</h1>
        <p className="mt-1 text-sm text-zinc-600">Historique de tes activités publiées et rejoins.</p>

        {err ? <div className="mt-4 text-sm text-red-600">{err}</div> : null}

        {!busy && !err && plans.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <p className="text-sm text-zinc-600">Aucun plan pour l’instant.</p>
            <Link
              href="/create"
              className="mt-4 inline-block rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Créer un plan
            </Link>
          </div>
        ) : null}

        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {plans.map((p) => {
            const meta = ACTIVITIES.find((a) => a.id === p.activity);
            const start = new Date(p.start_time);
            const when = `${start.toLocaleDateString("fr-BE", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })} · ${start.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}`;
            return (
              <li key={p.id}>
                <Link
                  href={`/plan/${p.id}`}
                  className="flex h-full items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-hidden>
                        {meta?.emoji ?? "✨"}
                      </span>
                      <span className="font-semibold text-zinc-900 truncate">{meta?.label ?? p.activity}</span>
                    </div>
                    <div className="mt-1 text-sm text-zinc-600">{when}</div>
                    <div className="mt-1 text-xs text-zinc-500 truncate">{p.location_text}</div>
                    {p.is_creator ? (
                      <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                        Organisateur
                      </span>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-zinc-900">Voir →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
