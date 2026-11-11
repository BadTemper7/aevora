import { AtSign, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";

import Input from "../../../components/ui/Input";
import { validateUsername } from "../../../utils/validators";

/** Shared username field for email registration and Google profile completion. */
export default function UsernameInput({ value, availability, error, ...props }) {
  const { status, valid, retry } = availability;

  const formatError = value && !valid ? validateUsername(value) : "";
  const availabilityError = status === "taken"
    ? "This username is already taken. Choose another."
    : status === "error"
      ? "Couldn't check availability. Try again."
      : "";

  const visibleError = error || formatError || availabilityError || undefined;
  const hint = !visibleError
    ? status === "checking"
      ? "Checking username availability..."
      : status === "available"
        ? "Username is available."
        : "3–20 characters: letters, numbers, and underscores."
    : undefined;

  const trailing = status === "checking"
    ? <LoaderCircle size={17} className="animate-spin text-ink-faint" aria-hidden="true" />
    : status === "available"
      ? <CheckCircle2 size={17} className="text-green-600" aria-hidden="true" />
      : status === "error"
        ? (
          <button
            type="button"
            title="Retry username availability check"
            aria-label="Retry username availability check"
            className="rounded-md p-1 text-ink-soft hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand"
            onClick={retry}
          >
            <RefreshCw size={17} aria-hidden="true" />
          </button>
        )
        : undefined;

  return (
    <Input
      label="Username"
      autoComplete="username"
      autoCapitalize="none"
      spellCheck={false}
      maxLength={20}
      placeholder="your_username"
      leftIcon={AtSign}
      {...props}
      value={value}
      error={visibleError}
      hint={hint}
      hintTone={status === "available" ? "success" : "neutral"}
      trailing={trailing}
    />
  );
}
