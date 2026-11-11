import { useState } from "react";
import { AtSign, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../app/config/routes";
import FormAlert from "../../../components/feedback/FormAlert";
import Button from "../../../components/ui/Button";
import { authClient } from "../../../services/auth/authClient";
import { logout } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";
import { useUsernameAvailability } from "../hooks/useUsernameAvailability";
import UsernameInput from "../components/UsernameInput";

export default function CompleteRegistrationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const availability = useUsernameAvailability(username);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [processingText, setProcessingText] = useState("");
  const normalized = availability.normalized;
  const valid = availability.valid;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid || availability.status !== "available" || saving) return;
    setError("");
    setSaving(true);
    setProcessingText("Saving your unique username...");
    let redirecting = false;

    try {
      // Better Auth checks username uniqueness again on the server. The MongoDB
      // unique index is the final defense against two users choosing it at once.
      const result = await authClient.updateUser({ username: normalized });
      if (result.error) {
        const duplicate = result.error.code === "USERNAME_IS_ALREADY_TAKEN" ||
          /already taken|already exists/i.test(result.error.message || "");
        if (duplicate) {
          availability.markTaken();
          return; // Inline duplicate warning; username is still required.
        }
        throw new Error(result.error.message || "Could not save your username.");
      }

      setProcessingText("Registration complete. Opening your account...");
      // A getSession() request does not always update useSession() immediately.
      // Reload once after the confirmed write, so all route guards see the
      // freshly saved username rather than sending the user back here.
      window.location.replace(ROUTES.home);
      redirecting = true;
    } catch (cause) {
      setError(cause?.message || "Something went wrong. Please try again.");
      setProcessingText("");
    } finally {
      if (!redirecting) setSaving(false);
    }
  };

  const switchAccount = async () => {
    try {
      await logout();
      navigate(ROUTES.login, { replace: true });
    } catch (cause) {
      setError(cause?.message || "Could not sign out. Please try again.");
    }
  };

  return (
    <>
      <title>Choose a username - Aevora</title>
      <div className="mb-7 flex items-center gap-3">
        <div className="rounded-xl bg-brand/10 p-3 text-brand"><AtSign size={22} /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Final step</p>
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Choose your username</h1>
        </div>
      </div>
      <p className="mb-6 text-sm leading-6 text-ink-soft">
        {user?.name ? `Welcome, ${user.name}! ` : ""}
        Your Google account is connected. Choose a unique username to finish creating your Aevora profile.
      </p>
      <form onSubmit={submit} className="space-y-5" noValidate aria-busy={saving || undefined}>
        {error && <FormAlert>{error}</FormAlert>}
        <UsernameInput
          value={username}
          disabled={saving}
          onChange={(event) => { setUsername(event.target.value); setError(""); }}
          availability={availability}
        />
        <Button type="submit" size="lg" fullWidth loading={saving} disabled={!valid || availability.status !== "available" || saving}>
          {saving ? "Completing registration..." : "Complete registration"}
        </Button>
        {saving && (
          <div role="status" aria-live="polite" className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink-soft">
            <LoaderCircle size={18} className="shrink-0 animate-spin text-brand-ink" aria-hidden="true" />
            <span>{processingText}</span>
          </div>
        )}
      </form>
      <button
        type="button"
        disabled={saving}
        className="mt-5 text-sm font-medium text-ink-soft hover:underline disabled:opacity-50"
        onClick={switchAccount}
      >
        Use a different account
      </button>
    </>
  );
}
