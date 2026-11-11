import { cn } from "../../utils/cn";

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {Icon && (
        <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
          <Icon className="size-7" aria-hidden="true" />
        </span>
      )}
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
