import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Talks to the Better Auth routes on our server (/api/auth/*). In dev, Vite proxies /api,
// so the session cookie stays on the same origin. Set VITE_AUTH_URL only if the API lives elsewhere.
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL ?? window.location.origin,
  plugins: [usernameClient()],
  fetchOptions: { credentials: "include" },
});
