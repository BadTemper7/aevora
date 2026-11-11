import { Link, Outlet } from "react-router-dom";

import { ROUTES } from "../app/config/routes";
import Logo from "../components/common/Logo";
import ThemeToggle from "../components/common/ThemeToggle";
import BrandPanel from "../features/auth/components/BrandPanel";

const FOOTER_LINKS = [
  { label: "Terms", to: ROUTES.terms },
  { label: "Privacy", to: ROUTES.privacy },
  { label: "Help", to: ROUTES.help },
];

/**
 * Shell for login and register.
 *   lg and up  brand panel on the left, form on the right
 *   below lg   form only, with the logo on top
 */
export default function AuthLayout() {
  return (
    <div className="grid min-h-dvh bg-canvas text-ink lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.2fr_1fr]">
      <BrandPanel />

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Logo size="md" className="lg:invisible" />
          <ThemeToggle />
        </header>

        <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-6 py-8 sm:px-0">
          <Outlet />
        </main>

        <footer className="flex items-center justify-between gap-4 px-6 py-5 text-xs text-ink-faint sm:px-10">
          <p>© 2026 Aevora</p>
          <nav aria-label="Footer" className="flex gap-5">
            {FOOTER_LINKS.map(({ label, to }) => (
              <Link key={label} to={to} className="hover:text-ink hover:underline">
                {label}
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}
