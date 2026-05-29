import type { CreatePlanPayload, JoinPlanPayload, PlanSummary } from "@/lib/plans/planTypes";
import type { CommuneId, VenueAvailability } from "@/lib/venues/venueTypes";
import { ApiError, fetchWithNetworkHandling, parseApiErrorBody } from "@/lib/api/apiError";

async function assertOk(res: Response, fallback: string): Promise<void> {
  if (!res.ok) {
    throw new ApiError(await parseApiErrorBody(res, fallback), "http");
  }
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

  const res = await fetchWithNetworkHandling(url.toString(), {
    method: "GET",
    headers: {
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
  });

  await assertOk(res, "Impossible de charger les plans");
  const data = (await res.json()) as { plans: PlanSummary[] };
  return data.plans;
}

export async function apiCreatePlan(params: {
  payload: CreatePlanPayload;
  accessToken: string | null;
  userId: string | null;
}): Promise<{ id: string }> {
  const res = await fetchWithNetworkHandling("/api/plans", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
    body: JSON.stringify(params.payload),
  });

  await assertOk(res, "Impossible de créer le plan");
  return (await res.json()) as { id: string };
}

export async function apiJoinPlan(params: {
  planId: string;
  payload?: JoinPlanPayload;
  accessToken: string | null;
  userId: string | null;
}): Promise<void> {
  const res = await fetchWithNetworkHandling(`/api/plans/${params.planId}/join`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
    body: JSON.stringify(params.payload ?? {}),
  });

  await assertOk(res, "Impossible de rejoindre le plan");
}

export async function apiFetchPlanById(params: {
  planId: string;
  accessToken: string | null;
  userId: string | null;
}): Promise<PlanSummary> {
  const res = await fetchWithNetworkHandling(`/api/plans/${params.planId}`, {
    method: "GET",
    headers: {
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
  });
  await assertOk(res, "Plan introuvable");
  return (await res.json()) as PlanSummary;
}

export async function apiFetchMyPlans(params: {
  accessToken: string | null;
  userId: string | null;
}): Promise<PlanSummary[]> {
  const res = await fetchWithNetworkHandling("/api/plans/mine", {
    method: "GET",
    headers: {
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
  });
  await assertOk(res, "Impossible de charger tes plans");
  const data = (await res.json()) as { plans: PlanSummary[] };
  return data.plans;
}

export async function apiLeavePlan(params: {
  planId: string;
  accessToken: string | null;
  userId: string | null;
}): Promise<void> {
  const res = await fetchWithNetworkHandling(`/api/plans/${params.planId}/leave`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
    body: JSON.stringify({}),
  });
  await assertOk(res, "Impossible d’annuler ou de te retirer");
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

  const res = await fetchWithNetworkHandling(url.toString(), {
    method: "GET",
    headers: {
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
  });
  await assertOk(res, "Impossible de charger les disponibilités");
  const data = (await res.json()) as { items: VenueAvailability[] };
  return data.items;
}

export async function apiFetchMyCheckin(params: {
  planId: string;
  accessToken: string | null;
  userId: string | null;
}): Promise<{ status: "on_my_way" | "arrived"; updated_at: string } | null> {
  const res = await fetchWithNetworkHandling(`/api/plans/${params.planId}/checkin`, {
    method: "GET",
    headers: {
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
  });
  await assertOk(res, "Impossible de charger ton check-in");
  const data = (await res.json()) as { checkin: { status: "on_my_way" | "arrived"; updated_at: string } | null };
  return data.checkin;
}

export async function apiSetMyCheckin(params: {
  planId: string;
  status: "on_my_way" | "arrived";
  accessToken: string | null;
  userId: string | null;
}): Promise<void> {
  const res = await fetchWithNetworkHandling(`/api/plans/${params.planId}/checkin`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
    body: JSON.stringify({ status: params.status }),
  });
  await assertOk(res, "Impossible d’enregistrer ton check-in");
}

export async function apiFetchMyPlanFeedback(params: {
  planId: string;
  accessToken: string | null;
  userId: string | null;
}): Promise<{ would_rejoin: boolean; comment: string | null; created_at: string } | null> {
  const res = await fetchWithNetworkHandling(`/api/plans/${params.planId}/feedback`, {
    method: "GET",
    headers: {
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
  });
  await assertOk(res, "Impossible de charger ton feedback");
  const data = (await res.json()) as {
    feedback: { would_rejoin: boolean; comment: string | null; created_at: string } | null;
  };
  return data.feedback;
}

export async function apiSubmitMyPlanFeedback(params: {
  planId: string;
  would_rejoin: boolean;
  comment?: string;
  accessToken: string | null;
  userId: string | null;
}): Promise<void> {
  const res = await fetchWithNetworkHandling(`/api/plans/${params.planId}/feedback`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
    body: JSON.stringify({ would_rejoin: params.would_rejoin, comment: params.comment ?? "" }),
  });
  await assertOk(res, "Impossible d’envoyer ton feedback");
}

export type AttendanceStatus = "pending" | "confirmed" | "cancelled" | "maybe";

export type PlanAttendanceParticipant = {
  user_id: string;
  first_name: string;
  photo_url: string | null;
  status: AttendanceStatus;
};

export async function apiFetchPlanAttendance(params: {
  planId: string;
  accessToken: string | null;
  userId: string | null;
}): Promise<PlanAttendanceParticipant[]> {
  const res = await fetchWithNetworkHandling(`/api/plans/${params.planId}/attendance`, {
    method: "GET",
    headers: {
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
  });
  await assertOk(res, "Impossible de charger les présences");
  const data = (await res.json()) as { participants: PlanAttendanceParticipant[] };
  return data.participants;
}

export async function apiConfirmAttendance(params: {
  planId: string;
  accessToken: string | null;
  userId: string | null;
}): Promise<void> {
  const res = await fetchWithNetworkHandling(`/api/plans/${params.planId}/attendance/confirm`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
    body: JSON.stringify({}),
  });
  await assertOk(res, "Impossible de confirmer la présence");
}

export async function apiCancelAttendance(params: {
  planId: string;
  accessToken: string | null;
  userId: string | null;
}): Promise<void> {
  const res = await fetchWithNetworkHandling(`/api/plans/${params.planId}/attendance/cancel`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAuthHeaders({ accessToken: params.accessToken, userId: params.userId }),
    },
    body: JSON.stringify({}),
  });
  await assertOk(res, "Impossible d’annuler la présence");
}

