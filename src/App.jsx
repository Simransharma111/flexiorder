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
import Homepage from "./pages/Homepage";
import QRInventoryPage from "./pages/QRInventoryPage";
import HotelSetupPage from "./pages/HotelSetupPage";
import HomeRedirect from "./components/HomeRedirect";

export default function App() {
  return (
    <>
      <BackButtonHandler />

      <Routes>

        {/* ================= PUBLIC ================= */}

        <Route
          path="/"
          element={<HomeRedirect />}
        />

        <Route
          path="/homepage"
          element={<Homepage />}
        />

        {/* Guest scans QR */}
        <Route
          path="/qr/:qrId"
          element={<GuestMenuPage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/qr"
          element={<QRInventoryPage />}
        />

        {/* ================= SUPER ADMIN ================= */}

        <Route
          path="/superadmin"
          element={
            <ProtectedRoute
              allowedRoles={["superadmin"]}
            >
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

      </Routes>
    </>
  );
}