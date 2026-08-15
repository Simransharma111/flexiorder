import { Navigate, useLocation } from "react-router-dom";
import { getPostLoginPath } from "../constants/roles";
import { useAuth } from "../context/AuthContext";

export default function HomeRedirect({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="ops-loading">Restoring your workspace…</div>;
  if (user) {
    // Honor the originally requested protected page (e.g. /kitchen) that
    // ProtectedRoute preserved in location.state before bouncing to /login.
    return <Navigate to={getPostLoginPath(user.role, location.state?.from)} replace />;
  }
  return children || <Navigate to="/login" replace />;
}
