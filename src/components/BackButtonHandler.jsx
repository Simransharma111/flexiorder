import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";

export default function BackButtonHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {

    const listener =
      CapacitorApp.addListener(
        "backButton",
        () => {

          // If not homepage
          if (location.pathname !== "/") {

            navigate("/", {
              replace: true,
            });

          } else {

            // Exit app only on homepage
            CapacitorApp.exitApp();

          }

        }
      );

    return () => {
      listener.remove();
    };

  }, [location.pathname]);

  return null;
}