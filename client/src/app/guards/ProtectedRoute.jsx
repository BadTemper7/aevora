import { Navigate, Outlet, useLocation } from "react-router-dom";

import LoadingScreen from "../../components/feedback/LoadingScreen";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { ROUTES } from "../config/routes";

/** Only lets signed-in people through. The server decides: no valid session cookie, no entry. */
export default function ProtectedRoute() {
  const { isAuthenticated, isPending, user } = useAuth();
  const location = useLocation();

  if (isPending) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  if (!user?.username) return <Navigate to={ROUTES.completeRegistration} replace />;
  return <Outlet />;
}
