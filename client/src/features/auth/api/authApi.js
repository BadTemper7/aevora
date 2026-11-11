import { ROUTES } from "../../../app/config/routes";
import { authClient } from "../../../services/auth/authClient";
import { openGooglePopup } from "./googlePopup";

// Better Auth returns { data, error } instead of throwing; turn errors into exceptions.
function unwrap({ data, error }) {
  if (error) {
    const exception = new Error(error.message || "Something went wrong. Please try again.");
    exception.code = error.code;
    throw exception;
  }
  return data;
}

export const login = ({ email, password }) => authClient.signIn.email({ email, password }).then(unwrap);

export const register = ({ name, username, email, password }) =>
  authClient.signUp.email({ name, username, email, password }).then(unwrap);

/**
 * Use regular Better Auth Google OAuth in a popup (not the experimental
 * oauthPopup plugin). The completion page notifies this tab only after the
 * Google callback finishes and Better Auth has set the session cookie.
 */
export const loginWithGoogle = async ({ signal, onStatus } = {}) => {
  const session = await openGooglePopup({
    signal,
    onStatus,
    requestAuthorization: (urls) =>
      authClient.signIn.social({ provider: "google", disableRedirect: true, ...urls }),
    fetchSession: async () => {
      // A new OAuth cookie may become visible a moment after the redirect.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = await authClient.getSession({ query: { disableCookieCache: true } });
        if (result.error) throw new Error(result.error.message || "Could not verify your Aevora session.");
        if (result.data?.user && result.data?.session) return result.data;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error("Google sign-in finished, but no Aevora session was found. Please retry.");
    },
  });

  // A full navigation gets a fresh useSession() value, avoiding stale route
  // guards after a Google account is created in a separate window.
  onStatus?.("Account verified. Opening Aevora...");
  window.location.replace(session.user.username ? ROUTES.home : ROUTES.completeRegistration);
  return session;
};

export const logout = () => authClient.signOut().then(unwrap);
