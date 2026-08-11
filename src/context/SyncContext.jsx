import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";
import { useConnectivity } from "./ConnectivityContext";
import { setConnectivitySyncing } from "../utils/connectivity";
import {
  getMenuSyncSummary,
  requestBackgroundSync,
  SYNC_REQUEST_EVENT,
  syncPendingMenu,
} from "../utils/offlineMenu";
import { getPendingStaffOrders } from "../utils/offlineOrders";
import { getPendingKitchenUpdates } from "../utils/offlineKitchenUpdates";
import { getRestaurantId } from "../utils/storageScope";
import { syncPendingKitchenUpdates, syncPendingStaffOrders } from "../utils/syncQueues";

const SyncContext = createContext({
  syncNow: requestBackgroundSync,
  syncKitchenNow: requestBackgroundSync,
});

export const SyncProvider = ({ children }) => {
  const { user } = useAuth();
  const { reachability } = useConnectivity();
  const inFlight = useRef(null);

  const syncNow = useCallback((force = false) => {
    if (!user || inFlight.current || (typeof navigator !== "undefined" && !navigator.onLine)) {
      return inFlight.current || Promise.resolve();
    }

    const restaurantId = getRestaurantId(user) || getRestaurantId();
    const promise = (async () => {
      const menuSummary = getMenuSyncSummary(restaurantId);
      const hasPending = menuSummary.pending > 0 ||
        getPendingStaffOrders().some((item) => !item.requiresAttention) ||
        getPendingKitchenUpdates().some((item) => !item.requiresAttention);
      if (reachability === "online" && !hasPending) return;
      setConnectivitySyncing(hasPending);
      try {
        if (reachability !== "online") {
          try {
            await api.get("/hotel/me");
          } catch (error) {
            // 401 means the server is reachable (auth issue, not connectivity).
            // Any other error with a response body = server reachable.
            // No response = still offline; reset status so UI is accurate.
            if (error?.response) {
              if (error.response.status === 401) return;
            } else {
              setConnectivitySyncing(false);
              return;
            }
          }
        }
        await syncPendingMenu(api, restaurantId, { force });
        await syncPendingStaffOrders(api, { force });
        await syncPendingKitchenUpdates(api, { force });
      } catch (error) {
        console.warn("Background sync is waiting for connectivity", error);
      } finally {
        setConnectivitySyncing(false);
      }
    })().finally(() => { inFlight.current = null; });
    inFlight.current = promise;
    return promise;
  }, [reachability, user]);

  const syncKitchenNow = useCallback((force = false) => {
    if (!user || (typeof navigator !== "undefined" && !navigator.onLine)) {
      return Promise.resolve();
    }
    return syncPendingKitchenUpdates(api, { force }).catch((error) => {
      console.warn("Kitchen updates are waiting for connectivity", error);
    });
  }, [user]);

  useEffect(() => {
    const request = () => { syncNow(false); };
    const reconnect = () => { syncNow(true); };
    window.addEventListener("online", reconnect);
    window.addEventListener(SYNC_REQUEST_EVENT, request);
    const interval = window.setInterval(request, 15000);
    request();
    return () => {
      window.removeEventListener("online", reconnect);
      window.removeEventListener(SYNC_REQUEST_EVENT, request);
      window.clearInterval(interval);
    };
  }, [syncNow]);

  return <SyncContext.Provider value={{ syncNow, syncKitchenNow }}>{children}</SyncContext.Provider>;
};

export const useSync = () => useContext(SyncContext);
