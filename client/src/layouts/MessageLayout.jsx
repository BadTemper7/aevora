import { ArrowLeft, House } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import Logo from "../components/common/Logo";
import ThemeToggle from "../components/common/ThemeToggle";
import { useRealtime } from "../features/social/hooks/useRealtime";
import { ROUTES } from "../app/config/routes";
import NotificationBell from "../features/social/notifications/NotificationBell";

/** Dedicated, full-width messenger shell. The social feed columns never wrap messages. */
export default function MessageLayout() {
  useRealtime();
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-canvas text-ink">
      <a href="#messages-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3">Skip to messages</a>
      <header className="z-30 shrink-0 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link to={ROUTES.home} aria-label="Back to home" className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-ink-soft hover:bg-raised hover:text-ink"><ArrowLeft size={20}/></Link>
            <Link to={ROUTES.home} aria-label="Aevora home" className="hidden sm:block"><Logo size="sm"/></Link>
            <span className="truncate border-l-0 text-sm font-bold text-ink sm:border-l sm:border-line sm:pl-3">Messages</span>
          </div>
          <nav className="flex items-center gap-2" aria-label="Messenger navigation">
            <Link to={ROUTES.home} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-raised hover:text-ink"><House size={18}/><span className="hidden sm:inline">Home</span></Link>
            <NotificationBell />
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main id="messages-main" className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-4 lg:p-5"><Outlet /></main>
    </div>
  );
}
