import { getPasswordStrength } from "../../../utils/validators";
import { cn } from "../../../utils/cn";

const BAR_COLORS = ["", "bg-danger", "bg-warning", "bg-brand", "bg-success"];

/** Four-segment meter. The label says it in words, so colour is never the only signal. */
export default function PasswordStrength({ password }) {
  const { score, label } = getPasswordStrength(password);

  return (
    <div className="mt-2.5">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              step <= score ? BAR_COLORS[score] : "bg-line",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-[13px] text-ink-soft" aria-live="polite">
        {password ? `${label} password. ` : ""}
        Use 8 or more characters with letters, numbers and a symbol.
      </p>
    </div>
  );
}
