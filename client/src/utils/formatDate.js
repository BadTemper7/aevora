const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "2 hours ago", "yesterday", "just now". Accepts an ISO string or Date. */
export function formatRelativeTime(input, now = Date.now()) {
  const seconds = Math.round((new Date(input).getTime() - now) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 45) return "Just now";

  for (const [unit, size] of UNITS) {
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(Math.round(seconds / 60), "minute");
}
