import { ArrowLeft, House, UsersRound } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import Logo from "../components/common/Logo";
import ThemeToggle from "../components/common/ThemeToggle";
import { useRealtime } from "../features/social/hooks/useRealtime";
import { ROUTES } from "../app/config/routes";
import NotificationBell from "../features/social/notifications/NotificationBell";
import MessageNavigationMenu from "./main/MessageNavigationMenu";

/** Full-height messenger shell. Mobile navigation lives in the header, not at the bottom of a chat. */
export default function MessageLayout() {
  useRealtime();
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-canvas text-ink">
      <a href="#messages-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3">Skip to messages</a>
      <header className="relative z-50 shrink-0 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-2 sm:h-16">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link to={ROUTES.home} aria-label="Back to home" className="hidden size-10 shrink-0 place-items-center rounded-xl border border-line text-ink-soft hover:bg-raised hover:text-ink sm:grid"><ArrowLeft size={20}/></Link>
            <Logo size="sm" wordmarkClassName="max-[360px]:hidden" />
            <span className="truncate border-l border-line pl-2 text-sm font-bold text-ink sm:pl-3">Messages</span>
          </div>
          <nav className="flex shrink-0 items-center gap-0.5" aria-label="Messenger utilities">
            <div className="hidden items-center gap-1 lg:flex">
              <Link to={ROUTES.home} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-raised hover:text-ink"><House size={18}/>Home</Link>
              <Link to={ROUTES.communities} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-raised hover:text-ink"><UsersRound size={18}/>Communities</Link>
            </div>
            <ThemeToggle />
            <div className="hidden sm:block"><NotificationBell /></div>
            <MessageNavigationMenu />
          </nav>
        </div>
      </header>
      <main id="messages-main" className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1 flex-col overflow-hidden px-0 py-0 sm:p-3 lg:p-5"><Outlet /></main>
    </div>
  );
}
