import { authClient } from "../../../services/auth/authClient";
import { logout } from "../api/authApi";

/** The signed-in person, straight from the server session. `isPending` is true while it's being checked. */
export function useAuth() {
  const { data, isPending } = authClient.useSession();
  return {
    user: data?.user ?? null,
    isPending,
    isAuthenticated: Boolean(data?.session),
    signOut: () => logout(),
  };
}
