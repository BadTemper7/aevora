import { useId } from "react";

import { cn } from "../../utils/cn";

export default function Input({
  label,
  error,
  hint,
  hintTone = "neutral",
  leftIcon: LeftIcon,
  trailing,
  labelAction,
  id,
  className,
  ...props
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error || hint;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        {LeftIcon && (
          <LeftIcon
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
        )}

        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            "h-11 w-full rounded-xl border bg-surface text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:ring-3",
            LeftIcon ? "pl-10" : "pl-3.5",
            trailing ? "pr-11" : "pr-3.5",
            error
              ? "border-danger focus:ring-danger/25"
              : "border-line hover:border-line-strong focus:border-brand focus:ring-brand/25",
          )}
          {...props}
        />

        {trailing && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>

      {message && (
        <p
          id={messageId}
          aria-live="polite"
          className={cn(
            "mt-1.5 text-[13px] leading-5",
            error ? "text-danger" : hintTone === "success" ? "text-green-600" : "text-ink-soft",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
