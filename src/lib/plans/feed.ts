export type MomentFilter = "today" | "tomorrow";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function matchesMoment(iso: string, f: MomentFilter): boolean {
  const t = new Date(iso).getTime();
  const now = new Date();
  const sod = startOfDay(now);
  const eod = sod + 24 * 60 * 60 * 1000 - 1;
  const tomStart = sod + 24 * 60 * 60 * 1000;
  const tomEnd = tomStart + 24 * 60 * 60 * 1000 - 1;
  if (f === "today") return t >= sod && t <= eod;
  return t >= tomStart && t <= tomEnd;
}

export function shortLocationLabel(full: string, max = 42): string {
  const t = full.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
