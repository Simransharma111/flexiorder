import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";

import { getHomePathForRole } from "../constants/roles";
import { readStoredSession } from "../utils/session";

export default function BackButtonHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  const pathnameRef = useRef(location.pathname);

  // Always keep the latest pathname available to the native listener
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let listener = null;
    let mounted = true;

    const setupListener = async () => {
      listener = await CapacitorApp.addListener(
        "backButton",
        () => {
          if (!mounted) return;

          const pathname = pathnameRef.current;
          const { user } = readStoredSession();

          /*
           * =====================================================
           * AUTHENTICATED USER
           * =====================================================
           */
          if (user) {
            const home = getHomePathForRole(user.role);

            /*
             * If already on the user's home page,
             * Android back should exit the application.
             */
            if (pathname === home) {
              CapacitorApp.exitApp();
              return;
            }

            /*
             * All authenticated application pages.
             */
            const isAuthenticatedPage =
              pathname === "/change-password" ||
              pathname === "/kitchen" ||
              pathname === "/display" ||
              pathname === "/superadmin" ||
              pathname.startsWith("/owner/");

            /*
             * From any authenticated page, return to
             * the correct role-based home page.
             */
            if (isAuthenticatedPage) {
              navigate(home, { replace: true });
              return;
            }
          }

          /*
           * =====================================================
           * PUBLIC PAGES
           * =====================================================
           */

          /*
           * Public home pages:
           * Android back exits the application.
           */
          if (
            pathname === "/" ||
            pathname === "/homepage"
          ) {
            CapacitorApp.exitApp();
            return;
          }

          /*
           * Other public pages:
           * use normal browser history.
           */
          navigate(-1);
        }
      );
    };

    setupListener();

    return () => {
      mounted = false;

      if (listener) {
        listener.then((handle) => {
          handle.remove();
        });
      }
    };
  }, [navigate]);

  return null;
}