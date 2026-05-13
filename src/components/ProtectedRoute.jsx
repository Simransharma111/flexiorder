import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  allowedRoles,
}) {

  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex justify-center items-center">
        Loading...
      </div>
    );
  }

  // NOT LOGGED IN
  if (!user) {
    return <Navigate to="/login" />;
  }

  // ROLE CHECK
  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/" />;
  }

  return children;
}