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
  const [historyActionOpenedAt, setHistoryActionOpenedAt] = useState(0);
  const [historyDetailOrder, setHistoryDetailOrder] = useState(null);
  const historyDialogRef = useRef(null);
  const historyDetailDialogRef = useRef(null);
  const closeHistoryActions = useCallback(() => setHistoryActionOrder(null), []);
  const closeHistoryDetails = useCallback(() => setHistoryDetailOrder(null), []);
  const openHistoryActions = useCallback((order) => {
    setHistoryActionOpenedAt(Date.now());
    setHistoryActionOrder(order);
  }, []);
  useDialogFocus(Boolean(historyActionOrder), historyDialogRef, closeHistoryActions);
  useDialogFocus(Boolean(historyDetailOrder), historyDetailDialogRef, closeHistoryDetails);
  const [localOrders, setLocalOrders] = useState(() => mergeOrders([], orders));
  const [pendingSyncCount, setPendingSyncCount] = useState(getPendingKitchenUpdates().length);
  const [attentionCount, setAttentionCount] = useState(getKitchenUpdatesNeedingAttention().length);
  const syncInFlight = useRef(false);

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
    const online = () => syncPendingUpdates();
    window.addEventListener("online", online);
    syncPendingUpdates();
    const interval = window.setInterval(syncPendingUpdates, 15000);
    return () => {
      window.removeEventListener("online", online);
      window.clearInterval(interval);
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
    (order) => !["cancelled", "delivered"].includes(order.status)
  ), [localOrders]);
  const lanes = {
    newOrders: activeOrders.filter((order) => order.status === "pending"),
    preparingOrders: activeOrders.filter((order) => ["accepted", "preparing"].includes(order.status)),
    readyOrders: activeOrders.filter((order) => order.status === "ready"),
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

  const changeHistoryStatus = async (status) => {
    if (!historyActionOrder) return;
    await updateStatus(historyActionOrder._id, status);
    setHistoryActionOrder(null);
    if (!["delivered", "cancelled"].includes(status)) setActiveView("active");
  };

  const correctionTime = historyActionOrder && new Date(
    historyActionOrder.deliveredAt || historyActionOrder.cancelledAt ||
    historyActionOrder.updatedAt || historyActionOrder.createdAt || 0
  ).getTime();
  const canCorrectHistory = Boolean(
    correctionTime && historyActionOpenedAt - correctionTime <= 2.5 * 60 * 60 * 1000
  );

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
            <OrderCard key={orderKey(order)} order={order} onLongPress={openHistoryActions} />
          )) : <div className="ops-history-empty"><FiShoppingBag /><span>No history found</span></div>}
        </div>
      )}

      {historyActionOrder && (
        <div className="ops-sheet-backdrop" onClick={closeHistoryActions}>
          <section ref={historyDialogRef} tabIndex={-1} className="ops-action-sheet" role="dialog" aria-modal="true" aria-label={`History actions for ${orderLocation(historyActionOrder)}`} onClick={(event) => event.stopPropagation()}>
            <div><h2>{orderLocation(historyActionOrder)}</h2><p>{historyActionOrder.status === "cancelled" ? "Cancelled order" : "Delivered order"}</p></div>
            <div className="ops-action-sheet__actions">
              <button type="button" onClick={() => {
                setHistoryDetailOrder(historyActionOrder);
                setHistoryActionOrder(null);
              }}>View full details</button>
              {canCorrectHistory && <button type="button" onClick={() => changeHistoryStatus("preparing")}>Mark not delivered</button>}
              {canCorrectHistory && <button type="button" onClick={() => changeHistoryStatus("ready")}>Change to Ready</button>}
              {canCorrectHistory && historyActionOrder.status !== "cancelled" && <button type="button" className="is-danger" onClick={() => changeHistoryStatus("cancelled")}>Cancel order</button>}
            </div>
            {!canCorrectHistory && <p>Correction window closed. Details remain available.</p>}
            <button type="button" className="ops-sheet-cancel" onClick={closeHistoryActions}>Close</button>
          </section>
        </div>
      )}

      {historyDetailOrder && (
        <OrderHistoryDetails
          dialogRef={historyDetailDialogRef}
          order={historyDetailOrder}
          onClose={closeHistoryDetails}
        />
      )}
    </section>
  );
}

