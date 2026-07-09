"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { AdminOverview } from "@/app/api/admin/overview/route";

/**
 * Dashboard admin (mode concierge) — membres, réservations par créneau,
 * groupes formés. Protégé par une clé (ADMIN_SECRET). En local (mock),
 * l'accès est ouvert. La clé est retenue dans localStorage.
 */

const KEY_STORAGE = "meet42:admin-key";

function AvatarBubble({ src, name, size = 36 }: { src: string | null; name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="grid place-items-center rounded-full bg-[color:var(--espresso)] font-bold text-[color:var(--cream)]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  );
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchNote, setMatchNote] = useState<string | null>(null);
  const [tab, setTab] = useState<"reservations" | "members" | "groups">("reservations");

  const load = useCallback(async (adminKey: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview", { headers: adminKey ? { "x-admin-key": adminKey } : {} });
      if (res.status === 401) {
        setError("Clé admin invalide.");
        setData(null);
        return;
      }
      if (!res.ok) throw new Error("Erreur");
      setData((await res.json()) as AdminOverview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(KEY_STORAGE) ?? "" : "";
    setKey(stored);
    void load(stored);
  }, [load]);

  function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    window.localStorage.setItem(KEY_STORAGE, key);
    void load(key);
  }

  async function onForceMatch() {
    if (!confirm("Former les groupes maintenant pour tous les créneaux prêts ?")) return;
    setMatching(true);
    setMatchNote(null);
    try {
      const res = await fetch("/api/admin/match", { method: "POST", headers: key ? { "x-admin-key": key } : {} });
      const j = await res.json();
      if (res.ok) {
        setMatchNote("Matching lancé. Les groupes sont formés (regarde l'onglet Groupes).");
        await load(key);
      } else {
        setMatchNote(j?.error ?? "Échec du matching.");
      }
    } catch {
      setMatchNote("Échec du matching.");
    } finally {
      setMatching(false);
    }
  }

  // Écran de déverrouillage
  if (!data) {
    return (
      <main className="min-h-screen bg-transparent px-4 py-16">
        <form onSubmit={onUnlock} className="mx-auto max-w-sm text-center">
          <h1 className="font-display text-2xl font-semibold text-[color:var(--ink)]">Dashboard Meet42</h1>
          <p className="mt-2 text-sm text-[color:var(--ink-2)]">Accès réservé. Entre ta clé admin.</p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Clé admin"
            className="mt-4 w-full rounded-xl border border-[color:var(--line-2)] bg-white px-4 py-3 text-center focus:border-[color:var(--fire)] focus:outline-none"
          />
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={busy} className="meet42-join-btn mt-3">
            {busy ? "…" : "Entrer"}
          </button>
        </form>
      </main>
    );
  }

  const s = data.stats;
  const statCards = [
    { label: "Membres", value: s.members },
    { label: "Réservations", value: s.reservationsPending },
    { label: "Groupes formés", value: s.groups },
    { label: "Rencontres", value: s.encounters },
    { label: "Cercles (mutuels)", value: s.mutualBelles },
  ];

  return (
    <main className="min-h-screen bg-transparent px-4 pb-24 pt-6 md:pt-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)]">Dashboard</h1>
          <button
            type="button"
            onClick={() => load(key)}
            className="rounded-xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-3 py-2 text-xs font-bold text-[color:var(--ink)] hover:bg-[color:var(--cream-3)]"
          >
            ↻ Rafraîchir
          </button>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {statCards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-4 text-center">
              <div className="font-display text-2xl font-semibold text-[color:var(--ink)]">{c.value}</div>
              <div className="mt-0.5 text-xs text-[color:var(--ink-2)]">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Action concierge */}
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-[rgb(255_77_46_/_0.25)] bg-[color:var(--fire-wash)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-[color:var(--ink)]">Mode concierge</div>
            <div className="text-xs text-[color:var(--ink-2)]">Forme les groupes maintenant (≥ 4 réservés par créneau requis).</div>
          </div>
          <button
            type="button"
            onClick={onForceMatch}
            disabled={matching}
            className="shrink-0 rounded-xl bg-[color:var(--fire)] px-4 py-2.5 text-sm font-bold text-[#fff5f1] disabled:opacity-60"
          >
            {matching ? "Formation…" : "Former les groupes"}
          </button>
        </div>
        {matchNote ? <p className="mt-2 text-sm font-semibold text-[color:var(--fire-ink)]">{matchNote}</p> : null}

        {/* Onglets */}
        <div className="mt-6 flex gap-2">
          {([
            ["reservations", `Réservations`],
            ["members", `Membres (${data.members.length})`],
            ["groups", `Groupes (${data.groups.length})`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={
                tab === id
                  ? "rounded-full border-2 border-[color:var(--espresso)] bg-[color:var(--espresso)] px-4 py-1.5 text-sm font-bold text-[color:var(--cream)]"
                  : "rounded-full border-2 border-[color:var(--line)] bg-[color:var(--cream-2)] px-4 py-1.5 text-sm font-semibold text-[color:var(--ink-2)]"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Réservations par créneau */}
        {tab === "reservations" ? (
          <div className="mt-4 space-y-4">
            {data.slots.map((slot) => (
              <div key={slot.ritual_id} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden>{slot.emoji}</span>
                    <div>
                      <div className="font-semibold text-[color:var(--ink)]">{slot.label}</div>
                      <div className="text-xs text-[color:var(--ink-2)]">{slot.when_label}</div>
                    </div>
                  </div>
                  <span
                    className={
                      slot.reserved.length >= 4
                        ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900"
                        : "rounded-full bg-[color:var(--cream-3)] px-2.5 py-1 text-xs font-bold text-[color:var(--ink-2)]"
                    }
                  >
                    {slot.reserved.length} réservé{slot.reserved.length > 1 ? "s" : ""}
                    {slot.reserved.length >= 4 ? " · prêt" : ` · manque ${Math.max(0, 4 - slot.reserved.length)}`}
                  </span>
                </div>
                {slot.reserved.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {slot.reserved.map((r) => (
                      <span
                        key={r.user_id}
                        className="rounded-full border border-[color:var(--line)] bg-[color:var(--cream-3)]/60 px-3 py-1 text-sm text-[color:var(--ink)]"
                      >
                        {r.first_name}
                        {r.age ? <span className="text-[color:var(--ink-3)]">, {r.age}</span> : null}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[color:var(--ink-3)]">Personne pour l&apos;instant.</p>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Membres */}
        {tab === "members" ? (
          <div className="mt-4 space-y-2">
            {data.members.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-3)]">Aucun membre inscrit.</p>
            ) : (
              data.members.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-3"
                >
                  <AvatarBubble src={m.photo_url} name={m.first_name} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[color:var(--ink)]">
                      {m.first_name}
                      {m.age ? <span className="font-normal text-[color:var(--ink-2)]">, {m.age}</span> : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {m.interests.slice(0, 6).map((it) => (
                        <span key={it} className="rounded-full bg-[color:var(--cream-3)] px-2 py-0.5 text-[11px] text-[color:var(--ink-2)]">
                          {it}
                        </span>
                      ))}
                      {m.interests.length === 0 ? (
                        <span className="text-[11px] text-[color:var(--ink-3)]">sans intérêts</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {/* Groupes */}
        {tab === "groups" ? (
          <div className="mt-4 space-y-2">
            {data.groups.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-3)]">Aucun groupe formé pour l&apos;instant.</p>
            ) : (
              data.groups.map((g) => (
                <a
                  key={g.plan_id}
                  href={`/plan/${g.plan_id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-3 hover:-translate-y-0.5 hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden>{g.emoji}</span>
                    <div>
                      <div className="font-semibold text-[color:var(--ink)]">
                        {g.members.join(", ")}
                      </div>
                      <div className="text-xs text-[color:var(--ink-2)]">
                        {new Date(g.start_time).toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" })}
                        {" · "}{g.location_text}
                      </div>
                    </div>
                  </div>
                  <span
                    className={
                      g.is_past
                        ? "shrink-0 rounded-full bg-[color:var(--cream-3)] px-2.5 py-1 text-xs font-semibold text-[color:var(--ink-3)]"
                        : "shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900"
                    }
                  >
                    {g.is_past ? "passé" : "à venir"}
                  </span>
                </a>
              ))
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
