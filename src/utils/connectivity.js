let snapshot = {
  // Start conservatively while the first real API request is in flight. Mobile
  // WebViews can report navigator.onLine=false even when Wi-Fi/cellular works.
  reachability: "connecting",
  syncing: false,
  lastSuccessAt: null,
};

const listeners = new Set();

const publish = (patch) => {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
};

export const getConnectivitySnapshot = () => snapshot;
export const subscribeConnectivity = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const reportApiRequest = () => {
  if (snapshot.reachability === "offline") {
    publish({ reachability: "connecting" });
  }
};

export const reportApiSuccess = () => publish({
  // Android WebView can report false during USB reverse transitions while
  // the forwarded API is reachable. Preserve browser offline-cache semantics.
  reachability:
    (typeof navigator !== "undefined" && navigator.onLine) ||
    Capacitor.isNativePlatform()
      ? "online"
      : "offline",
  lastSuccessAt: new Date().toISOString(),
});

export const reportApiFailure = (error) => {
  if (error?.code === "ERR_CANCELED") return;
  if (error?.response) {
    reportApiSuccess();
    return;
  }
  publish({ reachability: "offline" });
};

export const setConnectivitySyncing = (syncing) => publish({ syncing: Boolean(syncing) });

export const startConnectivityMonitoring = () => {
  if (typeof window === "undefined") return () => {};
  const handleOnline = () => publish({ reachability: "connecting" });
  const handleOffline = () => publish({ reachability: "offline", syncing: false });
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
};
import { Capacitor } from "@capacitor/core";
