import { Capacitor } from "@capacitor/core";

export const isMobileApp = () => {
  return Capacitor.isNativePlatform();
};