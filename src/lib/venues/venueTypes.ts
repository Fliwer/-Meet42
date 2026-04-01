export type CommuneId =
  | "ixelles"
  | "bruxelles-centre"
  | "saint-gilles"
  | "etterbeek"
  | "forest";

export const COMMUNES: Array<{ id: CommuneId; label: string }> = [
  { id: "ixelles", label: "Ixelles" },
  { id: "bruxelles-centre", label: "Bruxelles-Centre" },
  { id: "saint-gilles", label: "Saint-Gilles" },
  { id: "etterbeek", label: "Etterbeek" },
  { id: "forest", label: "Forest" },
];

export type VenueAvailability = {
  venue_id: string;
  venue_name: string;
  activity: string;
  commune: CommuneId;
  location_text: string;
  lat: number;
  lng: number;
  slot_start_iso: string;
  slot_end_iso: string;
  capacity_total: number;
  spots_left: number;
};
