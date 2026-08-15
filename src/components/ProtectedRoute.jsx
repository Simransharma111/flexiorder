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
      <div className="flex min-h-screen items-center justify-center bg-canvas" role="status" aria-label="Loading">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-hairline border-t-brand" aria-hidden="true" />
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