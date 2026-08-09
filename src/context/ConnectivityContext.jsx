import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  getConnectivitySnapshot,
  startConnectivityMonitoring,
  subscribeConnectivity,
} from "../utils/connectivity";

const ConnectivityContext = createContext(null);

export const ConnectivityProvider = ({ children }) => {
  const snapshot = useSyncExternalStore(
    subscribeConnectivity,
    getConnectivitySnapshot,
    getConnectivitySnapshot
  );

  useEffect(() => startConnectivityMonitoring(), []);

  const value = useMemo(() => {
    const status = snapshot.syncing && snapshot.reachability === "online"
      ? "syncing"
      : snapshot.reachability;
    return {
      ...snapshot,
      status,
      isOnline: snapshot.reachability === "online",
      isOffline: snapshot.reachability === "offline",
      label: status === "online"
        ? "Online"
        : status === "offline"
          ? "Offline"
          : status === "syncing"
            ? "Syncing"
            : "Connecting",
    };
  }, [snapshot]);

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
};

export const useConnectivity = () => {
  const value = useContext(ConnectivityContext);
  if (!value) throw new Error("useConnectivity must be used inside ConnectivityProvider");
  return value;
};
