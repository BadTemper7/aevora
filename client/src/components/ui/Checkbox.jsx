import { useId } from "react";

import { cn } from "../../utils/cn";

export default function Checkbox({ label, error, className, id, ...props }) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            "mt-0.5 size-[18px] shrink-0 rounded border bg-surface accent-brand",
            error ? "border-danger" : "border-line-strong",
          )}
          {...props}
        />
        <label htmlFor={inputId} className="text-sm leading-5 text-ink-soft">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
