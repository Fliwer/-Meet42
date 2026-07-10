"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { getAuthHeaders } from "@/lib/plans/planApi";
import { isAdminEmail } from "@/lib/admin/isAdmin";
import type { AdminOverview } from "@/app/api/admin/overview/route";

/**
 * Command center Meet42 — réservé aux e-mails admin (session Google).
 * Funnel de conversion, réservations par créneau, membres, groupes, et le
 * bouton concierge « Former les groupes ».
 */

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
  const router = useRouter();
  const { status, accessToken, user } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchNote, setMatchNote] = useState<string | null>(null);
  const [tab, setTab] = useState<"reservations" | "members" | "groups">("reservations");

  // En prod, l'accès se joue sur l'e-mail. En local (mock) user peut être null → on tente quand même.
  const supabaseMode = Boolean(accessToken);
  const allowed = !supabaseMode || isAdminEmail(user?.email);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { ...getAuthHeaders({ accessToken, userId: user?.id ?? null }) },
      });
      if (res.status === 401) {
        setError("Accès réservé.");
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
  }, [accessToken, user?.id, user?.email]);

  useEffect(() => {
    if (status === "loading") return;
    if (supabaseMode && !allowed) return;
    void load();
  }, [status, supabaseMode, allowed, load]);

  async function onForceMatch() {
    if (!confirm("Former les groupes maintenant pour tous les créneaux prêts (≥ 4 réservés) ?")) return;
    setMatching(true);
    setMatchNote(null);
    try {
      const res = await fetch("/api/admin/match", {
        method: "POST",
        headers: { ...getAuthHeaders({ accessToken, userId: user?.id ?? null }) },
      });
      const j = await res.json();
      if (res.ok) {
        setMatchNote("✓ Matching lancé — les groupes sont formés (onglet Groupes).");
        await load();
      } else {
        setMatchNote(j?.error ?? "Échec du matching.");
      }
    } catch {
      setMatchNote("Échec du matching.");
    } finally {
      setMatching(false);
    }
  }

  // ── États d'accès ──
  if (status === "loading") {
    return <main className="min-h-screen px-4 py-16 text-center text-sm text-[color:var(--ink-2)]">Chargement…</main>;
  }
  if (supabaseMode && status !== "authenticated") {
    return (
      <main className="min-h-screen px-4 py-16 text-center">
        <p className="text-sm text-[color:var(--ink-2)]">Connecte-toi avec ton compte admin.</p>
        <button onClick={() => router.push("/login?next=/admin")} className="meet42-cta-primary mt-4">
          Se connecter
        </button>
      </main>
    );
  }
  if (supabaseMode && !allowed) {
    return (
      <main className="min-h-screen px-4 py-16 text-center">
        <div className="mx-auto max-w-sm">
          <div className="text-3xl">🔒</div>
          <h1 className="font-display mt-2 text-2xl font-semibold text-[color:var(--ink)]">Accès réservé</h1>
          <p className="mt-2 text-sm text-[color:var(--ink-2)]">
            Ce dashboard est réservé à l&apos;équipe Meet42. Tu es connecté en tant que{" "}
            <span className="font-semibold">{user?.email}</span>.
          </p>
          <button onClick={() => router.push("/")} className="meet42-cta-ghost mt-4">
            Retour à l&apos;accueil
          </button>
        </div>
      </main>
    );
  }

  const s = data?.stats;
  const f = data?.funnel;

  const funnelStages = f
    ? [
        { label: "Inscrits", value: f.signups, color: "var(--espresso)" },
        { label: "Ont réservé", value: f.reserved, color: "#b8551f" },
        { label: "Placés en groupe", value: f.matched, color: "var(--fire)" },
        { label: "Belle rencontre", value: f.belles, color: "#e8902a" },
      ]
    : [];
  const funnelMax = Math.max(1, ...funnelStages.map((x) => x.value));

  return (
    <main className="min-h-screen bg-transparent px-4 pb-24 pt-6 md:pt-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="meet42-kicker">
              <span className="meet42-kicker-dot" aria-hidden /> Command center
            </span>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)]">Dashboard</h1>
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={busy}
            className="rounded-xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-3 py-2 text-xs font-bold text-[color:var(--ink)] hover:bg-[color:var(--cream-3)] disabled:opacity-50"
          >
            {busy ? "…" : "↻ Rafraîchir"}
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Membres", value: s?.members ?? 0 },
            { label: "Réservations", value: s?.reservationsPending ?? 0 },
            { label: "Groupes", value: s?.groups ?? 0 },
            { label: "Rencontres", value: s?.encounters ?? 0 },
            { label: "Cercles", value: s?.mutualBelles ?? 0 },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-4 text-center">
              <div className="font-display text-2xl font-semibold text-[color:var(--ink)]">{c.value}</div>
              <div className="mt-0.5 text-xs text-[color:var(--ink-2)]">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Funnel de conversion */}
        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-3)]">
            Funnel d&apos;activation
          </div>
          <div className="mt-3 space-y-2.5">
            {funnelStages.map((stage, i) => {
              const pct = Math.round((stage.value / funnelMax) * 100);
              const conv =
                i === 0 || funnelStages[i - 1].value === 0
                  ? null
                  : Math.round((stage.value / funnelStages[i - 1].value) * 100);
              return (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[color:var(--ink)]">{stage.label}</span>
                    <span className="text-[color:var(--ink-2)]">
                      <span className="font-display text-base font-semibold text-[color:var(--ink)]">{stage.value}</span>
                      {conv !== null ? <span className="ml-2 text-xs text-[color:var(--ink-3)]">{conv}% ↓</span> : null}
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[color:var(--cream-3)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, stage.value > 0 ? 6 : 0)}%`, background: stage.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action concierge */}
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-[rgb(255_77_46_/_0.25)] bg-[color:var(--fire-wash)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-[color:var(--ink)]">Mode concierge</div>
            <div className="text-xs text-[color:var(--ink-2)]">Forme les groupes maintenant. ≥ 4 réservés par créneau requis.</div>
          </div>
          <button
            type="button"
            onClick={onForceMatch}
            disabled={matching}
            className="shrink-0 rounded-xl bg-[color:var(--fire)] px-4 py-2.5 text-sm font-bold text-[#fff5f1] disabled:opacity-60"
          >
            {matching ? "Formation…" : "🔥 Former les groupes"}
          </button>
        </div>
        {matchNote ? <p className="mt-2 text-sm font-semibold text-[color:var(--fire-ink)]">{matchNote}</p> : null}

        {/* Onglets */}
        <div className="mt-6 flex gap-2">
          {([
            ["reservations", "Réservations"],
            ["members", `Membres (${data?.members.length ?? 0})`],
            ["groups", `Groupes (${data?.groups.length ?? 0})`],
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

        {tab === "reservations" && data ? (
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
                    {slot.reserved.length >= 4 ? `${slot.reserved.length} · prêt ✓` : `${slot.reserved.length} · manque ${4 - slot.reserved.length}`}
                  </span>
                </div>
                {slot.reserved.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {slot.reserved.map((r) => (
                      <span key={r.user_id} className="rounded-full border border-[color:var(--line)] bg-[color:var(--cream-3)]/60 px-3 py-1 text-sm text-[color:var(--ink)]">
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

        {tab === "members" && data ? (
          <div className="mt-4 space-y-2">
            {data.members.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-3)]">Aucun membre inscrit.</p>
            ) : (
              data.members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-3">
                  <AvatarBubble src={m.photo_url} name={m.first_name} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[color:var(--ink)]">
                      {m.first_name}
                      {m.age ? <span className="font-normal text-[color:var(--ink-2)]">, {m.age}</span> : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {m.interests.slice(0, 6).map((it) => (
                        <span key={it} className="rounded-full bg-[color:var(--cream-3)] px-2 py-0.5 text-[11px] text-[color:var(--ink-2)]">{it}</span>
                      ))}
                      {m.interests.length === 0 ? <span className="text-[11px] text-[color:var(--ink-3)]">sans intérêts</span> : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {tab === "groups" && data ? (
          <div className="mt-4 space-y-2">
            {data.groups.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-3)]">Aucun groupe formé pour l&apos;instant.</p>
            ) : (
              data.groups.map((g) => (
                <a key={g.plan_id} href={`/plan/${g.plan_id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream-2)] p-3 transition hover:-translate-y-0.5 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden>{g.emoji}</span>
                    <div>
                      <div className="font-semibold text-[color:var(--ink)]">{g.members.join(", ")}</div>
                      <div className="text-xs text-[color:var(--ink-2)]">
                        {new Date(g.start_time).toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" })}
                        {" · "}{g.location_text}
                      </div>
                    </div>
                  </div>
                  <span className={g.is_past ? "shrink-0 rounded-full bg-[color:var(--cream-3)] px-2.5 py-1 text-xs font-semibold text-[color:var(--ink-3)]" : "shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900"}>
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
