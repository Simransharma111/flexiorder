import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import App from "./App";
import "./index.css";

import CartProvider from "./context/CartContext";
// import { registerSW } from "virtual:pwa-register";

// registerSW({
//   immediate: true,
// });

// if ("serviceWorker" in navigator) {
//   window.addEventListener("load", async () => {
//     await navigator.serviceWorker.register(
//       "/sw.js"
//     );

//     console.log(
//       "Custom Service Worker Registered"
//     );
//   });
// }

ReactDOM.createRoot(document.getElementById("root")).render(
<React.StrictMode>
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
</React.StrictMode>
);