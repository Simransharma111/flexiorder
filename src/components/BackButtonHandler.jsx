import { useEffect } from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  App as CapacitorApp,
} from "@capacitor/app";

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
