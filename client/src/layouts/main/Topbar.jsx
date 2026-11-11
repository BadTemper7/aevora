import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "../../app/config/routes";
import Logo from "../../components/common/Logo";
import SearchBar from "../../components/common/SearchBar";
import ThemeToggle from "../../components/common/ThemeToggle";
import { cn } from "../../utils/cn";
import { SHELL } from "./shell";
import UserMenu from "./UserMenu";
import NotificationBell from "../../features/social/notifications/NotificationBell";

const iconButton =
  "grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-raised hover:text-ink";

export default function Topbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
      <div className={cn(SHELL, "flex h-16 items-center gap-8")}>
        <div className="shrink-0 text-ink lg:w-[240px]">
          <Logo size="md" wordmarkClassName="hidden sm:block" />
        </div>

        <div className="hidden max-w-[640px] flex-1 md:block">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Link
            to={ROUTES.explore}
            aria-label="Search"
            className={cn(iconButton, "md:hidden")}
          >
            <Search className="size-5" aria-hidden="true" />
          </Link>

          <Link
            to={ROUTES.home}
            state={{ focusComposer: true }}
            className="mr-1 hidden h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover md:inline-flex"
          >
            <Plus className="size-[18px]" aria-hidden="true" />
            Create
          </Link>

          <NotificationBell />

          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
