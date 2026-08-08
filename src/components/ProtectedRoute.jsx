import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { isRoleAllowed } from "../utils/access";

export default function ProtectedRoute({
  children,
  allowedRoles,
}) {

  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex justify-center items-center">
        Loading...
      </div>
    );
  }

  // NOT LOGGED IN
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // ROLE CHECK
  if (
    allowedRoles &&
    !isRoleAllowed(user.role, allowedRoles)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}
