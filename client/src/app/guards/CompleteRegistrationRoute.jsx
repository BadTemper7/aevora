import { Navigate, Outlet } from "react-router-dom";
import LoadingScreen from "../../components/feedback/LoadingScreen";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { ROUTES } from "../config/routes";

/** A Google account may have a session before its application username is chosen. */
export default function CompleteRegistrationRoute() {
  const { isAuthenticated, isPending, user } = useAuth();
  if (isPending) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to={ROUTES.login} replace />;
  if (user?.username) return <Navigate to={ROUTES.home} replace />;
  return <Outlet />;
}
