import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

import api from "./api/axios";
import BackButtonHandler from "./components/BackButtonHandler";
import ProtectedRoute from "./components/ProtectedRoute";
import { initFCM } from "./utils/fcmPush";

import GuestMenuPage from "./pages/GuestMenuPage";
import KitchenDashboard from "./pages/KitchenDashboard";
import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import TrackOrderPage from "./pages/TrackOrderPage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Homepage from "./pages/Homepage";
import QRInventoryPage from "./pages/QRInventoryPage";
import HotelSetupPage from "./pages/HotelSetupPage";

export default function App() {
  useEffect(() => {
    try {
      initFCM(api);
    } catch (err) {
      console.log("FCM INIT ERROR:", err);
    }
  }, []);

  return (
    <>
      <BackButtonHandler />

      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/qr/:qrId" element={<GuestMenuPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/qr" element={<QRInventoryPage />} />

        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/setup-hotel"
          element={
            <ProtectedRoute allowedRoles={["owner", "superadmin"]}>
              <HotelSetupPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute allowedRoles={["owner", "superadmin"]}>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/kitchen"
          element={
            <ProtectedRoute allowedRoles={["staff", "owner", "superadmin"]}>
              <KitchenDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/track-order/:orderId" element={<TrackOrderPage />} />
      </Routes>
    </>
  );
}