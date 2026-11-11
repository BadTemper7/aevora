import { Outlet } from "react-router-dom";

import { cn } from "../utils/cn";
import { useRealtime } from "../features/social/hooks/useRealtime";
import MobileNav from "./main/MobileNav";
import RightRail from "./main/RightRail";
import { SHELL } from "./main/shell";
import SidebarNav from "./main/SidebarNav";
import Topbar from "./main/Topbar";

/**
 * App shell for signed-in pages.
 *
 *   < lg    content + bottom tab bar
 *   lg      sidebar | content
 *   xl      sidebar | content | right rail
 */
export default function MainLayout() {
  useRealtime();
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        Skip to content
      </a>

      <Topbar />

      <div
        className={cn(
          SHELL,
          "grid grid-cols-1 gap-8 pt-24",
          "lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,640px)_320px]",
        )}
      >
        <div className="hidden lg:block">
          <SidebarNav />
        </div>

        <main id="main" className="min-w-0 pb-28 lg:pb-12">
          <Outlet />
        </main>

        <div className="hidden xl:block">
          <RightRail />
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
