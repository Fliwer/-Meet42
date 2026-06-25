import type { PlanCreator } from "@/lib/plans/planTypes";
import { canCancelOrLeaveBeforeStart } from "@/lib/plans/cancellation";
import { ACTIVITIES } from "@/lib/plans/activities";

type MockProfile = {
  id: string;
  first_name: string;
  age: number;
  /** 1ʳᵉ photo (affichage cartes) — dérivée de photo_urls si besoin */
  photo_url?: string | null;
  photo_urls?: string[];
  bio?: string | null;
};

type MockPlanRow = {
  id: string;
  activity: string;
  start_time: string; // ISO
  max_participants: number; // 4..6
  location_text: string;
  lat: number;
  lng: number;
  creator_id: string;
};

type MockState = {
  profiles: Map<string, MockProfile>;
  plans: Map<string, MockPlanRow>;
  participants: Set<string>; // `${plan_id}:${user_id}`
  attendance: Map<string, { status: "pending" | "confirmed" | "cancelled"; created_at: string; updated_at: string }>; // `${plan_id}:${user_id}`
  checkins: Map<string, { status: "on_my_way" | "arrived"; updated_at: string }>; // `${plan_id}:${user_id}`
  feedbacks: Map<string, { would_rejoin: boolean; comment: string | null; created_at: string }>; // `${plan_id}:${user_id}`
  envies: { id: string; user_id: string; activities: string[]; when_slot: string; commune: string; created_at: string }[];
};

function getState(): MockState {
  const g = globalThis as unknown as { meet42MockDb?: MockState };
  if (g.meet42MockDb) {
    if (!g.meet42MockDb.envies) g.meet42MockDb.envies = [];
    return g.meet42MockDb;
  }

  g.meet42MockDb = {
    profiles: new Map(),
    plans: new Map(),
    participants: new Set(),
    attendance: new Map(),
    checkins: new Map(),
    feedbacks: new Map(),
    envies: [],
  };

  return g.meet42MockDb;
}

function randInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function uuid() {
  // Node + modern browsers: crypto.randomUUID exists; fallback sinon.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `mock_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

const ACTIVITY_IDS = ACTIVITIES.map((a) => a.id);

type SeedPlace = {
  name: string;
  lat: number;
  lng: number;
};

const BRUSSELS_REAL_PLACES: Record<string, SeedPlace[]> = {
  coffee: [
    { name: "OR Coffee Roasters (Bruxelles Centre)", lat: 50.8476, lng: 4.3526 },
    { name: "Mok Coffee (Dansaert)", lat: 50.8501, lng: 4.3448 },
    { name: "Café Capitale", lat: 50.8459, lng: 4.3571 },
  ],
  drinks: [
    // Bars réels d’Ixelles (adresse incluse)
    { name: "Café Belga, Place Eugène Flagey 18, 1050 Ixelles", lat: 50.8258, lng: 4.3666 },
    { name: "L'Amère à Boire, Chaussée d'Ixelles 174, 1050 Ixelles", lat: 50.8353, lng: 4.3589 },
    { name: "Le Montmartre, Chaussée de Boondael 344, 1050 Ixelles", lat: 50.8181907, lng: 4.3852689 },
    { name: "Le Tavernier, Chaussée de Boondael 445, 1050 Ixelles", lat: 50.8154, lng: 4.3922 },
    { name: "Kokob, Rue de la Paix 10, 1050 Ixelles", lat: 50.8346, lng: 4.3609 },
    { name: "L'Ultime Atome, Chaussée Saint-Pierre 14, 1040 (près d'Ixelles)", lat: 50.8386, lng: 4.3815 },
    { name: "Le Pantin, Chaussée d'Ixelles 355, 1050 Ixelles", lat: 50.8245, lng: 4.3659 },
    { name: "Beer Mania, Chaussée de Wavre 174-176, 1050 Ixelles", lat: 50.8383, lng: 4.3728 },
    { name: "Le Cactus, Rue de Stassart 49, 1050 Ixelles", lat: 50.8385, lng: 4.3582 },
  ],
  talk: [
    { name: "Parc Tenbosch (coin calme), 1050 Ixelles", lat: 50.8248, lng: 4.3588 },
    { name: "Étangs d'Ixelles (promenade), 1050 Ixelles", lat: 50.8237, lng: 4.3737 },
    { name: "Place du Châtelain (terrasse), 1050 Ixelles", lat: 50.8268, lng: 4.3544 },
  ],
  music: [
    { name: "Bois de la Cambre (pelouse), 1000 Bruxelles", lat: 50.8111, lng: 4.3736 },
    { name: "Parc du Cinquantenaire (musique chill), 1000 Bruxelles", lat: 50.8399, lng: 4.3946 },
    { name: "Parc de Bruxelles (casque partagé), 1000 Bruxelles", lat: 50.843, lng: 4.3646 },
  ],
  bowling: [
    { name: "Crosly Bowling (Bruxelles)", lat: 50.8422, lng: 4.3906 },
    { name: "Bowling Stones (Woluwe)", lat: 50.849, lng: 4.4342 },
  ],
  axe: [
    { name: "WoodCutter Ixelles (lancer de hache)", lat: 50.8279, lng: 4.3715 },
    { name: "Axe Zone Bruxelles Centre", lat: 50.8487, lng: 4.3518 },
  ],
  escape: [
    { name: "Escape Hunt Brussels", lat: 50.848, lng: 4.3577 },
    { name: "Enygma Escape Rooms", lat: 50.8273, lng: 4.3498 },
  ],
  billiard: [
    { name: "Billard Royal Ixelles", lat: 50.8326, lng: 4.3604 },
    { name: "Golden 8 Pool Forest", lat: 50.8175, lng: 4.3342 },
  ],
  kicker: [
    { name: "Café Belga (kicker)", lat: 50.8258, lng: 4.3666 },
    { name: "Le Montmartre (kicker), Chaussée de Boondael 344, 1050 Ixelles", lat: 50.8181907, lng: 4.3852689 },
    { name: "Le Tavernier (kicker), Chaussée de Boondael 445, 1050 Ixelles", lat: 50.8154, lng: 4.3922 },
    { name: "Le Coq (kicker)", lat: 50.8481, lng: 4.3498 },
    { name: "De Markten (kicker)", lat: 50.8511, lng: 4.3482 },
  ],
  work: [
    { name: "Silversquare Bailli", lat: 50.8267, lng: 4.3601 },
    { name: "Silversquare Central", lat: 50.8467, lng: 4.3596 },
    { name: "The Mug Brussels (coworking café)", lat: 50.8474, lng: 4.3582 },
    { name: "WeWork Brussels Central", lat: 50.8466, lng: 4.3572 },
    { name: "Library Muntpunt (work spot)", lat: 50.8464, lng: 4.3559 },
  ],
  walk: [
    { name: "Parc de Bruxelles", lat: 50.843, lng: 4.3646 },
    { name: "Bois de la Cambre", lat: 50.8111, lng: 4.3736 },
    { name: "Parc du Cinquantenaire", lat: 50.8399, lng: 4.3946 },
  ],
};

const ACTIVITY_WEIGHTS: Array<{ id: string; weight: number }> = [
  { id: "coffee", weight: 4 },
  { id: "drinks", weight: 6 }, // Plus de bars d'Ixelles au départ.
  { id: "talk", weight: 4 },
  { id: "music", weight: 3 },
  { id: "work", weight: 5 }, // Boost pour éviter un feed “work” vide.
  { id: "walk", weight: 3 },
  { id: "kicker", weight: 3 },
  { id: "bowling", weight: 2 },
  { id: "axe", weight: 2 },
  { id: "escape", weight: 2 },
  { id: "billiard", weight: 2 },
];

function weightedActivity(): string {
  const total = ACTIVITY_WEIGHTS.reduce((acc, x) => acc + x.weight, 0);
  let r = Math.random() * total;
  for (const x of ACTIVITY_WEIGHTS) {
    r -= x.weight;
    if (r <= 0) return x.id;
  }
  return ACTIVITY_IDS[0];
}

export function mockEnsureSeedAround(lat: number, lng: number) {
  const state = getState();
  if (state.plans.size > 0) return;

  // Seed minimal pour “voir des plans tout de suite”.
  const profileCount = 10;
  const profiles: MockProfile[] = [];

  for (let i = 0; i < profileCount; i++) {
    const id = uuid();
    const firstNames = ["Lina", "Amine", "Sophie", "Nora", "Julien", "Maya", "Yanis", "Chloé", "Samir", "Camille"];
    const first_name = firstNames[i % firstNames.length];
    const profile: MockProfile = {
      id,
      first_name,
      age: randInt(18, 32),
      photo_url: null,
      bio: "On se capte vite pour une activité simple.",
    };
    profiles.push(profile);
    state.profiles.set(id, profile);
  }

  const planCount = 18;
  for (let i = 0; i < planCount; i++) {
    const id = uuid();
    const creator = profiles[randInt(0, profiles.length - 1)];
    const activity = weightedActivity();

    const places = BRUSSELS_REAL_PLACES[activity] ?? BRUSSELS_REAL_PLACES.coffee;
    const picked = places[randInt(0, places.length - 1)];
    // Micro-jitter léger pour ne pas avoir des doublons parfaits.
    const latOffset = (Math.random() - 0.5) * 0.004;
    const lngOffset = (Math.random() - 0.5) * 0.006;
    const maxParticipants = randInt(4, 6);
    const start = new Date(Date.now() + randInt(-30, 90) * 60 * 1000); // +-30min à +1h30

    const plan: MockPlanRow = {
      id,
      activity,
      start_time: start.toISOString(),
      max_participants: maxParticipants,
      location_text: picked.name,
      // Si l'utilisateur est loin de Bruxelles, on laisse les lieux seed sur Bruxelles
      // pour garantir des vrais spots, sinon on seed près de sa zone.
      lat: Math.abs(lat - 50.8466) < 0.3 ? picked.lat + latOffset : 50.8466 + latOffset,
      lng: Math.abs(lng - 4.3528) < 0.3 ? picked.lng + lngOffset : 4.3528 + lngOffset,
      creator_id: creator.id,
    };
    state.plans.set(id, plan);

    // Le créateur est automatiquement participant.
    state.participants.add(`${id}:${creator.id}`);
    const now = new Date().toISOString();
    state.attendance.set(`${id}:${creator.id}`, {
      status: "pending",
      created_at: now,
      updated_at: now,
    });

    // Ajout de 0..(max-1) participants.
    const additional = randInt(0, maxParticipants - 1);
    for (let j = 0; j < additional; j++) {
      const p = profiles[randInt(0, profiles.length - 1)];
      state.participants.add(`${id}:${p.id}`);
      state.attendance.set(`${id}:${p.id}`, {
        status: "pending",
        created_at: now,
        updated_at: now,
      });
    }
  }

  // Seed d'envies (preuve sociale agrégée)
  const seedCommunes = ["ixelles", "bruxelles-centre", "saint-gilles", "etterbeek", "forest"];
  const seedWhen = ["tonight", "weekend", "week"];
  for (let i = 0; i < 14; i++) {
    const p = profiles[randInt(0, profiles.length - 1)];
    state.envies.push({
      id: uuid(),
      user_id: p.id,
      activities: [ACTIVITY_IDS[randInt(0, ACTIVITY_IDS.length - 1)]],
      when_slot: seedWhen[randInt(0, seedWhen.length - 1)],
      commune: seedCommunes[randInt(0, seedCommunes.length - 1)],
      created_at: new Date(Date.now() - randInt(0, 600) * 60 * 1000).toISOString(),
    });
  }
}

export function mockAddEnvie(row: { user_id: string; activities: string[]; when_slot: string; commune: string }) {
  const state = getState();
  const created = { id: uuid(), created_at: new Date().toISOString(), ...row };
  state.envies.push(created);
  return created;
}

export function mockCountRecentEnvies(hours = 24): number {
  const state = getState();
  const since = Date.now() - hours * 3600 * 1000;
  return state.envies.filter((e) => new Date(e.created_at).getTime() >= since).length;
}

export function mockGetEnvies() {
  return [...getState().envies];
}

export function mockDeleteEnvies(ids: string[]) {
  const state = getState();
  const set = new Set(ids);
  state.envies = state.envies.filter((e) => !set.has(e.id));
}

/** Crée un plan à partir d'un groupe matché + inscrit tous les participants. */
export function mockFormGroupPlan(fields: {
  activity: string;
  start_time: string;
  max_participants: number;
  location_text: string;
  lat: number;
  lng: number;
  creator_id: string;
  participant_ids: string[];
}): string {
  const state = getState();
  const id = uuid();
  state.plans.set(id, {
    id,
    activity: fields.activity,
    start_time: fields.start_time,
    max_participants: fields.max_participants,
    location_text: fields.location_text,
    lat: fields.lat,
    lng: fields.lng,
    creator_id: fields.creator_id,
  });
  const now = new Date().toISOString();
  for (const uid of fields.participant_ids) {
    state.participants.add(`${id}:${uid}`);
    state.attendance.set(`${id}:${uid}`, { status: "confirmed", created_at: now, updated_at: now });
  }
  return id;
}

export function mockGetProfile(userId: string): MockProfile | null {
  return getState().profiles.get(userId) ?? null;
}

export function mockUpsertProfile(profile: Omit<MockProfile, "id"> & { id: string }) {
  const state = getState();
  const urls = (profile.photo_urls ?? []).map((u) => u.trim()).filter(Boolean);
  const photo_url = urls[0] ?? profile.photo_url?.trim() ?? null;
  state.profiles.set(profile.id, { ...profile, photo_urls: urls, photo_url });
}

export function mockCreatePlan(row: {
  creator_id: string;
  activity: string;
  start_time: string;
  max_participants: number;
  location_text: string;
  lat: number;
  lng: number;
}): { id: string } {
  const state = getState();
  const id = uuid();
  const plan: MockPlanRow = {
    id,
    activity: row.activity,
    start_time: row.start_time,
    max_participants: row.max_participants,
    location_text: row.location_text,
    lat: row.lat,
    lng: row.lng,
    creator_id: row.creator_id,
  };
  state.plans.set(id, plan);
  state.participants.add(`${id}:${row.creator_id}`);
  const now = new Date().toISOString();
  state.attendance.set(`${id}:${row.creator_id}`, {
    status: "pending",
    created_at: now,
    updated_at: now,
  });
  return { id };
}

export function mockListPlans() {
  const state = getState();
  const plans = Array.from(state.plans.values());
  return { plans };
}

export function mockGetPlan(planId: string) {
  return getState().plans.get(planId) ?? null;
}

export function mockCountParticipants(planId: string) {
  const state = getState();
  let count = 0;
  for (const key of state.participants) {
    const [pId] = key.split(":");
    if (pId === planId) count++;
  }
  return count;
}

export function mockIsUserJoined(planId: string, userId: string) {
  const state = getState();
  return state.participants.has(`${planId}:${userId}`);
}

export function mockJoinPlan(planId: string, userId: string) {
  const state = getState();
  const plan = state.plans.get(planId);
  if (!plan) return { ok: false as const, reason: "NOT_FOUND" };
  if (state.participants.has(`${planId}:${userId}`)) {
    const key = `${planId}:${userId}`;
    const existing = state.attendance.get(key);
    const now = new Date().toISOString();
    if (existing) {
      state.attendance.set(key, { ...existing, status: "pending", updated_at: now });
    } else {
      state.attendance.set(key, { status: "pending", created_at: now, updated_at: now });
    }
    return { ok: true as const };
  }

  const currentCount = mockCountParticipants(planId);
  if (currentCount >= plan.max_participants) return { ok: false as const, reason: "FULL" };

  state.participants.add(`${planId}:${userId}`);
  const now = new Date().toISOString();
  state.attendance.set(`${planId}:${userId}`, {
    status: "pending",
    created_at: now,
    updated_at: now,
  });
  return { ok: true as const };
}

export function mockListPlansForUser(userId: string): MockPlanRow[] {
  const state = getState();
  const idSet = new Set<string>();
  for (const plan of state.plans.values()) {
    if (plan.creator_id === userId) idSet.add(plan.id);
  }
  for (const key of state.participants) {
    const [planId, uid] = key.split(":");
    if (uid === userId) idSet.add(planId);
  }
  const rows = Array.from(idSet)
    .map((id) => state.plans.get(id))
    .filter((p): p is MockPlanRow => Boolean(p));
  rows.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  return rows;
}

export function mockLeavePlan(planId: string, userId: string) {
  const state = getState();
  const plan = state.plans.get(planId);
  if (!plan) return { ok: false as const, reason: "NOT_FOUND" as const };
  if (!state.participants.has(`${planId}:${userId}`)) return { ok: false as const, reason: "NOT_JOINED" as const };
  if (!canCancelOrLeaveBeforeStart(plan.start_time)) return { ok: false as const, reason: "TOO_LATE" as const };

  if (plan.creator_id === userId) {
    state.plans.delete(planId);
    for (const key of [...state.participants]) {
      if (key.startsWith(`${planId}:`)) state.participants.delete(key);
    }
    for (const key of [...state.attendance.keys()]) {
      if (key.startsWith(`${planId}:`)) state.attendance.delete(key);
    }
    for (const key of [...state.checkins.keys()]) {
      if (key.startsWith(`${planId}:`)) state.checkins.delete(key);
    }
    for (const key of [...state.feedbacks.keys()]) {
      if (key.startsWith(`${planId}:`)) state.feedbacks.delete(key);
    }
  } else {
    state.participants.delete(`${planId}:${userId}`);
    state.attendance.delete(`${planId}:${userId}`);
    state.checkins.delete(`${planId}:${userId}`);
    state.feedbacks.delete(`${planId}:${userId}`);
  }
  return { ok: true as const };
}

export function mockSetAttendanceStatus(planId: string, userId: string, status: "pending" | "confirmed" | "cancelled") {
  const state = getState();
  const plan = state.plans.get(planId);
  if (!plan) return { ok: false as const, reason: "NOT_FOUND" as const };
  if (!state.participants.has(`${planId}:${userId}`)) return { ok: false as const, reason: "NOT_JOINED" as const };
  const key = `${planId}:${userId}`;
  const now = new Date().toISOString();
  const existing = state.attendance.get(key);
  state.attendance.set(key, {
    status,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  });
  return { ok: true as const };
}

export function mockGetAttendanceByPlan(planId: string) {
  const state = getState();
  const out: Array<{
    user_id: string;
    status: "pending" | "confirmed" | "cancelled";
    created_at: string;
    updated_at: string;
  }> = [];
  for (const key of state.participants) {
    const [pId, userId] = key.split(":");
    if (pId !== planId) continue;
    const row = state.attendance.get(key);
    if (row) {
      out.push({ user_id: userId, status: row.status, created_at: row.created_at, updated_at: row.updated_at });
    } else {
      const now = new Date().toISOString();
      out.push({ user_id: userId, status: "pending", created_at: now, updated_at: now });
    }
  }
  return out;
}

export function mockSetCheckin(planId: string, userId: string, status: "on_my_way" | "arrived") {
  const state = getState();
  const plan = state.plans.get(planId);
  if (!plan) return { ok: false as const, reason: "NOT_FOUND" as const };
  if (!state.participants.has(`${planId}:${userId}`)) return { ok: false as const, reason: "NOT_JOINED" as const };
  state.checkins.set(`${planId}:${userId}`, { status, updated_at: new Date().toISOString() });
  return { ok: true as const };
}

export function mockGetCheckin(planId: string, userId: string) {
  const row = getState().checkins.get(`${planId}:${userId}`);
  if (!row) return null;
  return { ...row };
}

export function mockSetPlanFeedback(
  planId: string,
  userId: string,
  payload: { would_rejoin: boolean; comment: string | null }
) {
  const state = getState();
  const plan = state.plans.get(planId);
  if (!plan) return { ok: false as const, reason: "NOT_FOUND" as const };
  if (!state.participants.has(`${planId}:${userId}`)) return { ok: false as const, reason: "NOT_JOINED" as const };
  state.feedbacks.set(`${planId}:${userId}`, {
    would_rejoin: payload.would_rejoin,
    comment: payload.comment,
    created_at: new Date().toISOString(),
  });
  return { ok: true as const };
}

export function mockGetPlanFeedback(planId: string, userId: string) {
  const row = getState().feedbacks.get(`${planId}:${userId}`);
  if (!row) return null;
  return { ...row };
}

export function mockListParticipantsByPlans(planIds: string[]) {
  const state = getState();
  const set = new Set(planIds);
  const rows: Array<{ plan_id: string; user_id: string }> = [];
  for (const key of state.participants) {
    const [plan_id, user_id] = key.split(":");
    if (set.has(plan_id)) rows.push({ plan_id, user_id });
  }
  return rows;
}

/** User IDs in this plan (order non garanti ; stable pour un état donné). */
export function mockListUserIdsForPlan(planId: string): string[] {
  const state = getState();
  const out: string[] = [];
  for (const key of state.participants) {
    const [pId, userId] = key.split(":");
    if (pId === planId) out.push(userId);
  }
  return out;
}

export function mockListProfilesByIds(ids: string[]) {
  const state = getState();
  return ids.map((id) => state.profiles.get(id)).filter(Boolean) as MockProfile[];
}

export function mockGetCreator(plan: MockPlanRow): { first_name: string; photo_url?: string | null } {
  const creator = getState().profiles.get(plan.creator_id);
  const creatorMeta: PlanCreator = creator
    ? { first_name: creator.first_name, photo_url: creator.photo_url ?? null }
    : { first_name: "Anonyme", photo_url: null };
  return creatorMeta;
}

