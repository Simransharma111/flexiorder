import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";

import { getHomePathForRole } from "../constants/roles";
import { readStoredSession } from "../utils/session";

export default function BackButtonHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  const pathnameRef = useRef(location.pathname);

  // Keep the latest route available to the Capacitor listener
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let listener = null;

    const setupListener = async () => {
      const result = await CapacitorApp.addListener(
        "backButton",
        () => {
          const pathname = pathnameRef.current;
          const { user } = readStoredSession();

          // ==========================================
          // AUTHENTICATED USER
          // ==========================================

          if (user) {
            const home = getHomePathForRole(user.role);

            // Already on role home -> exit app
            if (pathname === home) {
              CapacitorApp.exitApp();
              return;
            }

            const isAuthenticatedPage =
              pathname === "/change-password" ||
              pathname === "/kitchen" ||
              pathname === "/display" ||
              pathname === "/superadmin" ||
              pathname.startsWith("/owner/");

            // Any authenticated page -> role home
            if (isAuthenticatedPage) {
              navigate(home, { replace: true });
              return;
            }
          }

          // ==========================================
          // PUBLIC PAGES
          // ==========================================

          // Public home -> exit app
          if (
            pathname === "/" ||
            pathname === "/homepage"
          ) {
            CapacitorApp.exitApp();
            return;
          }

          // Other public pages -> browser history
          navigate(-1);
        }
      );

      listener = result;
    };

    setupListener();

    return () => {
      if (listener?.remove) {
        listener.remove();
      }
    };
  }, [navigate]);

  return null;
}