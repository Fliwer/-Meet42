import { NextResponse, type NextRequest } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { RITUALS, nextOccurrence, formatOccurrenceFr, composeGroups, GROUP_MIN } from "@/lib/rituals/rituals";
import { pickVenue } from "@/lib/rituals/venues";
import { computeCommonPoints, buildIcebreakers, type MemberLite } from "@/lib/profile/interests";
import { sendEmail } from "@/lib/email/send";
import { emailReveal, emailPostponed } from "@/lib/email/templates";
import { mockGetSlotReservations, mockMarkReservationsMatched, mockFormGroupPlan, mockListProfilesByIds } from "@/lib/mock/mockDb";

export const dynamic = "force-dynamic";

/**
 * Matching batch, tourne 1×/jour (Vercel Cron, 10:00 UTC ≈ midi Bruxelles).
 * Pour chaque rituel dont l'occurrence est demain (fenêtre 3h-30h) :
 *  - < 4 réservations → report automatique à la semaine suivante + e-mail ;
 *  - sinon → groupes de 4-6 (Fil rouge : les belles rencontres mutuelles
 *    sont assises ensemble, max ~2 visages connus), plan privé par groupe,
 *    lieu révélé, e-mail « Le Reveal » avec points communs + brise-glace.
 * Idempotent : les réservations passent en `matched`, un second run ne
 * retrouve plus rien à traiter.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://meet42.app";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev / cron non configuré
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Ordonne les ids pour que les paires « belle rencontre mutuelle » soient adjacentes. */
function orderWithPairs(ids: string[], mutualPairs: Set<string>): string[] {
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const remaining = new Set(ids);
  const out: string[] = [];
  while (remaining.size > 0) {
    const seed = remaining.values().next().value as string;
    remaining.delete(seed);
    out.push(seed);
    for (const other of remaining) {
      if (mutualPairs.has(key(seed, other))) {
        remaining.delete(other);
        out.push(other);
        break; // max 1 partenaire par graine → jamais plus de 2 connus par groupe
      }
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const now = new Date();
  const results: Record<string, unknown>[] = [];
  // ?force=1 : déclenchement manuel (mode concierge), ignore la fenêtre J-1
  const force = req.nextUrl.searchParams.get("force") === "1";

  for (const ritual of RITUALS) {
    const occ = nextOccurrence(ritual, now);
    const hoursUntil = (occ.getTime() - now.getTime()) / 3600000;
    // On ne matche que la veille (le cron tourne tous les jours)
    if (!force && (hoursUntil > 30 || hoursUntil < 3)) {
      results.push({ ritual: ritual.id, skipped: true, hoursUntil: Math.round(hoursUntil) });
      continue;
    }
    const occIso = occ.toISOString();

    // ── Mode mock (dev local) ──
    if (!isSupabaseConfigured()) {
      const pending = mockGetSlotReservations(ritual.id, occIso);
      if (pending.length < GROUP_MIN) {
        results.push({ ritual: ritual.id, postponed: pending.length });
        continue;
      }
      const { groups, leftover } = composeGroups(pending.map((r) => r.user_id));
      const planIds: string[] = [];
      groups.forEach((group, i) => {
        const venue = pickVenue(ritual.id, occ, i);
        const planId = mockFormGroupPlan({
          activity: ritual.activity,
          start_time: occIso,
          max_participants: group.length,
          location_text: venue.name,
          lat: venue.lat,
          lng: venue.lng,
          creator_id: group[0],
          participant_ids: group,
        });
        planIds.push(planId);
        const resIds = pending.filter((r) => group.includes(r.user_id)).map((r) => r.id);
        mockMarkReservationsMatched(resIds, planId);
        // Aperçu console des éléments du Reveal (pas d'e-mail en mock)
        const members = mockListProfilesByIds(group).map((p) => ({
          first_name: p.first_name,
          interests: [] as string[],
        }));
        console.log(`[match:mock] ${ritual.id} groupe ${i + 1}: ${members.map((m) => m.first_name).join(", ")} @ ${venue.name}`);
      });
      results.push({ ritual: ritual.id, groups: groups.map((g) => g.length), leftover: leftover.length, planIds });
      continue;
    }

    // ── Mode réel ──
    const admin = getServerSupabaseAdmin() as unknown as SupabaseClient;
    const { data: pending } = await admin
      .from("reservations")
      .select("id, user_id")
      .eq("ritual_id", ritual.id)
      .eq("occurs_at", occIso)
      .eq("status", "pending");
    const rows = (pending ?? []) as { id: string; user_id: string }[];

    // Pas assez → report automatique + e-mail (jamais d'annulation sèche)
    if (rows.length < GROUP_MIN) {
      if (rows.length > 0) {
        const nextOcc = new Date(occ.getTime() + 7 * 24 * 3600 * 1000);
        await admin
          .from("reservations")
          .update({ occurs_at: nextOcc.toISOString() })
          .in("id", rows.map((r) => r.id));
        for (const r of rows) {
          const email = await getUserEmail(admin, r.user_id);
          const firstName = await getFirstName(admin, r.user_id);
          if (email) {
            const tpl = emailPostponed({
              firstName,
              ritualLabel: ritual.label,
              nextWhenLabel: formatOccurrenceFr(nextOcc),
            });
            await sendEmail({ to: email, ...tpl });
          }
        }
      }
      results.push({ ritual: ritual.id, postponed: rows.length });
      continue;
    }

    // Fil rouge : paires mutuelles assises ensemble
    const userIds = rows.map((r) => r.user_id);
    const { data: belles } = await admin
      .from("belles_rencontres")
      .select("from_user, to_user")
      .in("from_user", userIds)
      .in("to_user", userIds);
    const directed = new Set((belles ?? []).map((b) => `${b.from_user}>${b.to_user}`));
    const mutual = new Set<string>();
    for (const b of belles ?? []) {
      if (directed.has(`${b.to_user}>${b.from_user}`)) {
        mutual.add(b.from_user < b.to_user ? `${b.from_user}|${b.to_user}` : `${b.to_user}|${b.from_user}`);
      }
    }
    const ordered = orderWithPairs(userIds, mutual);
    const { groups, leftover } = composeGroups(ordered);

    // Profils (prénoms + intérêts) pour le Reveal
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, first_name, interests")
      .in("user_id", userIds);
    const profileOf = new Map(
      ((profiles ?? []) as { user_id: string; first_name: string; interests: string[] | null }[]).map((p) => [
        p.user_id,
        { first_name: p.first_name ?? "Quelqu'un", interests: p.interests ?? [] },
      ])
    );

    const created: string[] = [];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const venue = pickVenue(ritual.id, occ, i);

      // Plan privé (source ritual) ; repli sans colonne si migration pas appliquée
      const basePlan = {
        activity: ritual.activity,
        start_time: occIso,
        max_participants: group.length,
        location_text: venue.name,
        lat: venue.lat,
        lng: venue.lng,
        creator_id: group[0],
      };
      let plan = (await admin.from("plans").insert({ ...basePlan, source: "ritual" }).select("id").single()).data as
        | { id: string }
        | null;
      if (!plan) {
        plan = (await admin.from("plans").insert(basePlan).select("id").single()).data as { id: string } | null;
      }
      if (!plan) continue;
      created.push(plan.id);

      await admin.from("plan_participants").insert(group.map((uid) => ({ plan_id: plan!.id, user_id: uid })));
      await admin
        .from("plan_attendance")
        .insert(group.map((uid) => ({ plan_id: plan!.id, user_id: uid, status: "confirmed" })));
      const resIds = rows.filter((r) => group.includes(r.user_id)).map((r) => r.id);
      await admin.from("reservations").update({ status: "matched", plan_id: plan.id }).in("id", resIds);

      // Le Reveal par e-mail
      const members: MemberLite[] = group.map((uid) => profileOf.get(uid) ?? { first_name: "Quelqu'un", interests: [] });
      const commonPoints = computeCommonPoints(members);
      const icebreakers = buildIcebreakers(members);
      const memberNames = members.map((m) => m.first_name);
      for (const uid of group) {
        const email = await getUserEmail(admin, uid);
        if (!email) continue;
        const tpl = emailReveal({
          firstName: profileOf.get(uid)?.first_name ?? "toi",
          ritualLabel: ritual.label,
          whenLabel: formatOccurrenceFr(occ),
          venueName: venue.name,
          memberNames,
          commonPoints,
          icebreakers,
          planUrl: `${SITE}/plan/${plan.id}?reveal=1`,
        });
        await sendEmail({ to: email, ...tpl });
      }
    }

    // Reliquat (cas n=7) : report à la semaine suivante + e-mail
    if (leftover.length > 0) {
      const nextOcc = new Date(occ.getTime() + 7 * 24 * 3600 * 1000);
      const leftIds = rows.filter((r) => leftover.includes(r.user_id)).map((r) => r.id);
      await admin.from("reservations").update({ occurs_at: nextOcc.toISOString() }).in("id", leftIds);
      for (const uid of leftover) {
        const email = await getUserEmail(admin, uid);
        if (email) {
          const tpl = emailPostponed({
            firstName: profileOf.get(uid)?.first_name ?? "toi",
            ritualLabel: ritual.label,
            nextWhenLabel: formatOccurrenceFr(nextOcc),
          });
          await sendEmail({ to: email, ...tpl });
        }
      }
    }

    results.push({ ritual: ritual.id, groups: groups.map((g) => g.length), leftover: leftover.length, created });
  }

  return NextResponse.json({ ok: true, at: now.toISOString(), results });
}

async function getUserEmail(admin: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

async function getFirstName(admin: SupabaseClient, userId: string): Promise<string> {
  const { data } = await admin.from("profiles").select("first_name").eq("user_id", userId).maybeSingle();
  return (data?.first_name as string) ?? "toi";
}
