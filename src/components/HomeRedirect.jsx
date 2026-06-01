import { Navigate } from "react-router-dom";

export default function HomeRedirect() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // NOT LOGGED IN
  if (!token) {
    return <Navigate to="/homepage" replace />;
  }

  // ROLE BASED REDIRECT
  if (role === "owner") {
    return <Navigate to="/owner/dashboard" replace />;
  }

  if (role === "staff") {
    return <Navigate to="/kitchen" replace />;
  }

  if (role === "superadmin") {
    return <Navigate to="/superadmin" replace />;
  }

  // fallback
  return <Navigate to="/homepage" replace />;
}