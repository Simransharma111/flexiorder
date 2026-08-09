import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ConnectivityProvider } from "./context/ConnectivityContext";
import { SyncProvider } from "./context/SyncContext";
import App from "./App";
import "./index.css";

import CartProvider from "./context/CartContext";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
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
