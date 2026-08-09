import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiLogOut, FiRefreshCw, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import socket from "../socket";
import KitchenBoard from "../components/kitchen/KitchenBoard";
import { clearAuthSession } from "../utils/session";
import { getScopedStorageKey } from "../utils/storageScope";
import {
  mergeOrders,
  orderKey,
  orderLocation,
  reconcileAuthoritativeOrders,
  replaceOrderAuthoritatively,
} from "../utils/orderModel";
import {
  getKitchenUpdatesNeedingAttention,
  getKitchenUpdatesEligibleForHandled,
  getPendingKitchenUpdates,
  markKitchenUpdatesHandled,
  queueKitchenUpdate,
  reconcileKitchenUpdateSync,
  recordKitchenUpdateFailure,
  retryKitchenUpdatesNeedingAttention,
} from "../utils/offlineKitchenUpdates";

const CACHE_KEY = "flexiorder_kitchen_active_orders";

export default function KitchenDashboard() {
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(getPendingKitchenUpdates().length);
  const [attentionCount, setAttentionCount] = useState(getKitchenUpdatesNeedingAttention().length);
  const syncInFlight = useRef(false);
  const deliveredTimers = useRef(new Map());

  const cacheOrders = (next) => {
    localStorage.setItem(getScopedStorageKey(CACHE_KEY), JSON.stringify(next));
    return next;
  };

  const fetchHotel = useCallback(async () => {
    try {
      const response = await api.get("/hotel/me");
      setHotel(response.data?.hotel || response.data);
    } catch (error) {
      console.warn("Kitchen hotel fetch failed", error);
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

  const removeDeliveredLater = useCallback((id) => {
    window.clearTimeout(deliveredTimers.current.get(id));
    const timer = window.setTimeout(() => {
      setOrders((current) => current.filter((order) => orderKey(order) !== id || order.status !== "delivered"));
      deliveredTimers.current.delete(id);
    }, 10000);
    deliveredTimers.current.set(id, timer);
  }, []);

  const syncPending = useCallback(async () => {
    if (syncInFlight.current || !navigator.onLine) return;
    const snapshot = getPendingKitchenUpdates().filter((item) => !item.requiresAttention);
    if (!snapshot.length) return;
    syncInFlight.current = true;
    try {
      const failed = [];
      for (const update of snapshot) {
        try {
          const response = await api.put(`/kitchen/orders/${update.orderId}`, {
            status: update.status,
            pauseReason: update.pauseReason || null,
            clientMutationId: update.clientMutationId,
          });
          if (response.data?.order) {
            setOrders((current) => cacheOrders(replaceOrderAuthoritatively(current, response.data.order)));
          }
        } catch (error) {
          failed.push(recordKitchenUpdateFailure(update, error));
        }
      }
      const remaining = reconcileKitchenUpdateSync(snapshot, failed);
      setPendingSyncCount(remaining.length);
      setAttentionCount(getKitchenUpdatesNeedingAttention().length);
    } finally {
      syncInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    fetchHotel();
    fetchOrders();
    const poll = window.setInterval(fetchOrders, 30000);
    return () => window.clearInterval(poll);
  }, [fetchHotel, fetchOrders]);

  useEffect(() => {
    if (hotel?._id) socket.emit("joinHotel", hotel._id);
  }, [hotel?._id]);

  useEffect(() => {
    const onNewOrder = (order) => {
      setOrders((current) => cacheOrders(mergeOrders(current, [order])));
      new Audio("/orders_received.mp3").play().catch(() => {});
    };
    const onOrderUpdate = (order) => {
      if (order.status === "cancelled") {
        setOrders((current) => cacheOrders(current.filter((item) => orderKey(item) !== orderKey(order))));
        return;
      }
      setOrders((current) => cacheOrders(replaceOrderAuthoritatively(current, order)));
      if (order.status === "delivered") removeDeliveredLater(orderKey(order));
    };
    socket.on("newOrder", onNewOrder);
    socket.on("kitchenOrderUpdated", onOrderUpdate);
    return () => {
      socket.off("newOrder", onNewOrder);
      socket.off("kitchenOrderUpdated", onOrderUpdate);
    };
  }, [removeDeliveredLater]);

  useEffect(() => {
    const timers = deliveredTimers.current;
    const online = () => {
      setIsOnline(true);
      syncPending();
    };
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    syncPending();
    const retry = window.setInterval(syncPending, 15000);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.clearInterval(retry);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [syncPending]);

  const updateStatus = async (orderId, status, pauseReason = null) => {
    let previousOrder = null;
    const clientMutationId = globalThis.crypto?.randomUUID?.() ||
      `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic = { _id: orderId, status, pauseReason, updatedAt: new Date().toISOString() };
    setOrders((current) => {
      previousOrder = current.find((order) => order._id === orderId) || null;
      return cacheOrders(mergeOrders(current, [optimistic]));
    });
    if (status === "delivered") removeDeliveredLater(orderId);

    if (!navigator.onLine) {
      queueKitchenUpdate({ orderId, status, pauseReason, clientMutationId });
      setPendingSyncCount(getPendingKitchenUpdates().length);
      return;
    }
    try {
      const response = await api.put(`/kitchen/orders/${orderId}`, { status, pauseReason, clientMutationId });
      if (response.data?.order) {
        setOrders((current) => cacheOrders(replaceOrderAuthoritatively(current, response.data.order)));
      }
    } catch (error) {
      if (!error?.response || error.response.status >= 500) {
        queueKitchenUpdate({ orderId, status, pauseReason, clientMutationId });
        setPendingSyncCount(getPendingKitchenUpdates().length);
      } else {
        if (previousOrder) {
          setOrders((current) => cacheOrders(replaceOrderAuthoritatively(current, previousOrder)));
        }
        window.alert(error.response?.data?.message || "Could not update order.");
        fetchOrders();
      }
    }
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

  const lanes = {
    newOrders: filtered.filter((order) => order.status === "pending"),
    preparingOrders: filtered.filter((order) => ["accepted", "preparing"].includes(order.status)),
    readyOrders: filtered.filter((order) => order.status === "ready"),
    pausedOrders: filtered.filter((order) => order.status === "paused"),
  };

  const logout = () => {
    clearAuthSession();
    navigate("/login");
  };

  if (loading && !orders.length) return <div className="ops-loading">Loading kitchen…</div>;

  return (
    <main className="ops-workspace ops-kitchen-workspace">
      <button type="button" className="ops-edge-trigger" aria-label="Open kitchen tools" onClick={() => setToolsOpen(true)}>•••</button>
      <span className={`ops-connection-dot ${isOnline ? "is-online" : "is-offline"}`} title={isOnline ? "Online" : "Offline"} aria-label={isOnline ? "Online" : "Offline"} />

      {toolsOpen && (
        <div className="ops-sheet-backdrop" onClick={() => setToolsOpen(false)}>
          <aside className="ops-tools-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="ops-tools-sheet__brand">
              <strong>{hotel?.name || "Kitchen"}</strong>
              <span>{isOnline ? "Online" : "Offline · changes saved here"}</span>
            </div>
            <label className="ops-search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search table or dish" /></label>
            <button type="button" onClick={fetchOrders}><FiRefreshCw /> Refresh</button>
            <button type="button" onClick={() => navigate("/owner/order")}>Waiter workspace</button>
            <button type="button" onClick={logout}><FiLogOut /> Sign out</button>
            <button type="button" className="ops-sheet-cancel" onClick={() => setToolsOpen(false)}>Close</button>
          </aside>
        </div>
      )}

      {(pendingSyncCount > 0 || attentionCount > 0) && (
        <div className={`ops-sync-strip${attentionCount ? " needs-attention" : ""}`}>
          <span>{attentionCount ? `${attentionCount} need attention` : `${pendingSyncCount} syncing`}</span>
          {attentionCount > 0 && (
            <>
              {getKitchenUpdatesEligibleForHandled().length > 0 && <button type="button" onClick={() => {
                const pending = markKitchenUpdatesHandled();
                setPendingSyncCount(pending.length);
                setAttentionCount(getKitchenUpdatesNeedingAttention().length);
              }}>Already handled</button>}
              <button type="button" onClick={() => {
                const pending = retryKitchenUpdatesNeedingAttention();
                setPendingSyncCount(pending.length);
                setAttentionCount(0);
                syncPending();
              }}>Retry</button>
            </>
          )}
        </div>
      )}

      <KitchenBoard {...lanes} updateStatus={updateStatus} surface="kitchen" />
    </main>
  );
}
