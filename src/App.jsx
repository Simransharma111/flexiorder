import { Routes, Route } from "react-router-dom";
import "./App.css";

import BackButtonHandler from "./components/BackButtonHandler";
import ProtectedRoute from "./components/ProtectedRoute";

import GuestMenuPage from "./pages/GuestMenuPage";
import KitchenDashboard from "./pages/KitchenDashboard";
import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import TrackOrderPage from "./pages/TrackOrderPage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import QRInventoryPage from "./pages/QRInventoryPage";
import HotelSetupPage from "./pages/HotelSetupPage";
import CartPage from "./pages/CartPage";
import OwnerHotelSettings from "./pages/OwnerHotelSettings";

import ChangePassword from "./pages/ChangePassword";

export default function App() {
  return (
    <>
      <BackButtonHandler />

      <Routes>

        {/* ================= PUBLIC ================= */}

        {/* Directly open Login Page */}
        <Route
          path="/"
          element={<LoginPage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
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
          element={<QRInventoryPage />}
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
              allowedRoles={[
                "owner",
                "superadmin",
              ]}
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
              allowedRoles={[
                "owner",
                "superadmin",
              ]}
            >
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        {/* ================= KITCHEN ================= */}

        <Route
          path="/kitchen"
          element={
            <ProtectedRoute
              allowedRoles={[
                "staff",
                "owner",
                "superadmin",
              ]}
            >
              <KitchenDashboard />
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
element={<OwnerHotelSettings />}
/>
<Route
path="/change-password"
element={<ChangePassword/>}
/>
      </Routes>
    </>
  );
}