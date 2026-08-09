import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiSearch, FiShoppingBag } from "react-icons/fi";
import api from "../../api/axios";
import KitchenBoard from "../kitchen/KitchenBoard";
import OrderCard from "./OrderCard";
import useDialogFocus from "../../hooks/useDialogFocus";
import {
  mergeOrders,
  orderKey,
  orderLocation,
  reconcileAuthoritativeOrders,
  replaceOrderAuthoritatively,
} from "../../utils/orderModel";
import {
  getKitchenUpdatesNeedingAttention,
  getKitchenUpdatesEligibleForHandled,
  getPendingKitchenUpdates,
  markKitchenUpdatesHandled,
  queueKitchenUpdate,
  reconcileKitchenUpdateSync,
  recordKitchenUpdateFailure,
  retryKitchenUpdatesNeedingAttention,
} from "../../utils/offlineKitchenUpdates";

export default function Orders({ orders = [], refresh, onOrdersChange }) {
  const [activeView, setActiveView] = useState("active");
  const [search, setSearch] = useState("");
  const [historyActionOrder, setHistoryActionOrder] = useState(null);
  const historyDialogRef = useRef(null);
  const closeHistoryActions = useCallback(() => setHistoryActionOrder(null), []);
  useDialogFocus(Boolean(historyActionOrder), historyDialogRef, closeHistoryActions);
  const [localOrders, setLocalOrders] = useState(() => mergeOrders([], orders));
  const [pendingSyncCount, setPendingSyncCount] = useState(getPendingKitchenUpdates().length);
  const [attentionCount, setAttentionCount] = useState(getKitchenUpdatesNeedingAttention().length);
  const [recentDeliveredIds, setRecentDeliveredIds] = useState(() => new Set());
  const syncInFlight = useRef(false);
  const deliveredTimers = useRef(new Map());

  useEffect(() => {
    setLocalOrders((current) => reconcileAuthoritativeOrders(
      current,
      orders,
      getPendingKitchenUpdates(),
    ));
  }, [orders]);

  const publishOrders = useCallback((updater) => {
    setLocalOrders((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      onOrdersChange?.(next);
      return next;
    });
  }, [onOrdersChange]);

  const removeDeliveredLater = useCallback((id) => {
    window.clearTimeout(deliveredTimers.current.get(id));
    setRecentDeliveredIds((current) => new Set(current).add(id));
    deliveredTimers.current.set(id, window.setTimeout(() => {
      setRecentDeliveredIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      deliveredTimers.current.delete(id);
    }, 10000));
  }, []);

  const syncPendingUpdates = useCallback(async () => {
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
            publishOrders((current) => replaceOrderAuthoritatively(current, response.data.order));
          }
        } catch (error) {
          failed.push(recordKitchenUpdateFailure(update, error));
        }
      }
      const remaining = reconcileKitchenUpdateSync(snapshot, failed);
      setPendingSyncCount(remaining.length);
      setAttentionCount(getKitchenUpdatesNeedingAttention().length);
      if (failed.length !== snapshot.length) refresh?.();
    } finally {
      syncInFlight.current = false;
    }
  }, [publishOrders, refresh]);

  useEffect(() => {
    const timers = deliveredTimers.current;
    const online = () => syncPendingUpdates();
    window.addEventListener("online", online);
    syncPendingUpdates();
    const interval = window.setInterval(syncPendingUpdates, 15000);
    return () => {
      window.removeEventListener("online", online);
      window.clearInterval(interval);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [syncPendingUpdates]);

  const updateStatus = async (orderId, status, pauseReason = null) => {
    let previousOrder = null;
    const clientMutationId = globalThis.crypto?.randomUUID?.() ||
      `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic = {
      _id: orderId,
      status,
      pauseReason,
      updatedAt: new Date().toISOString(),
      ...(status === "preparing" ? {
        reverted: true,
        statusChangeType: "revert",
      } : {}),
    };
    publishOrders((current) => {
      previousOrder = current.find((order) => order._id === orderId) || null;
      return mergeOrders(current, [optimistic]);
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
        publishOrders((current) => replaceOrderAuthoritatively(current, response.data.order));
      }
      else refresh?.();
    } catch (error) {
      if (!error?.response || error.response.status >= 500) {
        queueKitchenUpdate({ orderId, status, pauseReason, clientMutationId });
        setPendingSyncCount(getPendingKitchenUpdates().length);
      } else {
        if (previousOrder) {
          publishOrders((current) => replaceOrderAuthoritatively(current, previousOrder));
        }
        window.alert(error.response?.data?.message || "Could not update order.");
        refresh?.();
      }
    }
  };

  const activeOrders = useMemo(() => localOrders.filter(
    (order) => order.status !== "cancelled" &&
      (order.status !== "delivered" || recentDeliveredIds.has(orderKey(order)))
  ), [localOrders, recentDeliveredIds]);
  const lanes = {
    newOrders: activeOrders.filter((order) => order.status === "pending"),
    preparingOrders: activeOrders.filter((order) => ["accepted", "preparing"].includes(order.status)),
    readyOrders: activeOrders.filter((order) => order.status === "ready" || order.status === "delivered"),
    pausedOrders: activeOrders.filter((order) => order.status === "paused"),
  };
  const historyOrders = useMemo(() => localOrders.filter(
    (order) => ["delivered", "cancelled"].includes(order.status)
  ), [localOrders]);
  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return historyOrders;
    return historyOrders.filter((order) => [
      order._id,
      order.clientOrderId,
      order.guestName,
      orderLocation(order),
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [historyOrders, search]);

  const restoreHistoryOrder = async () => {
    if (!historyActionOrder) return;
    await updateStatus(historyActionOrder._id, "preparing");
    setHistoryActionOrder(null);
    setActiveView("active");
  };

  return (
    <section className="ops-waiter-orders">
      <div className="ops-orders-switch" role="tablist" aria-label="Order views">
        <button type="button" role="tab" aria-selected={activeView === "active"} className={activeView === "active" ? "is-active" : ""} onClick={() => setActiveView("active")}>Active</button>
        <button type="button" role="tab" aria-selected={activeView === "history"} className={activeView === "history" ? "is-active" : ""} onClick={() => setActiveView("history")}>History</button>
      </div>
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
                syncPendingUpdates();
              }}>Retry</button>
            </>
          )}
        </div>
      )}
      {activeView === "active" ? (
        <KitchenBoard {...lanes} updateStatus={updateStatus} surface="waiter" />
      ) : (
        <div className="ops-order-history">
          <label className="ops-search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search old orders" /></label>
          {filteredHistory.length ? filteredHistory.map((order) => (
            <OrderCard key={orderKey(order)} order={order} onLongPress={setHistoryActionOrder} />
          )) : <div className="ops-history-empty"><FiShoppingBag /><span>No history found</span></div>}
        </div>
      )}

      {historyActionOrder && (
        <div className="ops-sheet-backdrop" onClick={closeHistoryActions}>
          <section ref={historyDialogRef} tabIndex={-1} className="ops-action-sheet" role="dialog" aria-modal="true" aria-label={`History actions for ${orderLocation(historyActionOrder)}`} onClick={(event) => event.stopPropagation()}>
            <div><h2>{orderLocation(historyActionOrder)}</h2><p>Restore this order to Preparing?</p></div>
            <button type="button" onClick={restoreHistoryOrder}>Restore to Preparing</button>
            <button type="button" className="ops-sheet-cancel" onClick={closeHistoryActions}>Close</button>
          </section>
        </div>
      )}
    </section>
  );
}
