import { Navigate } from "react-router-dom";
import { getHomePathForRole } from "../constants/roles";
import { useAuth } from "../context/AuthContext";

export default function HomeRedirect({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="ops-loading">Restoring your workspace…</div>;
  if (user) return <Navigate to={getHomePathForRole(user.role)} replace />;
  return children || <Navigate to="/login" replace />;
}
