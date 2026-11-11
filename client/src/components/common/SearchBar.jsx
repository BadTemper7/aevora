import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "../../app/config/routes";

const isTyping = (el) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/** Global search field. Press "/" anywhere to focus it. */
export default function SearchBar() {
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || isTyping(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const onSubmit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) navigate(`${ROUTES.explore}?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="flex h-11 items-center gap-3 rounded-xl border border-line bg-surface px-3.5 transition-colors focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/25 hover:border-line-strong"
    >
      <Search className="size-[18px] shrink-0 text-ink-faint" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search Aevora"
        placeholder="Search people by username"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
      />
      <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-xs text-ink-faint lg:block">
        /
      </kbd>
    </form>
  );
}
