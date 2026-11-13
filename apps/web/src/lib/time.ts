const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const steps: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 hours ago", "yesterday", "just now". Accepts PocketBase date strings. */
export function timeAgo(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value.replace(" ", "T")) : value;
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/** "November 2026", for "member since". */
export function monthYear(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value.replace(" ", "T")) : value;
  return date.toLocaleDateString("en", { month: "long", year: "numeric" });
}
