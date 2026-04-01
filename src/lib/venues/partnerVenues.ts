import type { ActivityId } from "@/lib/plans/activities";
import type { CommuneId } from "@/lib/venues/venueTypes";

export type PartnerVenue = {
  id: string;
  name: string;
  activity: ActivityId;
  commune: CommuneId;
  location_text: string;
  lat: number;
  lng: number;
  capacity_total: number;
};

export const PARTNER_VENUES: PartnerVenue[] = [
  {
    id: "v_bowling_stones",
    name: "Bowling Stones",
    activity: "bowling",
    commune: "etterbeek",
    location_text: "Bowling Stones, Etterbeek",
    lat: 50.8414,
    lng: 4.3928,
    capacity_total: 6,
  },
  {
    id: "v_crosly",
    name: "Crosly Bowling",
    activity: "bowling",
    commune: "bruxelles-centre",
    location_text: "Crosly Bowling, Bruxelles",
    lat: 50.8422,
    lng: 4.3906,
    capacity_total: 6,
  },
  {
    id: "v_woodcutter_ixelles",
    name: "WoodCutter Ixelles",
    activity: "axe",
    commune: "ixelles",
    location_text: "WoodCutter, Ixelles",
    lat: 50.8279,
    lng: 4.3715,
    capacity_total: 6,
  },
  {
    id: "v_escape_hunt",
    name: "Escape Hunt Brussels",
    activity: "escape",
    commune: "bruxelles-centre",
    location_text: "Escape Hunt, Bruxelles-Centre",
    lat: 50.848,
    lng: 4.3577,
    capacity_total: 6,
  },
  {
    id: "v_enygma",
    name: "Enygma Escape Rooms",
    activity: "escape",
    commune: "saint-gilles",
    location_text: "Enygma, Saint-Gilles",
    lat: 50.8273,
    lng: 4.3498,
    capacity_total: 6,
  },
  {
    id: "v_billard_royal",
    name: "Billard Royal",
    activity: "billiard",
    commune: "ixelles",
    location_text: "Billard Royal, Ixelles",
    lat: 50.8326,
    lng: 4.3604,
    capacity_total: 6,
  },
  {
    id: "v_golden8",
    name: "Golden 8 Pool",
    activity: "billiard",
    commune: "forest",
    location_text: "Golden 8 Pool, Forest",
    lat: 50.8175,
    lng: 4.3342,
    capacity_total: 6,
  },
];
