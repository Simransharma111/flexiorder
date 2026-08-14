import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { FiLogOut, FiMoreVertical, FiRefreshCw, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import socket from "../socket";
import { triggerLocalOrderNotification } from "../utils/fcmPush";
import KitchenBoard from "../components/kitchen/KitchenBoard";
import { clearAuthSession, getStoredAuthToken, readStoredSession } from "../utils/session";
import { getScopedStorageKey, rememberRestaurantId } from "../utils/storageScope";
import {
  mergeOrders,
  mergeOrderUpdate,
  matchesOrderId,
  orderBelongsToHotel,
  orderKey,
  orderLocation,
  reconcileAuthoritativeOrders,
} from "../utils/orderModel";
import {
  getKitchenUpdatesNeedingAttention,
  getKitchenUpdatesEligibleForHandled,
  getKitchenUpdateErrors,
  getPendingKitchenUpdates,
  discardKitchenUpdatesNeedingAttention,
  getKitchenRejectedRestorations,
  markKitchenUpdatesHandled,
  queueKitchenUpdate,
  retryKitchenUpdatesNeedingAttention,
} from "../utils/offlineKitchenUpdates";
import { getHotelThemeStyle } from "../utils/hotelTheme";
import {
  applyHotelSettingsUpdate,
  canUseStaffCapability,
  getFeatureSettings,
  hydrateHotelFeatures,
  persistFeatureSettings,
} from "../utils/featureSettings";
import { useConnectivity } from "../context/ConnectivityContext";
import { useSync } from "../context/SyncContext";
import { SYNC_STATE_EVENT } from "../utils/syncQueues";

const CACHE_KEY = "flexiorder_kitchen_active_orders";
const HOTEL_CACHE_KEY = "flexiorder_kitchen_hotel";

export default function KitchenDashboard() {
  const navigate = useNavigate();
  const { status: connectionStatus, label: connectionLabel, isOnline } = useConnectivity();
  const { syncKitchenNow } = useSync();
  const [hotel, setHotel] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(getScopedStorageKey(HOTEL_CACHE_KEY)) || "null");
    } catch {
      return null;
    }
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [attentionCount, setAttentionCount] = useState(getKitchenUpdatesNeedingAttention().length);
  // IDs that have been in READY state for 20+ seconds and should be hidden.
  const [hiddenReadyIds, setHiddenReadyIds] = useState(new Set());
  // orderId → timer handle — persists across re-renders so timers never restart.
  const readyAutoHideTimers = useRef({});
  const settingsRevision = useRef(0);

  // Auto-hide ready orders after 20 seconds to reduce kitchen clutter.
  useEffect(() => {
    orders.filter((o) => o.status === "ready").forEach((order) => {
      if (readyAutoHideTimers.current[order._id]) return; // timer already running
      const readyAt = new Date(order.readyAt || order.updatedAt || 0).getTime();
      const delay = Math.max(0, 20000 - (Date.now() - readyAt));
      readyAutoHideTimers.current[order._id] = window.setTimeout(() => {
        setHiddenReadyIds((prev) => new Set([...prev, order._id]));
        delete readyAutoHideTimers.current[order._id];
      }, delay);
    });
  }, [orders]);

  // Cleanup any pending timers on unmount.
  useEffect(() => () => {
    Object.values(readyAutoHideTimers.current).forEach((t) => clearTimeout(t));
  }, []);

  const currentRole = readStoredSession().user?.role;

  const cacheOrders = (next) => {
    localStorage.setItem(getScopedStorageKey(CACHE_KEY), JSON.stringify(next));
    return next;
  };

  const fetchHotel = useCallback(async () => {
    const requestRevision = settingsRevision.current;
    try {
      const response = await api.get("/hotel/me");
      const nextHotel = hydrateHotelFeatures(response.data?.hotel || response.data);
      rememberRestaurantId(nextHotel);
      if (requestRevision !== settingsRevision.current) return;
      setHotel(nextHotel);
      localStorage.setItem(getScopedStorageKey(HOTEL_CACHE_KEY), JSON.stringify(nextHotel));
    } catch (error) {
      console.warn("Kitchen hotel fetch failed", error);
      if (requestRevision !== settingsRevision.current) return;
      try {
        const cachedHotel = localStorage.getItem(getScopedStorageKey(HOTEL_CACHE_KEY));
        if (cachedHotel) setHotel(JSON.parse(cachedHotel));
      } catch (cacheError) {
        console.warn("Kitchen hotel cache could not be read", cacheError);
      }
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get("/kitchen/orders");
      const incoming = (response.data?.orders || response.data || []).filter(
        (order) => !["delivered", "cancelled"].includes(order.status)
      );
      const pending = getPendingKitchenUpdates();
      setOrders((current) => cacheOrders(reconcileAuthoritativeOrders(current, incoming, pending)));
    } catch (error) {
      console.warn("Kitchen order fetch failed", error);
      try {
        const cached = JSON.parse(localStorage.getItem(getScopedStorageKey(CACHE_KEY)) || "[]");
        setOrders((current) => mergeOrders(current, Array.isArray(cached) ? cached : []));
      } catch (cacheError) {
        console.warn("Kitchen cache could not be read", cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotel();
    fetchOrders();
    const poll = window.setInterval(() => {
      fetchHotel();
      fetchOrders();
    }, 30000);
    return () => window.clearInterval(poll);
  }, [fetchHotel, fetchOrders]);

  useEffect(() => {
    if (!hotel?._id) return undefined;
    const hotelId = String(hotel._id);
    const joinHotel = () => {
      socket.emit("joinHotel", hotelId, getStoredAuthToken());
      socket.emit("joinHotelSettings", hotelId);
    };
    joinHotel();
    socket.on("connect", joinHotel);
    return () => {
      socket.emit("leaveHotel", hotelId);
      socket.emit("leaveHotelSettings", hotelId);
      socket.off("connect", joinHotel);
    };
  }, [hotel?._id]);
  useEffect(() => {
    const onNewOrder = (order) => {
      if (!orderBelongsToHotel(order, hotel?._id)) return;
      setOrders((current) => cacheOrders(mergeOrders(current, [order])));
      triggerLocalOrderNotification(order);
    };
    const onOrderUpdate = (order) => {
      if (order.status === "cancelled") {
        setOrders((current) => cacheOrders(current.filter((item) => orderKey(item) !== orderKey(order))));
        return;
      }
      setOrders((current) => cacheOrders(
        order.status === "delivered"
          ? current.filter((item) => orderKey(item) !== orderKey(order))
          : mergeOrderUpdate(current, order, getPendingKitchenUpdates())
      ));
    };
    const onHotelSettingsUpdate = (payload) => {
      setHotel((current) => {
        const next = applyHotelSettingsUpdate(current, payload);
        if (!next || next === current) return current;
        settingsRevision.current += 1;
        persistFeatureSettings(next, next.featureSettings);
        localStorage.setItem(getScopedStorageKey(HOTEL_CACHE_KEY), JSON.stringify(next));
        return next;
      });
    };
    socket.on("newOrder", onNewOrder);
    socket.on("kitchenOrderUpdated", onOrderUpdate);
    socket.on("hotelSettingsUpdated", onHotelSettingsUpdate);
    return () => {
      socket.off("newOrder", onNewOrder);
      socket.off("kitchenOrderUpdated", onOrderUpdate);
      socket.off("hotelSettingsUpdated", onHotelSettingsUpdate);
    };
  }, [hotel?._id]);

  useEffect(() => {
    const handleSync = (event) => {
      if (event.detail?.kind !== "kitchen-updates") return;
      event.detail.syncedOrders?.forEach((order) => {
        setOrders((current) => cacheOrders(
          ["delivered", "cancelled"].includes(order.status)
            ? current.filter((item) => !matchesOrderId(item, order._id))
            : mergeOrderUpdate(current, order, getPendingKitchenUpdates())
        ));
      });
      setAttentionCount(getKitchenUpdatesNeedingAttention().length);
    };
    window.addEventListener(SYNC_STATE_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_STATE_EVENT, handleSync);
  }, []);

  const updateStatus = (orderId, status, pauseReason = null) => {
    const currentOrder = orders.find((order) => matchesOrderId(order, orderId));
    const queued = queueKitchenUpdate({
      orderId,
      status,
      pauseReason,
      confirmedStatus: currentOrder?.status,
    });

    // Apply the optimistic update synchronously so React flushes a repaint
    // before the network round-trip — eliminates perceived tap lag.
    flushSync(() => {
      setOrders((current) => {
        const previousOrder = current.find((order) => matchesOrderId(order, orderId));
        return cacheOrders(mergeOrders(current, [{
          _id: previousOrder?._id || orderId,
          clientOrderId: previousOrder?.clientOrderId,
          status,
          pauseReason,
          pendingMutation: true,
          clientMutationId: queued.clientMutationId,
          updatedAt: new Date().toISOString(),
        }]));
      });
    });

    if (status !== "ready") {
      if (readyAutoHideTimers.current[orderId]) {
        clearTimeout(readyAutoHideTimers.current[orderId]);
        delete readyAutoHideTimers.current[orderId];
      }
      setHiddenReadyIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }

    if (status === "delivered") {
      flushSync(() => {
        setOrders((current) => cacheOrders(
          current.filter((order) => !matchesOrderId(order, orderId))
        ));
      });
    }

    syncKitchenNow();
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) =>
      orderLocation(order).toLowerCase().includes(term) ||
      String(order.guestName || "").toLowerCase().includes(term) ||
      order.items?.some((item) => String(item.name || "").toLowerCase().includes(term))
    );
  }, [orders, search]);

  const refreshNow = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([fetchHotel(), fetchOrders()]);
    } finally {
      setRefreshing(false);
    }
  };

  const lanes = {
    newOrders: filtered.filter((order) => order.status === "pending"),
    preparingOrders: filtered.filter((order) => ["accepted", "preparing"].includes(order.status)),
    // Exclude orders that have been in ready state for 20+ seconds.
    readyOrders: filtered.filter((order) => order.status === "ready" && !hiddenReadyIds.has(order._id)),
    pausedOrders: filtered.filter((order) => order.status === "paused"),
  };

  const logout = () => {
    if (!window.confirm("Sign out of FlexiOrder on this device?")) return;
    clearAuthSession();
    navigate("/login");
  };

  const featureSettings = getFeatureSettings(hotel);
  const canSwitch = canUseStaffCapability(hotel, "switchWorkspaces", currentRole);
  const canUseDisplay = featureSettings.publicDisplayEnabled &&
    canUseStaffCapability(hotel, "usePublicDisplay", currentRole);

  if (loading && !orders.length) return <div className="ops-loading">Loading kitchen…</div>;

  return (
    <main className="ops-workspace ops-kitchen-workspace" style={getHotelThemeStyle(hotel)}>
      <div className="ops-corner-actions">
        <span className={`ops-connection-dot is-${connectionStatus}`} title={connectionLabel} aria-label={connectionLabel} />
        <button type="button" className="ops-icon-button" aria-label="Refresh kitchen" onClick={refreshNow} disabled={refreshing}><FiRefreshCw className={refreshing ? "animate-spin" : ""} /></button>
        <button type="button" className="ops-icon-button" aria-label="More kitchen options" onClick={() => setToolsOpen(true)}><FiMoreVertical /></button>
      </div>

      {toolsOpen && (
        <div className="ops-sheet-backdrop" onClick={() => setToolsOpen(false)}>
          <aside className="ops-tools-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="ops-tools-sheet__brand">
              <strong>{hotel?.name || "Kitchen"}</strong>
              <span>{connectionLabel === "Offline" ? "Offline · changes saved here" : connectionLabel}</span>
            </div>
            <label className="ops-search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search table or dish" /></label>
            {canSwitch && <button type="button" onClick={() => navigate("/owner/order")}>Waiter workspace</button>}
            {["owner", "superadmin"].includes(currentRole) && (
              <button type="button" onClick={() => navigate("/owner/dashboard")}>Manage restaurant</button>
            )}
            {canUseDisplay && <button type="button" onClick={() => navigate("/display")}>Public order display</button>}
            <button type="button" onClick={logout}><FiLogOut /> Sign out</button>
            <button type="button" className="ops-sheet-cancel" onClick={() => setToolsOpen(false)}>Close</button>
          </aside>
        </div>
      )}

      {attentionCount > 0 && (
        <div className="ops-attention-panel" role="status">
          <span>{`${attentionCount} need attention`}</span>
          {getKitchenUpdateErrors().map(({ orderId, error }) => (
            <span key={orderId} className="ops-attention-panel__error-detail">{error}</span>
          ))}
          {getKitchenUpdatesEligibleForHandled().length > 0 && <button type="button" onClick={() => {
            markKitchenUpdatesHandled();
            setAttentionCount(getKitchenUpdatesNeedingAttention().length);
          }}>Already handled</button>}
          <button type="button" disabled={!isOnline} title={!isOnline ? "Reconnect to retry" : undefined} onClick={() => {
            retryKitchenUpdatesNeedingAttention();
            setAttentionCount(0);
            syncKitchenNow();
          }}>Retry</button>
          <button type="button" onClick={() => {
            const restorations = getKitchenRejectedRestorations();
            discardKitchenUpdatesNeedingAttention();
            setOrders((current) => cacheOrders(current.map((order) => {
              const restoration = restorations.find((item) => matchesOrderId(order, item.orderId));
              return restoration ? {
                ...order,
                status: restoration.status,
                pendingMutation: false,
                reverted: true,
                statusChangeType: "revert",
                updatedAt: new Date().toISOString(),
              } : order;
            })));
            setAttentionCount(0);
            fetchOrders();
          }}>Restore confirmed</button>
        </div>
      )}

      <KitchenBoard
        {...lanes}
        updateStatus={updateStatus}
        surface="kitchen"
        godModeEnabled={featureSettings.godModeEnabled}
      />
    </main>
  );
}
