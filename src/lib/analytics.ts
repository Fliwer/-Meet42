"use client";

import posthog from "posthog-js";

/**
 * Analytics Meet42 — le funnel des KPIs : activation, réservation, retissage
 * (belle rencontre), retour. Actif uniquement si NEXT_PUBLIC_POSTHOG_KEY est
 * défini ; sinon no-op complet (aucun réseau, aucune erreur).
 */

let started = false;

export function initAnalytics() {
  if (started || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
  });
  started = true;
}

export type MeetEvent =
  | "reserve_42" // a réservé une place
  | "cancel_reservation"
  | "profile_completed" // activation : profil rempli
  | "group_revealed" // a ouvert son groupe (Reveal)
  | "hype_clicked" // J'ai hâte
  | "checkin" // J'arrive / j'y suis
  | "belle_rencontre_kept" // retissage
  | "carnet_viewed"
  | "open_plan_joined";

export function track(event: MeetEvent, props?: Record<string, unknown>) {
  if (!started) return;
  posthog.capture(event, props);
}

export function identify(userId: string) {
  if (!started) return;
  posthog.identify(userId);
}

export function resetAnalytics() {
  if (!started) return;
  posthog.reset();
}
