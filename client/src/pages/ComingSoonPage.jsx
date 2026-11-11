import { Hammer } from "lucide-react";
import { Link, useMatches } from "react-router-dom";

import { ROUTES } from "../app/config/routes";
import EmptyState from "../components/common/EmptyState";
import Logo from "../components/common/Logo";
import Button from "../components/ui/Button";
import { cn } from "../utils/cn";

/**
 * Stand-in for sections that are in the navigation but not built yet.
 * The title comes from the route's `handle.title` (see app/router.jsx).
 */
export default function ComingSoonPage() {
  const matches = useMatches();
  const { title = "This page", standalone = false } =
    matches.at(-1)?.handle ?? {};

  return (
    <div
      className={cn(
        standalone &&
          "flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-ink",
      )}
    >
      {standalone && <Logo size="md" className="mb-8 text-ink" />}

      <EmptyState
        icon={Hammer}
        title={`${title} is on its way`}
        description="We're still building this part of Aevora. Check back soon."
        action={
          <Link to={ROUTES.home}>
            <Button variant="secondary">Back to home</Button>
          </Link>
        }
        className={cn(
          !standalone && "rounded-2xl border border-line bg-surface",
        )}
      />
    </div>
  );
}
