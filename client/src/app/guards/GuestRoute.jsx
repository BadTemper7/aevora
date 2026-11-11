import { Navigate, Outlet, useLocation } from "react-router-dom";

import LoadingScreen from "../../components/feedback/LoadingScreen";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { ROUTES } from "../config/routes";

/** Login and register are for signed-out people. Signed-in people go back to the app. */
export default function GuestRoute() {
  const { isAuthenticated, isPending, user } = useAuth();
  const location = useLocation();

  if (isPending) return <LoadingScreen />;
  if (isAuthenticated && !user?.username) return <Navigate to={ROUTES.completeRegistration} replace />;
  if (isAuthenticated) {
    const destination = location.state?.from?.pathname ?? ROUTES.home;
    return <Navigate to={destination} replace />;
  }
  return <Outlet />;
}
