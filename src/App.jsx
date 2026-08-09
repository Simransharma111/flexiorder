import { lazy, Suspense } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import "./App.css";

//back button handler
import BackButtonHandler from "./components/BackButtonHandler";
import AppErrorBoundary from "./components/AppErrorBoundary";
import HomeRedirect from "./components/HomeRedirect";

// Protected Route
import ProtectedRoute from "./components/ProtectedRoute"; 
import { OWNER_ROLES, RESTAURANT_ROLES } from "./constants/roles";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const GuestMenuPage = lazy(() => import("./pages/GuestMenuPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const OwnerHotelSettings = lazy(() => import("./pages/OwnerHotelSettings"));
const HotelSetupPage = lazy(() => import("./pages/HotelSetupPage"));
const KitchenDashboard = lazy(() => import("./pages/KitchenDashboard"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const QRInventoryPage = lazy(() => import("./pages/QRInventoryPage"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const StaffWorkspace = lazy(() => import("./pages/StaffWorkspace"));
const StaffMenuPage = lazy(() => import("./pages/StaffMenuPage"));
const PublicOrderDisplay = lazy(() => import("./pages/PublicOrderDisplay"));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7] px-4 text-center text-sm font-semibold text-[#55625d]">
    Loading FlexiOrder…
  </div>
);

export default function App() {
  return (
    <>
      <BackButtonHandler />

      <AppErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
        <Routes>

        {/* ================= PUBLIC ================= */}

        {/* Directly open Auth Page */}
       <Route
  path="/"
  element={<HomeRedirect><LandingPage /></HomeRedirect>}
/>

        <Route
          path="/login"
          element={<HomeRedirect><AuthPage mode="login" /></HomeRedirect>}
        />

        <Route
          path="/register"
          element={<HomeRedirect><AuthPage mode="register" /></HomeRedirect>}
        />

        {/* Guest QR Menu */}
        <Route
          path="/qr/:qrId"
          element={<GuestMenuPage />}
        />

        {/* Guest Cart */}
        <Route
          path="/cart/:qrId"
          element={<CartPage />}
        />

        {/* QR Inventory */}
        <Route
          path="/qr"
          element={
            <ProtectedRoute allowedRoles={OWNER_ROLES}>
              <QRInventoryPage />
            </ProtectedRoute>
          }
        />

        {/* ================= SUPER ADMIN ================= */}

        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ================= HOTEL SETUP ================= */}

        <Route
          path="/setup-hotel"
          element={
            <ProtectedRoute
              allowedRoles={OWNER_ROLES}
            >
              <HotelSetupPage />
            </ProtectedRoute>
          }
        />

        {/* ================= OWNER ================= */}

        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={OWNER_ROLES}
            >
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/order"
          element={
            <ProtectedRoute
              allowedRoles={RESTAURANT_ROLES}
            >
              <StaffWorkspace />
            </ProtectedRoute>
          }
        />

        {/* ================= KITCHEN ================= */}

        <Route
          path="/kitchen"
          element={
            <ProtectedRoute
              allowedRoles={RESTAURANT_ROLES}
            >
              <KitchenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/menu"
          element={
            <ProtectedRoute allowedRoles={RESTAURANT_ROLES}>
              <StaffMenuPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/display"
          element={
            <ProtectedRoute allowedRoles={RESTAURANT_ROLES}>
              <PublicOrderDisplay />
            </ProtectedRoute>
          }
        />

        {/* ================= ORDER TRACKING ================= */}

        <Route
          path="/track-order/:orderId"
          element={<TrackOrderPage />}
        />
        <Route
          path="/owner/hotel/settings"
          element={
            <ProtectedRoute
              allowedRoles={OWNER_ROLES}
            >
              <OwnerHotelSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute
              allowedRoles={RESTAURANT_ROLES}
            >
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
        </Suspense>
      </AppErrorBoundary>
    </>
  );
}
