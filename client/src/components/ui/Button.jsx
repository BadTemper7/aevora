import { LoaderCircle } from "lucide-react";

import { cn } from "../../utils/cn";

const VARIANTS = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  secondary: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-raised",
  ghost: "text-ink-soft hover:bg-raised hover:text-ink",
};

const SIZES = {
  sm: "h-9 gap-2 rounded-lg px-3 text-sm",
  md: "h-11 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-xl px-5 text-[15px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon: LeftIcon,
  fullWidth = false,
  type = "button",
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold transition-colors disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        LeftIcon && <LeftIcon className="size-[18px]" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
