import type { CreatePlanPayload, JoinPlanPayload, PlanSummary } from "@/lib/plans/planTypes";
import type { CommuneId, VenueAvailability } from "@/lib/venues/venueTypes";

async function messageFromErrorResponse(res: Response, fallback: string): Promise<string> {
  const raw = await res.text();
  try {
    const j = JSON.parse(raw) as { error?: unknown };
    if (typeof j?.error === "string" && j.error.trim()) return j.error.trim();
  } catch {
    /* ignore */
  }
  const t = raw.trim();
  if (t) return t.length > 200 ? `${t.slice(0, 200)}…` : t;
  return fallback;
}

export function getAuthHeaders(params: { accessToken: string | null; userId: string | null }) {
  // On envoie aussi `x-user-id` pour que le mode mock puisse fonctionner
  // même si le “access token” est juste un identifiant fictif.
  const headers: Record<string, string> = {};
  if (params.userId) headers["x-user-id"] = params.userId;
  if (params.accessToken) headers["Authorization"] = `Bearer ${params.accessToken}`;
  return headers;
}

export async function apiFetchPlansAround(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
  accessToken: string | null;
  userId: string | null;
}): Promise<PlanSummary[]> {
  const url = new URL("/api/plans", typeof window !== "undefined" ? window.location.origin : "http://localhost");
  url.searchParams.set("lat", String(params.lat));
  url.searchParams.set("lng", String(params.lng));
  url.searchParams.set("radiusKm", String(params.radiusKm ?? 8));
  url.searchParams.set("limit", String(params.limit ?? 30));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
  });

  if (!res.ok) throw new Error(await messageFromErrorResponse(res, "Impossible de charger les plans"));
  const data = (await res.json()) as { plans: PlanSummary[] };
  return data.plans;
}

export async function apiCreatePlan(params: {
  payload: CreatePlanPayload;
  accessToken: string | null;
  userId: string | null;
}): Promise<{ id: string }> {
  const res = await fetch("/api/plans", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
    body: JSON.stringify(params.payload),
  });

  if (!res.ok) throw new Error(await messageFromErrorResponse(res, "Impossible de créer le plan"));
  return (await res.json()) as { id: string };
}

export async function apiJoinPlan(params: {
  planId: string;
  payload?: JoinPlanPayload;
  accessToken: string | null;
  userId: string | null;
}): Promise<void> {
  const res = await fetch(`/api/plans/${params.planId}/join`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
    body: JSON.stringify(params.payload ?? {}),
  });

  if (!res.ok) {
    throw new Error(await messageFromErrorResponse(res, "Impossible de rejoindre le plan"));
  }
}

export async function apiFetchPlanById(params: {
  planId: string;
  accessToken: string | null;
  userId: string | null;
}): Promise<PlanSummary> {
  const res = await fetch(`/api/plans/${params.planId}`, {
    method: "GET",
    headers: {
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
  });
  if (!res.ok) throw new Error(await messageFromErrorResponse(res, "Plan introuvable"));
  return (await res.json()) as PlanSummary;
}

export async function apiFetchMyPlans(params: {
  accessToken: string | null;
  userId: string | null;
}): Promise<PlanSummary[]> {
  const res = await fetch("/api/plans/mine", {
    method: "GET",
    headers: {
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
  });
  if (!res.ok) throw new Error(await messageFromErrorResponse(res, "Impossible de charger tes plans"));
  const data = (await res.json()) as { plans: PlanSummary[] };
  return data.plans;
}

export async function apiLeavePlan(params: {
  planId: string;
  accessToken: string | null;
  userId: string | null;
}): Promise<void> {
  const res = await fetch(`/api/plans/${params.planId}/leave`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(await messageFromErrorResponse(res, "Impossible d’annuler ou de te retirer"));
  }
}

export async function apiFetchVenueAvailability(params: {
  activity: string;
  commune: CommuneId;
  accessToken: string | null;
  userId: string | null;
}): Promise<VenueAvailability[]> {
  const url = new URL(
    "/api/venues/availability",
    typeof window !== "undefined" ? window.location.origin : "http://localhost"
  );
  url.searchParams.set("activity", params.activity);
  url.searchParams.set("commune", params.commune);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
  });
  if (!res.ok) throw new Error(await messageFromErrorResponse(res, "Impossible de charger les disponibilités"));
  const data = (await res.json()) as { items: VenueAvailability[] };
  return data.items;
}

