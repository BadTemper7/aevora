import { Link } from "react-router-dom";

import { ROUTES } from "../../app/config/routes";
import SuggestedPeople from "../../features/social/discover/components/SuggestedPeople";
import TrendingTopics from "../../features/social/discover/components/TrendingTopics";

const FOOTER_LINKS = [
  { label: "Privacy", to: ROUTES.privacy },
  { label: "Terms", to: ROUTES.terms },
  { label: "Help", to: ROUTES.help },
];

export default function RightRail() {
  return (
    <aside aria-label="Discover" className="sticky top-24 space-y-7 self-start">
      <TrendingTopics />
      <div className="border-t border-line pt-7"><SuggestedPeople /></div>

      <footer className="border-t border-line px-1 pt-5 text-xs text-ink-faint">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1">
          {FOOTER_LINKS.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="hover:text-ink hover:underline"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-3">© 2026 Aevora</p>
      </footer>
    </aside>
  );
}
