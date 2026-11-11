/**
 * Run Better Auth's normal social OAuth flow inside a browser popup.
 *
 * Unlike the experimental oauthPopup client, we do not poll popup.closed.
 * Browsers can report closed=true as soon as Google changes the opener's
 * cross-origin browsing context, even while the Google window remains open.
 *
 * The same-origin completion page uses postMessage, BroadcastChannel and a
 * storage event to notify the opener. A fresh server session is mandatory
 * before this function resolves. No credentials travel through these events.
 */
export const GOOGLE_POPUP_CHANNEL = "aevora-google-auth";
export const GOOGLE_POPUP_KEY_PREFIX = "aevora:google-auth:";
export const GOOGLE_POPUP_MESSAGE_TYPE = "aevora:google-auth-result";

const POPUP_TIMEOUT_MS = 3 * 60 * 1000;
const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 660;

function authError(message, name = "Error") {
  const error = new Error(message);
  error.name = name;
  return error;
}

function windowFeatures(browser) {
  const left = Math.max(0, Math.round(browser.screenX + (browser.outerWidth - POPUP_WIDTH) / 2));
  const top = Math.max(0, Math.round(browser.screenY + (browser.outerHeight - POPUP_HEIGHT) / 2));
  return `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},resizable=yes,scrollbars=yes`;
}

/**
 * Must be called synchronously from a button click, BEFORE the first await.
 *
 * requestAuthorization: ({ callbackURL, errorCallbackURL }) => Promise<{data,error}>
 * fetchSession: () => Promise<{ user, session }>
 */
export function openGooglePopup({ requestAuthorization, fetchSession, onStatus = () => {}, signal } = {}) {
  const browser = window;
  const flow = browser.crypto.randomUUID();
  const completionURL = new URL("/google-auth-complete.html", browser.location.origin);
  completionURL.searchParams.set("flow", flow);
  const errorURL = new URL(completionURL);
  errorURL.searchParams.set("oauth_error", "1");
  const storageKey = `${GOOGLE_POPUP_KEY_PREFIX}${flow}`;

  // Open NOW while the browser still recognizes this as a user gesture.
  const popup = browser.open("about:blank", `aevora-google-${flow}`, windowFeatures(browser));
  if (!popup) {
    return Promise.reject(authError("Your browser blocked the Google sign-in window. Allow popups for Aevora and try again."));
  }

  try {
    popup.document.title = "Connecting to Google - Aevora";
    popup.document.body.innerHTML =
      '<div style="font:16px system-ui,sans-serif;text-align:center;padding:64px 24px;color:#27364f">' +
      '<h2>Connecting to Google...</h2><p>Please keep this window open.</p></div>';
  } catch {
    // A restricted popup may not expose its document; the OAuth redirect still works.
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let verifying = false;
    let channel = null;
    let timer = null;

    function closePopup() {
      try { popup.close(); } catch { /* Window may have lost its opener relationship. */ }
    }

    function cleanup() {
      browser.removeEventListener("message", onMessage);
      browser.removeEventListener("storage", onStorage);
      signal?.removeEventListener("abort", onAbort);
      if (timer) clearTimeout(timer);
      if (channel) channel.close();
      try { browser.localStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
    }

    function finish(error, session) {
      if (settled) return;
      settled = true;
      cleanup();
      closePopup();
      if (error) reject(error);
      else resolve(session);
    }

    function onResult(payload) {
      if (settled || !payload || payload.type !== GOOGLE_POPUP_MESSAGE_TYPE || payload.flow !== flow) return;
      if (payload.status === "error") {
        finish(authError(payload.error || "Google authentication could not be completed. Please try again."));
        return;
      }
      if (payload.status !== "success" || verifying) return;
      verifying = true;
      onStatus("Google connected. Verifying your Aevora account...");
      Promise.resolve()
        .then(fetchSession)
        .then((session) => {
          if (!session?.user || !session?.session) {
            throw authError("Google finished, but Aevora could not verify your session. Please try again.");
          }
          finish(null, session);
        })
        .catch((error) => finish(error));
    }

    function onMessage(event) {
      if (event.origin !== browser.location.origin) return;
      onResult(event.data);
    }

    function onStorage(event) {
      if (event.key !== storageKey || !event.newValue) return;
      try { onResult(JSON.parse(event.newValue)); } catch { /* Ignore unrelated data. */ }
    }

    function onAbort() {
      finish(authError("Google sign-in was canceled.", "AbortError"));
    }

    browser.addEventListener("message", onMessage);
    browser.addEventListener("storage", onStorage);
    if (typeof browser.BroadcastChannel === "function") {
      try {
        channel = new browser.BroadcastChannel(GOOGLE_POPUP_CHANNEL);
        channel.addEventListener("message", (event) => onResult(event.data));
      } catch {
        // postMessage and storage still provide completion notifications.
      }
    }

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => finish(authError("Google sign-in took too long. Close the Google window and try again.")), POPUP_TIMEOUT_MS);

    onStatus("Opening the Google sign-in window...");
    Promise.resolve()
      .then(() => requestAuthorization({ callbackURL: completionURL.href, errorCallbackURL: errorURL.href }))
      .then((result) => {
        if (settled) return;
        if (result?.error) throw authError(result.error.message || "Google sign-in could not be started.");
        if (!result?.data?.url) throw authError("Google did not return a sign-in URL. Check the server's Google OAuth settings.");
        popup.location.replace(result.data.url);
        onStatus("Choose your account in the Google window to continue.");
      })
      .catch((error) => finish(error));
  });
}
