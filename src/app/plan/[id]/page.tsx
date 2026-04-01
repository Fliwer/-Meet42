"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import type { PlanSummary } from "@/lib/plans/planTypes";
import { apiFetchPlanById, apiJoinPlan, apiLeavePlan } from "@/lib/plans/planApi";
import { canCancelOrLeaveBeforeStart, CANCELLATION_POLICY_FR } from "@/lib/plans/cancellation";
import { ACTIVITIES } from "@/lib/plans/activities";

function mapsUrl(lat: number, lng: number, label: string) {
  const coords = `${lat},${lng}`;
  const q = label.trim()
    ? encodeURIComponent(`${label} (${coords})`)
    : encodeURIComponent(coords);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { status, accessToken, user, profileStatus } = useAuth();

  const userId = user?.id ?? null;
  const planId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

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
  }, [profileStatus, router, status]);

  useEffect(() => {
    if (!planId) return;
    // Évite le “setState synchronisé dans un effect” (lint) tout en affichant un spinner rapidement.
    queueMicrotask(() => {
      setError(null);
      setLoading(true);
    });
    apiFetchPlanById({ planId, accessToken, userId })
      .then((p) => setPlan(p))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [accessToken, planId, userId]);

  async function onJoin() {
    if (!plan) return;
    setJoining(true);
    setActionError(null);
    setShareNotice(null);
    try {
      await apiJoinPlan({ planId: plan.id, accessToken, userId });
      const updated = await apiFetchPlanById({ planId: plan.id, accessToken, userId });
      setPlan(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de rejoindre");
    } finally {
      setJoining(false);
    }
  }

  async function onShare() {
    if (!plan) return;
    setShareNotice(null);
    setActionError(null);
    const url = window.location.href;
    const meta = ACTIVITIES.find((a) => a.id === plan.activity);
    const title = `Meet42 • ${meta?.label ?? plan.activity}`;
    const text = `On se retrouve ici: ${plan.location_text}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navAny: any = navigator;
    if (navAny?.share) {
      try {
        await navAny.share({ title, text, url });
        return;
      } catch {
        // ignore
      }
    }
    await navigator.clipboard.writeText(url);
    setShareNotice("Lien copié dans le presse-papiers");
  }

  async function onLeave() {
    if (!plan) return;
    setLeaving(true);
    setActionError(null);
    setShareNotice(null);
    try {
      await apiLeavePlan({ planId: plan.id, accessToken, userId });
      router.push("/");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setLeaving(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8">
        <div className="max-w-2xl mx-auto mt-6 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
          Chargement du plan...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8">
        <div className="max-w-2xl mx-auto mt-6 rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error}
        </div>
      </main>
    );
  }

  if (!plan) return null;

  const start = new Date(plan.start_time);
  const activityMeta = ACTIVITIES.find((a) => a.id === plan.activity);
  const gmaps = mapsUrl(plan.lat, plan.lng, plan.location_text);
  const canStillCancel = canCancelOrLeaveBeforeStart(plan.start_time);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="max-w-2xl mx-auto mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-zinc-600">Plan</div>
            <h1 className="text-2xl font-bold text-zinc-900 truncate">
              {activityMeta?.emoji} {activityMeta?.label ?? plan.activity}
            </h1>
            <div className="mt-1 text-sm text-zinc-600">
              {start.toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" })} à{" "}
              {start.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <div className="shrink-0">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-700">
              {plan.participants_count}/{plan.max_participants}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-zinc-50 border border-zinc-200 p-3">
          <div className="text-sm font-semibold text-zinc-900">Infos lieu</div>
          <div className="mt-2 text-sm text-zinc-700">{plan.location_text}</div>
          <div className="mt-3 flex gap-2">
            <a
              href={gmaps}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-2xl bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800 active:bg-zinc-950"
            >
              Ouvrir dans Maps
            </a>
            <button
              type="button"
              onClick={onShare}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Partager
            </button>
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Rendez-vous sur place — pas de chat obligatoire.
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 leading-relaxed">
          {CANCELLATION_POLICY_FR}
        </div>

        {actionError ? <div className="mt-3 text-sm text-red-600">{actionError}</div> : null}
        {shareNotice ? <div className="mt-3 text-sm text-emerald-700">{shareNotice}</div> : null}

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-zinc-600">
            {plan.is_joined ? "Tu es dans ce plan ✅" : "Rejoins pour voir/partager le lieu"}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            className="flex-1 rounded-2xl bg-zinc-900 px-5 py-3 text-white font-semibold hover:bg-zinc-800 active:bg-zinc-950 disabled:opacity-50"
            type="button"
            onClick={onJoin}
            disabled={joining || plan.is_joined}
          >
            {plan.is_joined ? "Déjà rejoint" : joining ? "Rejoindre..." : "Rejoindre"}
          </button>
          <button
            className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-zinc-900 font-semibold hover:bg-zinc-50"
            type="button"
            onClick={() => router.push("/")}
          >
            Retour
          </button>
        </div>

        {plan.is_joined ? (
          <div className="mt-5 border-t border-zinc-200 pt-4">
            {canStillCancel ? (
              <button
                type="button"
                disabled={leaving}
                onClick={onLeave}
                className={
                  plan.is_creator
                    ? "w-full rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                    : "w-full rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                }
              >
                {leaving
                  ? "…"
                  : plan.is_creator
                    ? "Annuler le plan (supprime pour tout le monde)"
                    : "Me retirer du plan"}
              </button>
            ) : (
              <p className="text-sm text-zinc-600">
                Moins de 24 h avant le début : annulation ou retrait impossible ici. Préviens directement les autres sur
                place si besoin.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}

