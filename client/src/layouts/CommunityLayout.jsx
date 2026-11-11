import { ArrowLeft, Compass, House, UsersRound } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import Logo from "../components/common/Logo";
import ThemeToggle from "../components/common/ThemeToggle";
import VoiceDock from "../features/communities/components/VoiceDock";
import { VoiceProvider } from "../features/communities/hooks/useVoiceSession";
import { useRealtime } from "../features/social/hooks/useRealtime";

const links = [
  { to: "/communities", label: "Discover", icon: Compass, end: true },
  { to: "/friends", label: "Friends", icon: UsersRound },
  { to: "/", label: "Home", icon: House, end: true },
];

export default function CommunityLayout() {
  useRealtime();
  return (
    <VoiceProvider>
      <div className="relative isolate flex h-dvh min-h-0 flex-col overflow-hidden bg-canvas text-ink">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-44 left-1/2 -z-10 h-80 w-[900px] max-w-full -translate-x-1/2 rounded-full bg-brand/15 blur-3xl"
        />
        <header className="z-30 shrink-0 border-b border-line bg-surface/70 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between gap-2 px-3 sm:px-5">
            <div className="flex items-center gap-2">
              <Link
                to="/"
                aria-label="Back to AEVORA Home"
                className="grid size-9 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:bg-raised hover:text-ink"
              >
                <ArrowLeft size={18} />
              </Link>
              <Link to="/" aria-label="AEVORA Home">
                <Logo size="sm" />
              </Link>
              <span className="ml-1 hidden rounded-full bg-brand-soft px-3 py-1 text-xs font-bold tracking-wide text-brand-ink sm:block">
                Communities
              </span>
            </div>
            <nav
              aria-label="Community navigation"
              className="flex items-center gap-1"
            >
              {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={label}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-soft text-brand-ink" : "text-ink-soft hover:bg-raised hover:text-ink"}`
                  }
                >
                  <Icon size={17} />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 overflow-hidden">
          <Outlet />
        </main>
        <VoiceDock />
      </div>
    </VoiceProvider>
  );
}
