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

          // EXIT ONLY ON HOME
          if (location.pathname === "/") {

            CapacitorApp.exitApp();

          } else {

            navigate(-1);

          }

        }
      );

    return () => {
      listener.remove();
    };

  }, [location.pathname]);

  return null;
}