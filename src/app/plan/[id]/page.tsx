"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import type { PlanSummary } from "@/lib/plans/planTypes";
import {
  apiCancelAttendance,
  apiConfirmAttendance,
  apiFetchPlanAttendance,
  apiFetchMyCheckin,
  apiFetchMyPlanFeedback,
  apiFetchPlanById,
  apiJoinPlan,
  apiLeavePlan,
  apiSetMyCheckin,
  apiSubmitMyPlanFeedback,
  type AttendanceStatus,
  type PlanAttendanceParticipant,
} from "@/lib/plans/planApi";
import { canCancelOrLeaveBeforeStart, CANCELLATION_POLICY_FR } from "@/lib/plans/cancellation";
import { ACTIVITIES } from "@/lib/plans/activities";
import Avatar from "@/components/Avatar";
import GroupReveal from "@/components/GroupReveal";

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
  const [checkinStatus, setCheckinStatus] = useState<"on_my_way" | "arrived" | null>(null);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [feedbackVote, setFeedbackVote] = useState<boolean | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [attendance, setAttendance] = useState<PlanAttendanceParticipant[]>([]);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

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

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    if (!plan?.is_joined) return;
    apiFetchMyCheckin({ planId: plan.id, accessToken, userId })
      .then((row) => setCheckinStatus(row?.status ?? null))
      .catch(() => undefined);
    apiFetchMyPlanFeedback({ planId: plan.id, accessToken, userId })
      .then((row) => {
        if (!row) return;
        setFeedbackVote(row.would_rejoin);
        setFeedbackComment(row.comment ?? "");
        setFeedbackDone(true);
      })
      .catch(() => undefined);
  }, [accessToken, plan?.id, plan?.is_joined, status, userId]);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    if (!plan?.id) return;
    apiFetchPlanAttendance({ planId: plan.id, accessToken, userId })
      .then((rows) => setAttendance(rows))
      .catch(() => undefined);
  }, [accessToken, plan?.id, status, userId]);

  async function onJoin() {
    if (!plan) return;
    if (status !== "authenticated" || !userId) {
      router.push(`/login?next=${encodeURIComponent(`/plan/${plan.id}`)}`);
      return;
    }
    if (profileStatus === "missing") {
      router.push("/login");
      return;
    }
    setJoining(true);
    setActionError(null);
    setShareNotice(null);
    try {
      await apiJoinPlan({ planId: plan.id, accessToken, userId });
      const updated = await apiFetchPlanById({ planId: plan.id, accessToken, userId });
      setPlan(updated);
      const rows = await apiFetchPlanAttendance({ planId: plan.id, accessToken, userId });
      setAttendance(rows);
      // Group reveal : célébration quand le groupe atteint au moins 4 personnes
      if (updated.participants_count >= 4) setShowReveal(true);
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

  async function onCheckin(statusValue: "on_my_way" | "arrived") {
    if (!plan) return;
    setCheckinBusy(true);
    setActionError(null);
    try {
      await apiSetMyCheckin({ planId: plan.id, status: statusValue, accessToken, userId });
      setCheckinStatus(statusValue);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Check-in impossible");
    } finally {
      setCheckinBusy(false);
    }
  }

  async function onSubmitFeedback() {
    if (!plan) return;
    if (feedbackVote === null) {
      setActionError("Choisis Oui ou Non");
      return;
    }
    setFeedbackBusy(true);
    setActionError(null);
    try {
      await apiSubmitMyPlanFeedback({
        planId: plan.id,
        would_rejoin: feedbackVote,
        comment: feedbackComment,
        accessToken,
        userId,
      });
      setFeedbackDone(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Feedback impossible");
    } finally {
      setFeedbackBusy(false);
    }
  }

  async function setAttendanceStatus(next: AttendanceStatus) {
    if (!plan || !userId) return;
    setAttendanceBusy(true);
    setActionError(null);
    const previous = attendance;
    setAttendance((curr) =>
      curr.map((p) => (p.user_id === userId ? { ...p, status: next } : p))
    );
    try {
      if (next === "confirmed") {
        await apiConfirmAttendance({ planId: plan.id, accessToken, userId });
      } else {
        await apiCancelAttendance({ planId: plan.id, accessToken, userId });
      }
      const rows = await apiFetchPlanAttendance({ planId: plan.id, accessToken, userId });
      setAttendance(rows);
    } catch (err) {
      setAttendance(previous);
      setActionError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setAttendanceBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent px-4 py-8">
        <div className="max-w-2xl mx-auto mt-6 space-y-3 animate-pulse">
          <div className="h-10 rounded-2xl bg-[color:var(--cream-3)]" />
          <div className="h-32 rounded-3xl bg-[color:var(--cream-3)]" />
          <div className="h-24 rounded-2xl bg-[color:var(--cream-3)]/60" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-transparent px-4 py-8">
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
  const nowMs = Date.now();
  const startMs = start.getTime();
  const showCheckin = plan.is_joined && nowMs >= startMs - 3 * 60 * 60 * 1000 && nowMs <= startMs + 3 * 60 * 60 * 1000;
  const showFeedback = plan.is_joined && nowMs >= startMs - 30 * 60 * 1000;
  const confirmed = attendance.filter((p) => p.status === "confirmed");
  const pending = attendance.filter((p) => p.status === "pending" || p.status === "maybe");
  const cancelled = attendance.filter((p) => p.status === "cancelled");
  const myAttendanceStatus = attendance.find((p) => p.user_id === userId)?.status ?? null;

  const timelineSteps = [
    { key: "created", label: "Créé", done: true, current: false },
    { key: "joined", label: "Inscrit", done: plan.is_joined, current: !plan.is_joined },
    {
      key: "checkin",
      label: "Check-in",
      done: Boolean(checkinStatus),
      current: plan.is_joined && !checkinStatus && showCheckin,
    },
    {
      key: "done",
      label: "Feedback",
      done: feedbackDone,
      current: plan.is_joined && showFeedback && !feedbackDone,
    },
  ];

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 pb-32 md:pb-10">
      <GroupReveal
        open={showReveal}
        onClose={() => setShowReveal(false)}
        faces={plan.participant_preview ?? []}
        count={plan.participants_count}
        max={plan.max_participants}
        complete={plan.participants_count >= plan.max_participants}
      />
      <div className="max-w-3xl mx-auto mt-3 rounded-3xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="meet42-event-vibe">Activité</div>
            <h1 className="font-display mt-1 text-[2.4rem] leading-none font-semibold tracking-[-0.02em] text-[color:var(--ink)] truncate">
              {activityMeta?.emoji} {activityMeta?.label ?? plan.activity}
            </h1>
            <div className="mt-2 text-sm text-[color:var(--ink-2)]">
              {start.toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" })} à{" "}
              {start.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <p className="mt-3 text-sm font-medium text-[color:var(--ink)] leading-relaxed">
              {plan.is_joined
                ? `Tu fais partie d’un groupe de ${plan.participants_count} / ${plan.max_participants} — petit, humain, sans pression.`
                : `Rejoins un groupe de max ${plan.max_participants} personnes. Ici, on privilégie la qualité à la quantité.`}
            </p>
          </div>
          <div className="shrink-0">
            <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--cream-3)] px-3 py-1 text-sm font-semibold text-[color:var(--ink)]">
              {plan.participants_count}/{plan.max_participants}
            </span>
          </div>
        </div>

        <ol className="mt-4 flex flex-wrap items-center gap-1.5">
          {timelineSteps.map((s) => (
            <li
              key={s.key}
              className={
                s.done
                  ? "rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-900"
                  : s.current
                    ? "rounded-full bg-[color:var(--espresso)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--cream)]"
                    : "rounded-full px-2.5 py-1 text-[11px] font-semibold text-[color:var(--ink-3)]"
              }
            >
              {s.label}
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-2xl bg-[color:var(--cream-3)]/50 border border-[color:var(--line)] p-4">
          <div className="text-sm font-semibold text-[color:var(--ink)]">Infos lieu</div>
          <div className="mt-2 text-sm text-[color:var(--ink-2)]">{plan.location_text}</div>
          <div className="mt-3 flex gap-2">
            <a
              href={gmaps}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl bg-[color:var(--espresso)] px-4 py-3 text-center text-sm font-semibold text-[color:var(--cream)] hover:opacity-90"
            >
              Ouvrir dans Maps
            </a>
            <button
              type="button"
              onClick={onShare}
              className="rounded-xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-4 py-3 text-sm font-semibold text-[color:var(--ink)] hover:bg-[color:var(--cream-3)]"
            >
              Partager
            </button>
          </div>
          <div className="mt-2 text-xs text-[color:var(--ink-3)]">
            Rendez-vous sur place — pas de chat obligatoire.
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[color:var(--ink-3)]">{CANCELLATION_POLICY_FR}</p>

        {actionError ? <div className="mt-3 text-sm text-red-600">{actionError}</div> : null}
        {shareNotice ? <div className="mt-3 text-sm text-emerald-700">{shareNotice}</div> : null}

        {plan.is_joined ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            <span aria-hidden>✅</span> Tu es dans ce groupe — on se retrouve sur place.
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-[color:var(--ink-2)]">
              {status !== "authenticated"
                ? "Connecte-toi pour rejoindre en un clic."
                : "Rejoins pour confirmer ta présence avec le groupe."}
            </p>
            <div className="mt-4 hidden md:flex gap-3">
              <button className="meet42-join-btn flex-1" type="button" onClick={onJoin} disabled={joining}>
                {status !== "authenticated" ? "Connexion pour rejoindre" : joining ? "…" : "Rejoindre ce groupe"}
              </button>
              <button
                className="rounded-xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-5 py-3 text-[color:var(--ink)] font-semibold hover:bg-[color:var(--cream-3)] min-h-[48px]"
                type="button"
                onClick={() => router.push("/")}
              >
                Retour
              </button>
            </div>
          </>
        )}

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-[color:var(--ink)]">Ton groupe</h2>
            <div className="text-xs font-semibold text-[color:var(--ink-2)]">
              {status === "authenticated" ? `${confirmed.length} confirmés / ${plan.max_participants} max` : `${plan.participants_count} / ${plan.max_participants}`}
            </div>
          </div>

          {status !== "authenticated" ? (
            <div className="mt-3">
              <div className="flex -space-x-2">
                {(plan.participant_preview ?? []).slice(0, 4).map((p, i) => (
                  <Avatar
                    key={`pv-${i}`}
                    src={p.photo_url}
                    name={p.first_name}
                    size={40}
                    className="h-10 w-10 rounded-full border-2 border-[color:var(--cream-2)] object-cover"
                    fallbackClassName="grid h-10 w-10 place-items-center rounded-full border-2 border-[color:var(--cream-2)] bg-[color:var(--espresso)] text-xs font-bold text-[color:var(--cream)]"
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-[color:var(--ink-3)]">Connecte-toi pour voir la liste complète et confirmer ta présence.</p>
            </div>
          ) : (
            <>
              {plan.is_joined ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={attendanceBusy}
                    onClick={() => setAttendanceStatus("confirmed")}
                    className={
                      myAttendanceStatus === "confirmed"
                        ? "rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
                    }
                  >
                    Je viens
                  </button>
                  <button
                    type="button"
                    disabled={attendanceBusy}
                    onClick={() => setAttendanceStatus("cancelled")}
                    className={
                      myAttendanceStatus === "cancelled"
                        ? "rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
                    }
                  >
                    Je ne peux plus
                  </button>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {confirmed.map((p) => (
                  <div key={`c-${p.user_id}`} className="flex flex-col items-center gap-1.5 text-center">
                    <span className="relative">
                      <Avatar
                        src={p.photo_url}
                        name={p.first_name}
                        size={64}
                        className="h-16 w-16 rounded-full border-2 border-[color:var(--cream-2)] object-cover shadow-sm"
                        fallbackClassName="grid h-16 w-16 place-items-center rounded-full border-2 border-[color:var(--cream-2)] bg-[color:var(--espresso)] text-base font-bold text-[color:var(--cream)] shadow-sm"
                      />
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[color:var(--cream-2)] bg-emerald-500"
                        title="Confirmé"
                      />
                    </span>
                    <span className="max-w-full truncate text-xs font-semibold text-[color:var(--ink)]">
                      {p.first_name?.trim() || "Membre"}
                    </span>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, plan.max_participants - confirmed.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex flex-col items-center gap-1.5 text-center">
                    <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-[color:var(--line-2)] text-xl text-[color:var(--ink-3)]">
                      +
                    </span>
                    <span className="text-xs text-[color:var(--ink-3)]">Libre</span>
                  </div>
                ))}
              </div>

              {pending.length > 0 || cancelled.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[color:var(--ink-3)]">
                  {pending.length > 0 ? <span>⏳ {pending.length} en attente</span> : null}
                  {cancelled.length > 0 ? (
                    <span>✕ {cancelled.length} annulé{cancelled.length > 1 ? "s" : ""}</span>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        {showCheckin && status === "authenticated" ? (
          <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-3)]/50 p-3">
            <div className="text-sm font-semibold text-[color:var(--ink)]">Check-in rapide</div>
            <div className="mt-1 text-xs text-[color:var(--ink-2)]">Dis au groupe où tu en es pour limiter les no-shows.</div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={checkinBusy}
                onClick={() => onCheckin("on_my_way")}
                className={
                  checkinStatus === "on_my_way"
                    ? "flex-1 rounded-xl bg-[color:var(--espresso)] px-4 py-2.5 text-sm font-semibold text-[color:var(--cream)]"
                    : "flex-1 rounded-xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-4 py-2.5 text-sm font-semibold text-[color:var(--ink)]"
                }
              >
                Je suis en route
              </button>
              <button
                type="button"
                disabled={checkinBusy}
                onClick={() => onCheckin("arrived")}
                className={
                  checkinStatus === "arrived"
                    ? "flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                    : "flex-1 rounded-xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-4 py-2.5 text-sm font-semibold text-[color:var(--ink)]"
                }
              >
                Je suis arrivé(e)
              </button>
            </div>
          </div>
        ) : null}

        {showFeedback && status === "authenticated" ? (
          <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-3">
            <div className="text-sm font-semibold text-[color:var(--ink)]">Retour qualité</div>
            <div className="mt-1 text-xs text-[color:var(--ink-2)]">Tu referais un event avec ce groupe ?</div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setFeedbackVote(true)}
                className={
                  feedbackVote === true
                    ? "rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
                }
              >
                Oui
              </button>
              <button
                type="button"
                onClick={() => setFeedbackVote(false)}
                className={
                  feedbackVote === false
                    ? "rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
                }
              >
                Non
              </button>
            </div>
            <textarea
              className="mt-3 w-full rounded-xl border border-[color:var(--line-2)] bg-white px-3 py-2 text-sm text-[color:var(--ink)] focus:border-[color:var(--fire)] focus:outline-none"
              placeholder="Optionnel: une phrase pour aider à améliorer la qualité."
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value.slice(0, 160))}
            />
            <button
              type="button"
              disabled={feedbackBusy}
              onClick={onSubmitFeedback}
              className="mt-3 rounded-xl bg-[color:var(--espresso)] px-4 py-2 text-sm font-semibold text-[color:var(--cream)] hover:opacity-90 disabled:opacity-50"
            >
              {feedbackDone ? "Feedback enregistré" : feedbackBusy ? "Envoi..." : "Envoyer mon feedback"}
            </button>
          </div>
        ) : null}

        {plan.is_joined ? (
          <div className="mt-5 border-t border-[color:var(--line)] pt-4">
            {canStillCancel ? (
              <button
                type="button"
                disabled={leaving}
                onClick={onLeave}
                className={
                  plan.is_creator
                    ? "w-full rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                    : "w-full rounded-2xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-5 py-3 text-sm font-semibold text-[color:var(--ink)] hover:bg-[color:var(--cream-3)] disabled:opacity-50"
                }
              >
                {leaving
                  ? "…"
                  : plan.is_creator
                    ? "Annuler le plan (supprime pour tout le monde)"
                    : "Me retirer du plan"}
              </button>
            ) : (
              <p className="text-sm text-[color:var(--ink-2)]">
                Moins de 24 h avant le début : annulation ou retrait impossible ici. Préviens directement les autres sur
                place si besoin.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {!plan.is_joined ? (
        <div className="md:hidden fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 px-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <button className="meet42-join-btn flex-1" type="button" onClick={onJoin} disabled={joining}>
              {status !== "authenticated" ? "Connexion pour rejoindre" : joining ? "…" : "Rejoindre"}
            </button>
            <button
              className="rounded-2xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-4 py-3.5 text-sm font-bold text-[color:var(--ink)] min-h-[48px]"
              type="button"
              onClick={() => router.push("/")}
            >
              Accueil
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
