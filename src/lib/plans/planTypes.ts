export type Plan = {
  id: string;
  activity: string;
  start_time: string; // ISO
  max_participants: number; // 4..6
  location_text: string;
  lat: number;
  lng: number;
  creator_id: string;
};

export type PlanCreator = {
  first_name: string;
  photo_url?: string | null;
};

export type PlanSummary = {
  id: string;
  activity: string;
  start_time: string; // ISO
  max_participants: number;
  participants_count: number; // current participants
  distance_km: number | null; // computed on server
  location_text: string;
  lat: number;
  lng: number;
  creator: PlanCreator;
  is_joined: boolean;
  /** Indique si l’utilisateur courant est le créateur du plan. */
  is_creator: boolean;
};

export type CreatePlanPayload = {
  activity: string;
  start_time_iso: string;
  location_text: string;
  lat: number;
  lng: number;
  max_participants: number;
};

export type JoinPlanPayload = Record<string, never>;

