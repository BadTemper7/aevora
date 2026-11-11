import { useEffect, useRef, useState } from "react";
import {
  CalendarDays, Clapperboard, Compass, Gamepad2, HelpCircle,
  House, Menu, Plus, Settings, Shield, SquareCheck, TvMinimalPlay, X,
  UserRound, Users, UsersRound, Building2, MessageCircle,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { ROUTES } from "../../app/config/routes";
import { cn } from "../../utils/cn";
import { useMessageUnread } from "../../features/social/hooks/useUnreadIndicators";
import ThemeToggle from "../../components/common/ThemeToggle";

// One navigation system for the feed, full-screen conversations and communities.
// Secondary destinations remain available through the clearly labeled More menu.
export const MORE_NAV = [
  { label: "Explore", path: ROUTES.explore, icon: Compass },
  { label: "Friends", path: ROUTES.friends, icon: Users },
  { label: "Short videos", path: ROUTES.videos, icon: Clapperboard },
  { label: "Subscriptions", path: ROUTES.subscriptions, icon: TvMinimalPlay },
  { label: "Gaming", path: ROUTES.gaming, icon: Gamepad2 },
  { label: "Profile", path: ROUTES.profile, icon: UserRound },
  { label: "Privacy & Safety", path: ROUTES.privacySafety, icon: Shield },
  { label: "Settings", path: ROUTES.settings, icon: Settings },
  { label: "Company", path: ROUTES.workspace, icon: Building2 },
  { label: "Calendar", path: ROUTES.calendar, icon: CalendarDays },
  { label: "Tasks", path: ROUTES.tasks, icon: SquareCheck },
  { label: "Help", path: ROUTES.help, icon: HelpCircle },
];

const PRIMARY_NAV = [
  { label: "Home", path: ROUTES.home, icon: House },
  { label: "Communities", path: ROUTES.communities, icon: UsersRound },
  { label: "Create", action: "create", icon: Plus },
  { label: "Messages", path: ROUTES.messages, icon: MessageCircle },
  { label: "More", action: "more", icon: Menu },
];

/** Dock into full-height messenger/community shells; stay fixed over scrolling feed pages. */
export default function MobileNav({ docked = false }) {
  const unread = useMessageUnread().data?.unread || 0;
  const [moreOpen, setMoreOpen] = useState(false);
  const root = useRef(null);
  const moreButton = useRef(null);
  const { pathname } = useLocation();
  const isMoreDestination = MORE_NAV.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));

  useEffect(() => { setMoreOpen(false); }, [pathname]);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") { setMoreOpen(false); moreButton.current?.focus(); }
    };
    const onOutside = (event) => { if (!root.current?.contains(event.target)) setMoreOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [moreOpen]);

  return (
    <nav
      ref={root}
      aria-label="Primary mobile navigation"
      className={cn(
        "z-50 w-full shrink-0 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(11,16,32,0.06)] backdrop-blur-xl lg:hidden",
        docked ? "relative" : "fixed inset-x-0 bottom-0",
      )}
    >
      {moreOpen && (
        <>
          <div id="mobile-more-menu" className="absolute inset-x-2 bottom-full z-10 mb-2 max-h-[min(60dvh,440px)] overflow-y-auto rounded-2xl border border-line bg-surface p-3 text-ink shadow-2xl sm:inset-x-auto sm:right-3 sm:w-[360px]">
            <div className="mb-2 flex items-center justify-between px-2 py-1">
              <h2 className="text-base font-bold">Explore Aevora</h2>
              <button type="button" className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-raised" onClick={() => setMoreOpen(false)} aria-label="Close menu"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {MORE_NAV.map(({ label, path, icon: Icon }) => (
                <NavLink key={path} to={path} onClick={() => setMoreOpen(false)} className={({ isActive }) => cn("flex min-h-12 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors", isActive ? "bg-brand-soft text-brand-ink" : "text-ink hover:bg-raised")}>
                  <Icon size={19} className="shrink-0" aria-hidden="true" /><span className="min-w-0 truncate">{label}</span>
                </NavLink>
              ))}
            </div>
            <div className="mt-3 border-t border-line px-2 pt-3">
              <p className="mb-2 text-xs font-semibold text-ink-soft">Appearance</p>
              <ThemeToggle variant="segmented" />
            </div>
          </div>
        </>
      )}
      <ul className="relative z-10 mx-auto grid h-15 max-w-lg grid-cols-5 items-center">
        {PRIMARY_NAV.map(({ label, path, action, icon: Icon }) => (
          <li key={label} className="min-w-0">
            {action === "create" ? (
              <Link to={ROUTES.home} state={{ focusComposer: true }} aria-label="Create a post" className="mx-auto grid size-11 place-items-center rounded-2xl bg-brand text-on-brand transition-colors hover:bg-brand-hover">
                <Plus className="size-6" aria-hidden="true" />
              </Link>
            ) : action === "more" ? (
              <button ref={moreButton} type="button" aria-expanded={moreOpen} aria-controls="mobile-more-menu" onClick={() => setMoreOpen((v) => !v)} className={cn("flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold", moreOpen || isMoreDestination ? "text-brand-ink" : "text-ink-soft")}>
                <Icon size={22} aria-hidden="true" />More
              </button>
            ) : (
              <NavLink to={path} end={path === ROUTES.home} className={({ isActive }) => cn("flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors", isActive ? "text-brand-ink" : "text-ink-soft")}>
                <span className="relative">
                  <Icon size={22} aria-hidden="true" />
                  {path === ROUTES.messages && unread > 0 && <span className="absolute -right-3 -top-2 rounded-full bg-brand px-1 text-[9px] font-bold text-on-brand" aria-label={`${unread} unread messages`}>{unread > 99 ? "99+" : unread}</span>}
                </span>
                <span className="truncate text-[10px] min-[370px]:text-[11px]">{label}</span>
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
