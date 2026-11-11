import { useEffect, useRef, useState } from "react";
import {
  Compass, House, Menu, MessageCircle, UsersRound, X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { ROUTES } from "../../app/config/routes";
import { MORE_NAV } from "./MobileNav";

const MAIN_DESTINATIONS = [
  { label: "Home", path: ROUTES.home, icon: House },
  { label: "Communities", path: ROUTES.communities, icon: UsersRound },
  { label: "Messages", path: ROUTES.messages, icon: MessageCircle },
  { label: "Explore", path: ROUTES.explore, icon: Compass },
];

// Messenger has no bottom tab bar. Keep every destination discoverable from
// this compact header menu without covering the chat composer.
export default function MessageNavigationMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const navigationLink = ({ label, path, icon: Icon }) => (
    <NavLink key={path} to={path} end={path === ROUTES.home} onClick={() => setOpen(false)}
      className={({ isActive }) => `flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "bg-brand-soft text-brand-ink" : "text-ink hover:bg-raised"}`}>
      <Icon size={18} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{label}</span>
    </NavLink>
  );

  return <div className="relative shrink-0 lg:hidden" ref={root}>
    <button ref={trigger} type="button" aria-label={open ? "Close navigation" : "Open navigation"}
      title="Navigate Aevora" aria-expanded={open} aria-controls="message-navigation-menu"
      className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-raised hover:text-ink"
      onClick={() => setOpen((current) => !current)}>
      {open ? <X size={21} /> : <Menu size={21} />}
    </button>
    {open && <nav id="message-navigation-menu" aria-label="Aevora pages"
      className="absolute right-0 top-full z-[100] mt-2 max-h-[min(72dvh,560px)] w-[min(326px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-line bg-surface p-3 text-ink shadow-2xl">
      <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-ink-soft">Navigate</p>
      <div className="grid grid-cols-2 gap-1">{MAIN_DESTINATIONS.map(navigationLink)}</div>
      <p className="mb-2 mt-3 border-t border-line px-2 pt-3 text-xs font-bold uppercase tracking-wide text-ink-soft">Other pages</p>
      <div className="grid grid-cols-2 gap-1">{MORE_NAV.filter((item) => item.path !== ROUTES.explore).map(navigationLink)}</div>
    </nav>}
  </div>;
}
