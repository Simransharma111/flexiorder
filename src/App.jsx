import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

// Public
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import GuestMenuPage from "./pages/GuestMenuPage";
import CartPage from "./pages/CartPage";
import TrackOrderPage from "./pages/TrackOrderPage";

// Owner
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerHotelSettings from "./pages/OwnerHotelSettings";
import HotelSetupPage from "./pages/HotelSetupPage";

// // Staff
// import KitchenDashboard from "./pages/KitchenDashboard";

// Super Admin
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

// Shared
import QRInventoryPage from "./pages/QRInventoryPage";
import ChangePassword from "./pages/ChangePassword";
//back button handler
import BackButtonHandler from "./components/BackButtonHandler";

// Protected Route
import ProtectedRoute from "./components/ProtectedRoute";
import { isMobileApp } from "./utils/platform";
import Orders from "./components/ownerdashboard/Orders";
import StaffOrder from "./pages/StaffOrder";
import Splash from "./pages/Splash";

import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

export default function App() {

  const mobile = isMobileApp();

const [showSplash,setShowSplash] = useState(mobile);


useEffect(()=>{

if(!mobile) return;


const timer=setTimeout(()=>{

setShowSplash(false);

},2000);


return ()=>clearTimeout(timer);


},[mobile]);



if(showSplash){
  return <Splash />;
}
  return (
    <>
      <BackButtonHandler />

      <Routes>

        {/* ================= PUBLIC ================= */}

        {/* Directly open Auth Page */}
      
{
mobile ? (

<Route
path="/"
element={
<AuthPage mode="login"/>
}
/>

)

:

(

<Route
path="/"
element={
<LandingPage />
}
/>

)

}
        <Route
          path="/login"
          element={<AuthPage mode="login" />}
        />

        <Route
          path="/register"
          element={<AuthPage mode="register" />}
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
        <Route
          path="/owner/order"
          element={<StaffOrder />}
        />

        {/* ================= KITCHEN ================= */}

        {/* <Route
          path="/kitchen"
          element={
            <ProtectedRoute
              allowedRoles={[
                "staff",
                "owner",
                "superadmin",
              ]}
            >
              <Orders />
            </ProtectedRoute>
          }
        /> */}

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
          element={<ChangePassword />}
        />
        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />
        <Route
          path="/reset-password/:token"
          element={<ResetPasswordPage />}
        />

      </Routes>
    </>
  );
}