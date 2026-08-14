import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { isRoleAllowed } from "../utils/access";

export default function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex justify-center items-center">
        Loading...
      </div>
    );
  }

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  // =====================================================
  // ROLE CHECK
  // =====================================================

  if (
    allowedRoles &&
    !isRoleAllowed(
      user.role,
      allowedRoles
    )
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  // =====================================================
  // OWNER HOTEL SETUP CHECK
  // =====================================================

  const isOwner =
    user.role === "owner";

  const isHotelSetupPage =
    location.pathname === "/setup-hotel";

  const isOwnerDashboard =
    location.pathname.startsWith(
      "/owner"
    ) ||
    location.pathname === "/qr";

  /*
   * Owner has registered but has not
   * created/linked a hotel yet.
   *
   * Force them to hotel setup.
   */

  if (
    isOwner &&
    !user.hotelId &&
    !isHotelSetupPage &&
    isOwnerDashboard
  ) {
    return (
      <Navigate
        to="/setup-hotel"
        replace
      />
    );
  }

  // =====================================================
  // OWNER ALREADY COMPLETED SETUP
  // =====================================================

  /*
   * If owner already has a hotel and manually
   * opens /setup-hotel, send them to dashboard.
   *
   * This prevents them from repeatedly seeing
   * the initial setup page.
   */

  if (
    isOwner &&
    user.hotelId &&
    isHotelSetupPage
  ) {
    return (
      <Navigate
        to="/owner/dashboard"
        replace
      />
    );
  }

  // =====================================================
  // ALLOW
  // =====================================================

  return children;
}