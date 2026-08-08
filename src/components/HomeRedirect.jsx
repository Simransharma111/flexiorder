import { Navigate } from "react-router-dom";
import { getHomePathForRole } from "../constants/roles";

export default function HomeRedirect() {
  const token = localStorage.getItem("token");
  const role = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null")?.role || null;
    } catch {
      return null;
    }
  })();

  // NOT LOGGED IN
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={getHomePathForRole(role)} replace />;
}
