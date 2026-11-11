import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "../app/config/routes";
import EmptyState from "../components/common/EmptyState";
import Logo from "../components/common/Logo";
import Button from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-ink">
      <Logo size="md" className="mb-8 text-ink" />
      <EmptyState
        icon={Compass}
        title="We can't find that page"
        description="The link may be broken, or the page may have moved."
        action={
          <Link to={ROUTES.home}>
            <Button>Back to home</Button>
          </Link>
        }
      />
    </div>
  );
}
