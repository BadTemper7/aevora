import { ArrowLeft, House } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import Logo from "../components/common/Logo";
import ThemeToggle from "../components/common/ThemeToggle";
import { useRealtime } from "../features/social/hooks/useRealtime";
import { ROUTES } from "../app/config/routes";
import NotificationBell from "../features/social/notifications/NotificationBell";
import MobileNav from "./main/MobileNav";

/** Full-height messenger shell with the same discoverable navigation as the feed. */
export default function MessageLayout() {
  useRealtime();
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-canvas text-ink">
      <a href="#messages-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3">Skip to messages</a>
      <header className="z-30 shrink-0 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 sm:h-16">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link to={ROUTES.home} aria-label="Back to home" className="hidden size-10 shrink-0 place-items-center rounded-xl border border-line text-ink-soft hover:bg-raised hover:text-ink sm:grid"><ArrowLeft size={20}/></Link>
            <Logo size="sm" />
            <span className="truncate border-l border-line pl-2.5 text-sm font-bold text-ink sm:pl-3">Messages</span>
          </div>
          <nav className="flex items-center gap-1" aria-label="Messenger utilities">
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <Link to={ROUTES.home} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-raised hover:text-ink"><House size={18}/>Home</Link>
              <ThemeToggle />
            </div>
            <NotificationBell />
          </nav>
        </div>
      </header>
      <main id="messages-main" className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1 flex-col overflow-hidden px-0 py-0 sm:p-3 lg:p-5"><Outlet /></main>
      <MobileNav docked />
    </div>
  );
}