const formatMoney = (value) => Number.isFinite(Number(value))
  ? `₹${Number(value).toFixed(2)}`
  : "—";

const formatDateTime = (value) => value
  ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
  : "—";

function OrderHistoryDetails({ dialogRef, order, onClose }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const calculatedSubtotal = items.reduce(
    (sum, item) => sum + Number(item.price || item.finalPrice || 0) * Number(item.quantity || 0),
    0
  );
  const subtotal = order.subtotal ?? order.originalSubtotal ?? calculatedSubtotal;
  const discount = order.discountAmount ?? order.discount ?? 0;
  const gstRate = order.gstRate ?? order.gstPercentage ?? 0;
  const gstAmount = order.gstAmount ?? order.taxAmount ?? 0;
  const total = order.totalAmount ?? order.total ?? (Number(subtotal) - Number(discount) + Number(gstAmount));
  const note = order.note || order.notes || order.specialInstructions || order.instructions;
  const cancellationReason = order.cancelReason || order.cancellationReason ||
    (order.status === "cancelled" ? order.pauseReason : "");
  const contact = order.guestContact || order.guestPhone || order.contact || order.phone;
  const timeline = [
    ["Placed", order.createdAt || order.queuedAt],
    ["Accepted", order.acceptedAt],
    ["Preparing", order.preparingAt],
    ["Ready", order.readyAt],
    ["Delivered", order.deliveredAt],
    ["Cancelled", order.cancelledAt],
    ["Last updated", order.updatedAt],
  ].filter(([, value]) => value);

  return (
    <div className="ops-sheet-backdrop" onClick={onClose}>
      <section ref={dialogRef} tabIndex={-1} className="ops-history-details" role="dialog" aria-modal="true" aria-label={`Order details for ${orderLocation(order)}`} onClick={(event) => event.stopPropagation()}>
        <header><div><h2>{orderLocation(order)}</h2><p>Order #{String(order._id || order.clientOrderId || "").slice(-8)}</p></div><button type="button" className="ops-icon-button" aria-label="Close order details" onClick={onClose}>×</button></header>
        <dl className="ops-history-facts">
          <div><dt>Status</dt><dd>{order.status}</dd></div>
          <div><dt>Placed</dt><dd>{formatDateTime(order.createdAt || order.queuedAt)}</dd></div>
          {order.guestName && <div><dt>Customer</dt><dd>{order.guestName}</dd></div>}
          {contact && <div><dt>Contact</dt><dd>{contact}</dd></div>}
        </dl>
        <section><h3>Items</h3>{items.map((item, index) => <div className="ops-history-item" key={`${item.menuId || item._id || item.name}-${index}`}><span>{Number(item.quantity || 1)} × {item.name || item.menu?.name || "Dish"}</span><b>{formatMoney(Number(item.price || item.finalPrice || 0) * Number(item.quantity || 1))}</b></div>)}</section>
        {note && <section className="ops-history-note"><h3>Instructions</h3><p>{note}</p></section>}
        {cancellationReason && <section className="ops-history-note"><h3>Cancellation reason</h3><p>{cancellationReason}</p></section>}
        <section><h3>Amount</h3><div className="ops-history-money"><span>Subtotal <b>{formatMoney(subtotal)}</b></span>{Number(discount) > 0 && <span>Discount <b>− {formatMoney(discount)}</b></span>}{Number(gstAmount) > 0 && <span>GST ({gstRate}%) <b>{formatMoney(gstAmount)}</b></span>}<span className="is-total">Total <b>{formatMoney(total)}</b></span></div></section>
        <section><h3>Timing</h3><ol className="ops-history-timeline">{timeline.map(([label, value]) => <li key={`${label}-${value}`}><span>{label}</span><time>{formatDateTime(value)}</time></li>)}</ol></section>
        <button type="button" className="ops-sheet-cancel" onClick={onClose}>Close</button>
      </section>
    </div>
  );
}
