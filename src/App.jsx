import { Routes, Route } from "react-router-dom";

import GuestMenuPage from "./pages/GuestMenuPage";
import KitchenDashboard from "./pages/KitchenDashboard";
import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import TrackOrderPage from "./pages/TrackOrderPage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Homepage from "./pages/Homepage";
export default function App() {
  return (
    <>

      <Routes>
         <Route
          path="/"
          element={<Homepage />}
        />
        <Route path="/menu/table/:tableId" element={<GuestMenuPage />} />
        <Route
          path="/login"
          element={<LoginPage />}
        />
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute
              allowedRoles={[
                "superadmin",
              ]}
            >
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="/track-order/:orderId"
          element={<TrackOrderPage />}
        />
      </Routes>

    </>
  );
}