import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useClickOutside } from "../../hooks/useClickOutside";
import { cn } from "../../utils/cn";

/**
 * Small popover menu.
 *
 *   <Dropdown trigger={({ toggle, props }) => <button onClick={toggle} {...props}>…</button>}>
 *     <DropdownItem icon={Settings} to="/settings">Settings</DropdownItem>
 *   </Dropdown>
 *
 * Clicking an item closes the menu. Wrap content in [data-keep-open] to keep it open.
 */
export default function Dropdown({ trigger, children, align = "end", className }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(rootRef, close);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && close();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return (
    <div ref={rootRef} className="relative">
      {trigger({
        open,
        toggle: () => setOpen((current) => !current),
        props: { "aria-haspopup": "menu", "aria-expanded": open },
      })}

      {open && (
        <div
          role="menu"
          onClick={(event) => {
            if (!event.target.closest("[data-keep-open]")) close();
          }}
          className={cn(
            "absolute z-50 mt-2 min-w-60 rounded-xl border border-line bg-surface p-1.5 shadow-pop",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const itemClass = (danger) =>
  cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
    danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-raised",
  );

export function DropdownItem({ icon: Icon, to, danger = false, children, ...props }) {
  const content = (
    <>
      {Icon && <Icon className="size-[18px] shrink-0" aria-hidden="true" />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} role="menuitem" className={itemClass(danger)} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" className={itemClass(danger)} {...props}>
      {content}
    </button>
  );
}

export function DropdownDivider() {
  return <div role="separator" className="my-1.5 h-px bg-line" />;
}
