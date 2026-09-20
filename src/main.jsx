import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ConnectivityProvider } from "./context/ConnectivityContext";
import { SyncProvider } from "./context/SyncContext";
import App from "./App";
import { Capacitor } from '@capacitor/core';
import "./index.css";

import CartProvider from "./context/CartContext";

if (import.meta.env.PROD && !Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

// Native assets are installed atomically with the APK. A previous web cache
// must not keep an older JavaScript bundle alive after an app update.
if (Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations =>
    Promise.all(registrations.map(registration => registration.unregister()))
  ).catch(error => console.warn('Could not remove old native web cache registration', error));
}

ReactDOM.createRoot(document.getElementById("root")).render(
<React.StrictMode>
  <BrowserRouter>
    <ConnectivityProvider>
      <AuthProvider>
        <SyncProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </SyncProvider>
      </AuthProvider>
    </ConnectivityProvider>
  </BrowserRouter>
</React.StrictMode>
);
