import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiSearch, FiShoppingBag } from "react-icons/fi";
import KitchenBoard from "../kitchen/KitchenBoard";
import OrderCard from "./OrderCard";
import OrderReceiptActions from "../orders/OrderReceiptActions";
import useDialogFocus from "../../hooks/useDialogFocus";
import {
  getReadyOrderIds,
  mergeOrders,
  mergeOrderUpdate,
  matchesOrderId,
  orderKey,
  orderLocation,
  reconcileAuthoritativeOrders,
} from "../../utils/orderModel";
import {
  getKitchenUpdatesNeedingAttention,
  getKitchenUpdatesEligibleForHandled,
  getKitchenUpdateErrors,
  getPendingKitchenUpdates,
  discardKitchenUpdatesNeedingAttention,
  getKitchenRejectedRestorations,
  markKitchenUpdatesHandled,
  queueKitchenUpdate,
  queueKitchenUpdates,
  retryKitchenUpdatesNeedingAttention,
} from "../../utils/offlineKitchenUpdates";
import { useSync } from "../../context/SyncContext";
import { SYNC_STATE_EVENT } from "../../utils/syncQueues";
import { flushSync } from "react-dom";
import { buildOrderReceipt } from "../../utils/orderReceipt";

export default function Orders({
  orders = [],
  refresh,
  onOrdersChange,
  godModeEnabled = false,
  allowBulkDelivery = false,
  hotel = null,
}) {
  const { syncKitchenNow } = useSync();
  const [activeView, setActiveView] = useState("active");
  const [search, setSearch] = useState("");
  const [historyActionOrder, setHistoryActionOrder] = useState(null);
  const [historyActionOpenedAt, setHistoryActionOpenedAt] = useState(0);
  const [historyDetailOrder, setHistoryDetailOrder] = useState(null);
  const [bulkSnapshotIds, setBulkSnapshotIds] = useState(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkAnnouncement, setBulkAnnouncement] = useState("");
  const historyDialogRef = useRef(null);
  const historyDetailDialogRef = useRef(null);
  const bulkDialogRef = useRef(null);
  const bulkDispatchingRef = useRef(false);
  const closeHistoryActions = useCallback(() => setHistoryActionOrder(null), []);
  const closeHistoryDetails = useCallback(() => setHistoryDetailOrder(null), []);
  const closeBulkConfirmation = useCallback(() => {
    if (!bulkDispatchingRef.current) setBulkSnapshotIds(null);
  }, []);
  const openHistoryActions = useCallback((order) => {
    setHistoryActionOpenedAt(Date.now());
    setHistoryActionOrder(order);
  }, []);
  useDialogFocus(Boolean(historyActionOrder), historyDialogRef, closeHistoryActions);
  useDialogFocus(Boolean(historyDetailOrder), historyDetailDialogRef, closeHistoryDetails);
  useDialogFocus(Boolean(bulkSnapshotIds), bulkDialogRef, closeBulkConfirmation);
  const [localOrders, setLocalOrders] = useState(() => mergeOrders([], orders));
  const [pendingSyncCount, setPendingSyncCount] = useState(getPendingKitchenUpdates().length);
  const [attentionCount, setAttentionCount] = useState(getKitchenUpdatesNeedingAttention().length);
  // Delivered orders accumulate for the session so History persists across polls.
  const [sessionDeliveries, setSessionDeliveries] = useState([]);
  // IDs currently visible in the Delivered lane (auto-hidden after 20 seconds).
  const [visibleDeliveredIds, setVisibleDeliveredIds] = useState(new Set());
  const deliveredAutoHideTimers = useRef({});

  // Start 20-second auto-hide timer for each new entry in sessionDeliveries.
  useEffect(() => {
    sessionDeliveries.forEach((order) => {
      if (deliveredAutoHideTimers.current[order._id]) return; // already tracking
      // Show immediately in the Delivered lane.
      setVisibleDeliveredIds((prev) => new Set([...prev, order._id]));
      // Hide from the Delivered lane after 20 seconds (moves to History automatically).
      deliveredAutoHideTimers.current[order._id] = window.setTimeout(() => {
        setVisibleDeliveredIds((prev) => {
          const next = new Set(prev);
          next.delete(order._id);
          return next;
        });
        delete deliveredAutoHideTimers.current[order._id];
      }, 20000);
    });
  }, [sessionDeliveries]);

  // Cleanup timers on unmount.
  useEffect(() => () => {
    Object.values(deliveredAutoHideTimers.current).forEach((t) => clearTimeout(t));
  }, []);

  useEffect(() => {
    setLocalOrders((current) => reconcileAuthoritativeOrders(
      current,
      orders,
      getPendingKitchenUpdates(),
    ));
  }, [orders]);

  const prevPendingCountRef = useRef(0);
  useEffect(() => {
    const pendingCount = localOrders.filter(o => o.status === "pending").length;
    if (pendingCount > prevPendingCountRef.current) {
      setActiveView("active");
    }
    prevPendingCountRef.current = pendingCount;
  }, [localOrders]);

  const publishOrders = useCallback((updater) => {
    setLocalOrders((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      onOrdersChange?.(next);
      return next;
    });
  }, [onOrdersChange]);

  useEffect(() => {
    const handleSync = (event) => {
      if (event.detail?.kind !== "kitchen-updates") return;
      event.detail.syncedOrders?.forEach((order) => {
        publishOrders((current) => mergeOrderUpdate(current, order, getPendingKitchenUpdates()));
        setSessionDeliveries((current) => {
          const hasDelivery = current.some((delivery) =>
            matchesOrderId(delivery, order._id) || matchesOrderId(delivery, order.clientOrderId));
          return hasDelivery || order.status === "delivered"
            ? mergeOrders(current, [order])
            : current;
        });
        if (order.clientOrderId && order._id && String(order.clientOrderId) !== String(order._id)) {
          const localId = order.clientOrderId;
          if (deliveredAutoHideTimers.current[localId]) {
            clearTimeout(deliveredAutoHideTimers.current[localId]);
            delete deliveredAutoHideTimers.current[localId];
          }
          setVisibleDeliveredIds((current) => {
            if (!current.has(localId)) return current;
            const next = new Set(current);
            next.delete(localId);
            next.add(order._id);
            return next;
          });
        }
      });
      setPendingSyncCount(getPendingKitchenUpdates().length);
      setAttentionCount(getKitchenUpdatesNeedingAttention().length);
      if (event.detail.syncedOrders?.length) refresh?.();
    };
    window.addEventListener(SYNC_STATE_EVENT, handleSync);
    return () => {
      window.removeEventListener(SYNC_STATE_EVENT, handleSync);
    };
  }, [publishOrders, refresh]);

  const updateStatus = (orderId, status, pauseReason = null) => {
    let previousOrder = null;
    const currentOrder = localOrders.find((order) => matchesOrderId(order, orderId));
    const queued = queueKitchenUpdate({
      orderId,
      status,
      pauseReason,
      confirmedStatus: currentOrder?.status,
    });
    flushSync(() => {
      publishOrders((current) => {
        previousOrder = current.find((order) => order._id === orderId || order.clientOrderId === orderId) || null;
        return mergeOrders(current, [{
          _id: previousOrder?._id || orderId,
          clientOrderId: previousOrder?.clientOrderId,
          status,
          pauseReason,
          pendingMutation: true,
          clientMutationId: queued.clientMutationId,
          updatedAt: new Date().toISOString(),
          ...(["delivered", "cancelled"].includes(previousOrder?.status) &&
            !["delivered", "cancelled"].includes(status) ? {
              reverted: true,
              statusChangeType: "revert",
            } : {}),
        }]);
      });
    });

    // When marking delivered, add a session snapshot immediately so the
    // Delivered lane populates even before the API responds.
    if (status === "delivered") {
      const snapshot = { ...(previousOrder || {}), _id: orderId, status: "delivered",
        deliveredAt: new Date().toISOString() };
      setSessionDeliveries((prev) => [
        ...prev.filter((o) => o._id !== orderId),
        snapshot,
      ]);
    } else {
      // If an order is corrected back (e.g. to "preparing"), remove it from session
      setSessionDeliveries((prev) => prev.filter((o) => o._id !== orderId));
      if (deliveredAutoHideTimers.current[orderId]) {
        clearTimeout(deliveredAutoHideTimers.current[orderId]);
        delete deliveredAutoHideTimers.current[orderId];
      }
      setVisibleDeliveredIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }

    setPendingSyncCount(getPendingKitchenUpdates().length);
    syncKitchenNow();
  };

  const attentionOrderIds = getKitchenUpdatesNeedingAttention().map((item) => item.orderId);
  const readyOrderIds = useMemo(
    () => getReadyOrderIds(localOrders, null, attentionOrderIds),
    [attentionOrderIds, localOrders],
  );
  const revalidatedBulkIds = useMemo(
    () => getReadyOrderIds(localOrders, bulkSnapshotIds, attentionOrderIds),
    [attentionOrderIds, bulkSnapshotIds, localOrders],
  );
  const bulkLocations = useMemo(() => new Set(revalidatedBulkIds.map((id) => {
    const order = localOrders.find((item) => matchesOrderId(item, id));
    return order ? orderLocation(order) : "";
  }).filter(Boolean)).size, [localOrders, revalidatedBulkIds]);

  const openBulkConfirmation = () => {
    if (!allowBulkDelivery || bulkDispatchingRef.current || !readyOrderIds.length) return;
    setBulkAnnouncement("");
    setBulkSnapshotIds([...readyOrderIds]);
  };

  const deliverBulkSnapshot = () => {
    if (!allowBulkDelivery || bulkDispatchingRef.current || !bulkSnapshotIds) return;
    const eligibleIds = getReadyOrderIds(
      localOrders,
      bulkSnapshotIds,
      getKitchenUpdatesNeedingAttention().map((item) => item.orderId),
    );
    if (!eligibleIds.length) {
      setBulkAnnouncement("No snapshotted orders are still Ready.");
      setBulkSnapshotIds(null);
      return;
    }

    bulkDispatchingRef.current = true;
    setBulkSubmitting(true);
    const now = new Date().toISOString();
    const sourceOrders = eligibleIds.map((id) =>
      localOrders.find((order) => matchesOrderId(order, id))).filter(Boolean);
    const queued = queueKitchenUpdates(sourceOrders.map((order) => ({
      orderId: order._id || orderKey(order),
      localOrderId: order.clientOrderId && String(order.clientOrderId) !== String(order._id)
        ? order.clientOrderId
        : undefined,
      status: "delivered",
      confirmedStatus: "ready",
    })));
    const queuedByOrder = new Map(queued.map((item) => [String(item.orderId), item]));
    const optimisticOrders = sourceOrders.map((order) => {
      const queuedUpdate = queuedByOrder.get(String(order._id || orderKey(order)));
      return {
        ...order,
        status: "delivered",
        deliveredAt: now,
        updatedAt: now,
        pendingMutation: true,
        clientMutationId: queuedUpdate?.clientMutationId,
      };
    });

    flushSync(() => {
      publishOrders((current) => mergeOrders(current, optimisticOrders));
      setSessionDeliveries((current) => mergeOrders(current, optimisticOrders));
      setBulkSnapshotIds(null);
      setActiveView("history");
    });
    setPendingSyncCount(getPendingKitchenUpdates().length);
    const skipped = bulkSnapshotIds.length - optimisticOrders.length;
    setBulkAnnouncement(`${optimisticOrders.length} ${optimisticOrders.length === 1 ? "order" : "orders"} moved to History${skipped > 0 ? ` · ${skipped} no longer Ready` : ""}. Synchronization continues separately.`);
    syncKitchenNow();
    setBulkSubmitting(false);
    bulkDispatchingRef.current = false;
  };

  // Active board: all non-cancelled, non-delivered orders.
  const activeOrders = useMemo(() => localOrders.filter(
    (order) => !["cancelled", "delivered"].includes(order.status)
  ), [localOrders]);

  // Delivered lane: only orders still within their 20-second visibility window.
  const deliveredOrders = useMemo(() =>
    sessionDeliveries.filter((o) => visibleDeliveredIds.has(o._id)),
  [sessionDeliveries, visibleDeliveredIds]);

  const lanes = {
    newOrders: activeOrders.filter((order) => order.status === "pending"),
    preparingOrders: activeOrders.filter((order) => ["accepted", "preparing"].includes(order.status)),
    readyOrders: activeOrders.filter((order) => order.status === "ready"),
    pausedOrders: activeOrders.filter((order) => order.status === "paused"),
    deliveredOrders,
  };

  // History: delivered/cancelled from live orders + ALL session deliveries (including auto-hidden ones).
  const historyOrders = useMemo(() => {
    const localHistory = localOrders.filter(
      (order) => ["delivered", "cancelled"].includes(order.status)
    );
    // Session deliveries that were reconciled away from localOrders (auto-hidden) still show in history.
    const sessionHistory = sessionDeliveries.filter((delivery) => !localHistory.some((order) =>
      matchesOrderId(order, delivery._id) || matchesOrderId(order, delivery.clientOrderId)));
    return [...localHistory, ...sessionHistory].sort(
      (a, b) => new Date(b.deliveredAt || b.updatedAt || 0) - new Date(a.deliveredAt || a.updatedAt || 0)
    );
  }, [localOrders, sessionDeliveries]);
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

  const changeHistoryStatus = (status) => {
    if (!historyActionOrder) return;
    updateStatus(historyActionOrder._id, status);
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
      <div className="ops-orders-toolbar">
        <div className="ops-orders-switch" role="tablist" aria-label="Order views">
          <button type="button" role="tab" aria-selected={activeView === "active"} className={activeView === "active" ? "is-active" : ""} onClick={() => setActiveView("active")}>Active</button>
          <button type="button" role="tab" aria-selected={activeView === "history"} className={activeView === "history" ? "is-active" : ""} onClick={() => setActiveView("history")}>History</button>
        </div>
        {allowBulkDelivery && activeView === "active" && (
          <button
            type="button"
            className="ops-deliver-all"
            onClick={openBulkConfirmation}
            disabled={!readyOrderIds.length || bulkSubmitting}
            aria-label={`Deliver all ready orders${readyOrderIds.length ? ` (${readyOrderIds.length})` : ""}`}
          >
            Deliver all ready{readyOrderIds.length ? ` (${readyOrderIds.length})` : ""}
          </button>
        )}
      </div>
      {bulkAnnouncement && <p className="ops-orders-announcement" role="status">{bulkAnnouncement}</p>}
      {(pendingSyncCount > 0 || attentionCount > 0) && (
        <div className={`ops-sync-strip${attentionCount ? " needs-attention" : ""}`}>
          <span>{attentionCount ? `${attentionCount} need attention` : `${pendingSyncCount} syncing`}</span>
          {attentionCount > 0 && (
            <>
              {getKitchenUpdateErrors().map(({ orderId, error }) => (
                <span key={orderId} className="ops-sync-strip__error-detail">{error}</span>
              ))}
              {getKitchenUpdatesEligibleForHandled().length > 0 && <button type="button" onClick={() => {
                const pending = markKitchenUpdatesHandled();
                setPendingSyncCount(pending.length);
                setAttentionCount(getKitchenUpdatesNeedingAttention().length);
              }}>Already handled</button>}
              <button type="button" onClick={() => {
                const pending = retryKitchenUpdatesNeedingAttention();
                setPendingSyncCount(pending.length);
                setAttentionCount(0);
                syncKitchenNow();
              }}>Retry</button>
              <button type="button" onClick={() => {
                const restorations = getKitchenRejectedRestorations();
                const pending = discardKitchenUpdatesNeedingAttention();
                const restoredAliases = new Set(restorations.flatMap((restoration) => {
                  const delivery = sessionDeliveries.find((order) =>
                    matchesOrderId(order, restoration.orderId));
                  return [
                    restoration.orderId,
                    delivery?._id,
                    delivery?.clientOrderId,
                    delivery?.localId,
                  ].filter(Boolean).map(String);
                }));
                restoredAliases.forEach((id) => {
                  if (!deliveredAutoHideTimers.current[id]) return;
                  clearTimeout(deliveredAutoHideTimers.current[id]);
                  delete deliveredAutoHideTimers.current[id];
                });
                publishOrders((current) => current.map((order) => {
                  const restoration = restorations.find((item) => matchesOrderId(order, item.orderId));
                  return restoration ? {
                    ...order,
                    status: restoration.status,
                    pendingMutation: false,
                    reverted: true,
                    statusChangeType: "revert",
                    updatedAt: new Date().toISOString(),
                  } : order;
                }));
                setSessionDeliveries((current) => current.filter((delivery) =>
                  !restorations.some((item) => matchesOrderId(delivery, item.orderId))));
                setVisibleDeliveredIds((current) => {
                  const next = new Set(current);
                  restoredAliases.forEach((id) => next.delete(id));
                  return next;
                });
                setPendingSyncCount(pending.length);
                setAttentionCount(0);
                refresh?.();
              }}>Restore confirmed</button>
            </>
          )}
        </div>
      )}
      {activeView === "active" ? (
        <KitchenBoard
          {...lanes}
          updateStatus={updateStatus}
          surface="waiter"
          godModeEnabled={godModeEnabled}
        />
      ) : (
        <div className="ops-order-history">
          <label className="ops-search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search old orders" /></label>
          {filteredHistory.length ? filteredHistory.map((order) => (
            <OrderCard
              key={orderKey(order)}
              order={order}
              onTap={(o) => setHistoryDetailOrder(o)}
              onLongPress={openHistoryActions}
            />
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
          hotel={hotel}
          onClose={closeHistoryDetails}
        />
      )}

      {bulkSnapshotIds && (
        <div className="ops-sheet-backdrop" onClick={closeBulkConfirmation}>
          <section ref={bulkDialogRef} tabIndex={-1} className="ops-action-sheet" role="dialog" aria-modal="true" aria-labelledby="deliver-all-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="deliver-all-title">Deliver {revalidatedBulkIds.length} ready {revalidatedBulkIds.length === 1 ? "order" : "orders"}?</h2>
            <p>{bulkLocations} {bulkLocations === 1 ? "location" : "locations"} will move to History now. Each order will synchronize separately.</p>
            {revalidatedBulkIds.length !== bulkSnapshotIds.length && (
              <p role="status">Ready count changed from {bulkSnapshotIds.length} to {revalidatedBulkIds.length}. Only orders still Ready will be delivered.</p>
            )}
            <div className="ops-action-sheet__actions">
              <button type="button" onClick={deliverBulkSnapshot} disabled={!revalidatedBulkIds.length || bulkSubmitting}>
                {bulkSubmitting ? "Saving…" : `Confirm delivery of ${revalidatedBulkIds.length}`}
              </button>
            </div>
            <button type="button" className="ops-sheet-cancel" onClick={closeBulkConfirmation} disabled={bulkSubmitting}>Keep orders Ready</button>
          </section>
        </div>
      )}
    </section>
  );
}

const formatMoney = (value) => Number.isFinite(Number(value))
  && value !== null && value !== ""
  ? `₹${Number(value).toFixed(2)}`
  : "—";

const formatDateTime = (value) => value
  ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
  : "—";

function OrderHistoryDetails({ dialogRef, order, hotel, onClose }) {
  const receipt = buildOrderReceipt(order, hotel);
  const { subtotal, subtotalLabel, discount, gstRate, gstAmount, total, note: financialNote } = receipt.financials;
  const note = order.note || order.notes || order.specialInstructions || order.instructions;
  const cancellationReason = order.cancelReason || order.cancellationReason ||
    (order.status === "cancelled" ? order.pauseReason : "");
  const contact = receipt.order.contact;
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
        <section><h3>Items</h3>{receipt.items.map((item, index) => <div className="ops-history-item" key={`${item.key}-${index}`}><span>{item.quantity} × {item.name}</span><b>{formatMoney(item.lineTotal)}</b></div>)}</section>
        {note && <section className="ops-history-note"><h3>Instructions</h3><p>{note}</p></section>}
        {cancellationReason && <section className="ops-history-note"><h3>Cancellation reason</h3><p>{cancellationReason}</p></section>}
        <section><h3>Amount</h3><div className="ops-history-money"><span>{subtotalLabel} <b>{formatMoney(subtotal)}</b></span>{Number(discount) > 0 && <span>Discount recorded <b>− {formatMoney(discount)}</b></span>}{Number(gstAmount) > 0 && <span>{Number(gstRate) > 0 ? `GST (${gstRate}%)` : "GST recorded"} <b>{formatMoney(gstAmount)}</b></span>}<span className="is-total">Total <b>{formatMoney(total)}</b></span></div>{financialNote && <p className="ops-history-financial-note">{financialNote}</p>}</section>
        {order.status === "delivered" && <OrderReceiptActions order={order} hotel={hotel} />}
        <section><h3>Timing</h3><ol className="ops-history-timeline">{timeline.map(([label, value]) => <li key={`${label}-${value}`}><span>{label}</span><time>{formatDateTime(value)}</time></li>)}</ol></section>
        <button type="button" className="ops-sheet-cancel" onClick={onClose}>Close</button>
      </section>
    </div>
  );
}
