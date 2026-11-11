import { Monitor, Moon, Sun } from "lucide-react";

import { useThemeStore } from "../../stores/themeStore";
import { cn } from "../../utils/cn";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

/**
 * variant="icon"       one button that flips light <-> dark
 * variant="segmented"  Light / System / Dark picker
 */
export default function ThemeToggle({ variant = "icon", className }) {
  const theme = useThemeStore((state) => state.theme);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  if (variant === "segmented") {
    return (
      <div
        role="radiogroup"
        aria-label="Theme"
        className={cn("grid grid-cols-3 gap-1 rounded-xl bg-raised p-1", className)}
      >
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
                active ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  const next = resolvedTheme === "dark" ? "light" : "dark";
  const Icon = resolvedTheme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      className={cn(
        "grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-raised hover:text-ink",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
