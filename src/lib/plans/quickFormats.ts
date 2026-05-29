import type { ActivityId } from "@/lib/plans/activities";

export type QuickFormat = {
  id: string;
  title: string;
  subtitle: string;
  activity: ActivityId;
  locationText: string;
  lat: number;
  lng: number;
  minutesFromNow: number;
  maxParticipants: 4 | 5 | 6;
};

export const QUICK_FORMATS: QuickFormat[] = [
  {
    id: "drink-meet-ixelles",
    title: "Afterwork Ixelles",
    subtitle: "Drink & meet 6 people",
    activity: "drinks",
    locationText: "Café Belga, Place Eugène Flagey 18, 1050 Ixelles",
    lat: 50.8258,
    lng: 4.3666,
    minutesFromNow: 120,
    maxParticipants: 6,
  },
  {
    id: "sunday-coffee-center",
    title: "Sunday coffee",
    subtitle: "Rencontre douce du dimanche",
    activity: "coffee",
    locationText: "OR Coffee Roasters (Centre)",
    lat: 50.8476,
    lng: 4.3526,
    minutesFromNow: 18 * 60,
    maxParticipants: 5,
  },
  {
    id: "walk-cinquantenaire",
    title: "Balade Cinquantenaire",
    subtitle: "Walk & talk en petit groupe",
    activity: "walk",
    locationText: "Parc du Cinquantenaire",
    lat: 50.8399,
    lng: 4.3946,
    minutesFromNow: 180,
    maxParticipants: 6,
  },
];

export const TOP_ACTIVITY_FILTERS: ActivityId[] = ["drinks", "coffee", "walk"];
