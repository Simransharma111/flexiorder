import { useEffect } from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  App as CapacitorApp,
} from "@capacitor/app";
import { getHomePathForRole } from "../constants/roles";
import { readStoredSession } from "../utils/session";

export default function BackButtonHandler() {

  const location =
    useLocation();

  const navigate =
    useNavigate();

  useEffect(() => {

    let listener;

    const setupListener =
      async () => {

        listener =
          await CapacitorApp.addListener(
            "backButton",
            () => {

              const { user } = readStoredSession();
              if (user) {
                const home = getHomePathForRole(user.role);
                const authenticatedRoots = [
                  "/owner/dashboard",
                  "/owner/order",
                  "/kitchen",
                  "/display",
                  "/superadmin",
                ];

                if (location.pathname === home) {
                  CapacitorApp.exitApp();
                  return;
                }

                if (
                  authenticatedRoots.includes(location.pathname) ||
                  location.pathname.startsWith("/owner/") ||
                  location.pathname === "/change-password"
                ) {
                  navigate(home, { replace: true });
                  return;
                }
              }

              // EXIT ONLY ON HOME

              if (
                location.pathname === "/" ||
                location.pathname === "/homepage"
              ) {

                CapacitorApp.exitApp();

              } else {

                navigate(-1);

              }

            }
          );

      };

    setupListener();

    return () => {

      if (
        listener &&
        listener.remove
      ) {

        listener.remove();

      }

    };

  }, [location.pathname, navigate]);

  return null;
}
