import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { haversineKm } from "@/lib/plans/distance";
import { PARTNER_VENUES } from "@/lib/venues/partnerVenues";
import { COMMUNES, type CommuneId, type VenueAvailability } from "@/lib/venues/venueTypes";
import { ACTIVITIES, type ActivityId } from "@/lib/plans/activities";
import { mockCountParticipants, mockListPlans } from "@/lib/mock/mockDb";

const QuerySchema = z.object({
  activity: z.string().min(1),
  commune: z.string().min(1),
});

function parseSlotStartList(): Date[] {
  const starts: Date[] = [];
  const now = new Date();
  for (let day = 0; day < 3; day++) {
    for (const h of [12, 14, 16, 18, 20]) {
      const d = new Date(now);
      d.setDate(now.getDate() + day);
      d.setHours(h, 0, 0, 0);
      if (d.getTime() > now.getTime() + 20 * 60 * 1000) starts.push(d);
    }
  }
  return starts;
}

function slotTemplateFor(venueId: string, slotStartIso: string, capacityTotal: number) {
  const key = `${venueId}:${slotStartIso}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 33 + key.charCodeAt(i)) % 97;
  const reserved = Math.min(capacityTotal, Math.max(0, hash % 5));
  return Math.max(0, capacityTotal - reserved);
}

async function realTimeJoinedCountForSlot(params: {
  activity: string;
  venueLat: number;
  venueLng: number;
  slotStart: Date;
}): Promise<number> {
  const fromIso = new Date(params.slotStart.getTime() - 75 * 60 * 1000).toISOString();
  const toIso = new Date(params.slotStart.getTime() + 75 * 60 * 1000).toISOString();

  if (!isSupabaseConfigured()) {
    const { plans } = mockListPlans();
    return plans
      .filter((p) => p.activity === params.activity)
      .filter((p) => {
        const t = new Date(p.start_time).getTime();
        return t >= new Date(fromIso).getTime() && t <= new Date(toIso).getTime();
      })
      .filter((p) => haversineKm(params.venueLat, params.venueLng, p.lat, p.lng) <= 0.35)
      .reduce((acc, p) => acc + mockCountParticipants(p.id), 0);
  }

  const admin = getServerSupabaseAdmin();
  const { data: plans } = await admin
    .from("plans")
    .select("id,activity,start_time,lat,lng")
    .eq("activity", params.activity)
    .gte("start_time", fromIso)
    .lte("start_time", toIso);

  const nearPlans = ((plans ?? []) as Array<{ id: string; lat: number; lng: number }>)
    .filter((p) => haversineKm(params.venueLat, params.venueLng, Number(p.lat), Number(p.lng)) <= 0.35)
    .map((p) => p.id);

  if (nearPlans.length === 0) return 0;

  const { data: participants } = await admin.from("plan_participants").select("plan_id").in("plan_id", nearPlans);
  return (participants ?? []).length;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    activity: url.searchParams.get("activity") ?? "",
    commune: url.searchParams.get("commune") ?? "",
  });
  if (!parsed.success) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });

  const activity = parsed.data.activity as ActivityId;
  const commune = parsed.data.commune as CommuneId;
  if (!ACTIVITIES.some((a) => a.id === activity)) {
    return NextResponse.json({ error: "Activité invalide" }, { status: 400 });
  }
  if (!COMMUNES.some((c) => c.id === commune)) {
    return NextResponse.json({ error: "Commune invalide" }, { status: 400 });
  }

  const venues = PARTNER_VENUES.filter((v) => v.activity === activity && v.commune === commune);
  const starts = parseSlotStartList();
  const items: VenueAvailability[] = [];

  for (const venue of venues) {
    for (const slotStart of starts) {
      const slotStartIso = slotStart.toISOString();
      const seededLeft = slotTemplateFor(venue.id, slotStartIso, venue.capacity_total);
      const joinedCount = await realTimeJoinedCountForSlot({
        activity,
        venueLat: venue.lat,
        venueLng: venue.lng,
        slotStart,
      });
      const spotsLeft = Math.max(0, Math.min(seededLeft, venue.capacity_total - joinedCount));
      const slotEnd = new Date(slotStart.getTime() + 90 * 60 * 1000);

      items.push({
        venue_id: venue.id,
        venue_name: venue.name,
        activity,
        commune,
        location_text: venue.location_text,
        lat: venue.lat,
        lng: venue.lng,
        slot_start_iso: slotStartIso,
        slot_end_iso: slotEnd.toISOString(),
        capacity_total: venue.capacity_total,
        spots_left: spotsLeft,
      });
    }
  }

  return NextResponse.json({ items });
}
