/** Browser/WebRTC capture controls. This is not paid AI/Krisp cancellation. */
export const DEFAULT_AUDIO_SETTINGS = Object.freeze({
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
});
export const AUDIO_SETTINGS_KEY = "aevora:voice:audio-settings:v1";

export function normalizeAudioSettings(input) {
  return Object.fromEntries(Object.entries(DEFAULT_AUDIO_SETTINGS).map(([key, fallback]) => [
    key, typeof input?.[key] === "boolean" ? input[key] : fallback,
  ]));
}

export function loadAudioSettings() {
  try {
    return normalizeAudioSettings(JSON.parse(window.localStorage.getItem(AUDIO_SETTINGS_KEY) || "null"));
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function storeAudioSettings(value) {
  try { window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(normalizeAudioSettings(value))); }
  catch { /* private browsing can reject storage */ }
}
