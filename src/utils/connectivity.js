let snapshot = {
  reachability: typeof navigator === "undefined"
    ? "connecting"
    : navigator.onLine ? "connecting" : "offline",
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
  if (typeof navigator !== "undefined" && navigator.onLine && snapshot.reachability === "offline") {
    publish({ reachability: "connecting" });
  }
};

export const reportApiSuccess = () => publish({
  reachability: typeof navigator !== "undefined" &&
    typeof navigator.onLine === "boolean" && !navigator.onLine
    ? "offline"
    : "online",
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
