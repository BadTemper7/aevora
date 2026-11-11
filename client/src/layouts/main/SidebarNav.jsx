import { Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

import { NAV_GROUPS } from "../../app/config/navigation";
import { ROUTES } from "../../app/config/routes";
import { cn } from "../../utils/cn";
import { useCommunityUnread, useMessageUnread } from "../../features/social/hooks/useUnreadIndicators";

const linkClass = ({ isActive }) =>
  cn(
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-soft font-semibold text-brand-ink"
      : "text-ink-soft hover:bg-raised hover:text-ink",
  );

export default function SidebarNav() {
  const messageUnread = useMessageUnread().data?.unread || 0;
  const communityUnread = useCommunityUnread().data?.total || 0;
  const badgeFor = path => path === ROUTES.messages ? messageUnread : path === ROUTES.communities ? communityUnread : 0;
  return (
    <nav
      aria-label="Primary"
      className="no-scrollbar sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pb-6"
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.id} className="mb-6">
          <h2 className="px-3 pb-2 text-xs font-semibold text-ink-faint">{group.title}</h2>
          <ul className="space-y-0.5">
            {group.items.map(({ label, icon: Icon, path }) => (
              <li key={path}>
                <NavLink to={path} end={path === ROUTES.home} className={linkClass}>
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  {badgeFor(path) > 0 && <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-on-brand" aria-label={`${badgeFor(path)} unread ${path === ROUTES.messages ? 'messages' : 'community messages'}`}>{badgeFor(path) > 99 ? '99+' : badgeFor(path)}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="border-t border-line pt-4">
        <NavLink to={ROUTES.settings} className={linkClass}>
          <Settings className="size-5 shrink-0" aria-hidden="true" />
          Settings
        </NavLink>
      </div>
    </nav>
  );
}
