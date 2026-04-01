export const ACTIVITIES = [
  { id: "coffee", label: "Café", emoji: "☕" },
  { id: "drinks", label: "Boire un verre", emoji: "🍻" },
  { id: "talk", label: "Parler", emoji: "🗣️" },
  { id: "music", label: "Musique au parc", emoji: "🎵" },
  { id: "bowling", label: "Bowling", emoji: "🎳" },
  { id: "axe", label: "Lancer de hache", emoji: "🪓" },
  { id: "escape", label: "Escape game", emoji: "🧩" },
  { id: "billiard", label: "Billard", emoji: "🎱" },
  { id: "kicker", label: "Kicker", emoji: "⚽" },
  { id: "work", label: "Travailler", emoji: "💻" },
  { id: "walk", label: "Se promener", emoji: "🚶" },
] as const;

export type ActivityId = (typeof ACTIVITIES)[number]["id"];
