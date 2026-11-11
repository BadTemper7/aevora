export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** "Rey Santos" -> "RS", "alex" -> "A" */
export function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Small deterministic hash, used to give each person a stable avatar colour. */
export function hashString(value = "") {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** "rey.santos@mail.com" -> "Rey Santos" */
export function nameFromEmail(email = "") {
  const local = email.split("@")[0] ?? "";
  const words = local.split(/[._-]+/).filter(Boolean);
  if (words.length === 0) return "Aevora member";
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}
