/** GIPHY's API must be called from the browser, not proxied or cached by Aevora.
 * VITE_GIPHY_API_KEY is a public browser integration key, never a secret.
 * https://developers.giphy.com/docs/api/best-practices/
 */
const getKey = () => String(import.meta.env?.VITE_GIPHY_API_KEY || "").trim();
export const isGiphyConfigured = () => Boolean(getKey());

export const toGif = (item) => {
  const images = item?.images || {};
  const url = images?.downsized?.url || images?.fixed_width?.url || images?.original?.url;
  const previewUrl = images?.fixed_width_small?.url || images?.fixed_width?.url || url;
  const safe = (value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" && /^(?:media\d*|i)\.giphy\.com$/i.test(parsed.hostname);
    } catch { return false; }
  };
  if (!item?.id || !safe(url) || !safe(previewUrl)) return null;
  return { id: String(item.id), source: "giphy", url, previewUrl, description: String(item.title || item.alt_text || "GIF").slice(0, 120) };
};

async function getGiphy(path, fields, signal) {
  const key = getKey();
  if (!key) throw new Error("GIF search is not configured. Add VITE_GIPHY_API_KEY to client/.env and restart Vite.");
  const query = new URLSearchParams({ api_key: key, rating: "pg", ...fields });
  const response = await fetch(`https://api.giphy.com/v1/gifs${path ? `/${path}` : ""}?${query}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`GIPHY is unavailable (${response.status}). Try again.`);
  const payload = await response.json();
  if (payload.meta?.status && payload.meta.status !== 200) throw new Error(payload.meta.msg || "GIPHY search failed.");
  return payload;
}

export async function browseGiphy({ category = "trending", term = "", offset = 0, signal } = {}) {
  // Search exactly what the user typed. Categories are actual GIPHY searches.
  const query = term.trim() || (category === "reactions" ? "reaction" : category === "funny" ? "funny" : "");
  const data = await getGiphy(query ? "search" : "trending", {
    ...(query ? { q: query.slice(0, 50) } : {}), limit: "24", offset: String(offset),
  }, signal);
  return { items: (data.data || []).map(toGif).filter(Boolean), nextOffset: data.pagination?.count ? Number(offset) + data.pagination.count : null };
}

export async function getGiphyByIds(ids, signal) {
  const valid = [...new Set(ids.filter((id) => /^[A-Za-z0-9_-]{1,90}$/.test(String(id))))].slice(0, 100);
  if (!valid.length) return [];
  const data = await getGiphy("", { ids: valid.join(",") }, signal);
  return (data.data || []).map(toGif).filter(Boolean);
}
