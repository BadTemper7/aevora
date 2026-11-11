import Avatar from "../ui/Avatar";

/** Avatar, name and a line of detail, with an optional action on the right. */
export default function UserCard({ name, detail, action }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        {detail && <p className="truncate text-[13px] text-ink-soft">{detail}</p>}
      </div>
      {action}
    </div>
  );
}
