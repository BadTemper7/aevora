import { cn } from "../../../../utils/cn";

const AUDIENCES = [
  { value: "everyone", label: "Everyone" },
  { value: "following", label: "Following" },
];

export default function FeedHeader({ audience, onAudienceChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Your feed</h1>

      <div role="tablist" aria-label="Whose posts to show" className="flex rounded-xl bg-raised p-1">
        {AUDIENCES.map(({ value, label }) => {
          const active = audience === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onAudienceChange(value)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
                active ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
