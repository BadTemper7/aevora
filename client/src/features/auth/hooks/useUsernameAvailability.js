import { useCallback, useEffect, useState } from "react";

import { authClient } from "../../../services/auth/authClient";
import { validateUsername } from "../../../utils/validators";

// Debouncing avoids an API request on every keystroke. The server remains the
// authority; availability in the UI is a preview, not a reservation.
export const USERNAME_CHECK_DELAY_MS = 350;

export function useUsernameAvailability(value) {
  const normalized = value.toLowerCase();
  const valid = !validateUsername(value);
  const [lookup, setLookup] = useState({ username: "", status: "idle" });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!valid) return;

    let active = true;
    setLookup({ username: normalized, status: "checking" });

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await authClient.isUsernameAvailable({
          username: normalized,
        });
        if (!active) return; // Ignore a response for a name the user changed.
        const status = error || typeof data?.available !== "boolean"
          ? "error"
          : data.available ? "available" : "taken";
        setLookup({ username: normalized, status });
      } catch {
        if (active) setLookup({ username: normalized, status: "error" });
      }
    }, USERNAME_CHECK_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalized, valid, retryCount]);

  // Never reuse the availability result for a previous username.
  const status = !valid ? "idle"
    : lookup.username === normalized ? lookup.status : "checking";

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);
  const markTaken = useCallback(() => {
    // A last-moment server collision takes precedence over the earlier check.
    setLookup({ username: normalized, status: "taken" });
  }, [normalized]);

  return { normalized, valid, status, retry, markTaken };
}
