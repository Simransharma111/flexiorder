import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiMoreVertical } from "react-icons/fi";
import OperationalOrderCard from "../orders/OperationalOrderCard";
import {
  groupOrdersByLocation,
  nextOrderStatus,
  orderKey,
  orderLocation,
} from "../../utils/orderModel";
import useDialogFocus from "../../hooks/useDialogFocus";

const LANE_META = [
  { key: "new", title: "🔥 NEW", empty: "No new orders" },
  { key: "preparing", title: "🔵 PREPARING", empty: "Nothing preparing" },
  { key: "ready", title: "🟢 READY", empty: "Nothing ready" },
];

const CANCELLATION_REASONS = [
  "Need modification",
  "Guest left",
  "Dish not available",
  "Other",
];

export default function KitchenBoard({
  newOrders = [],
  preparingOrders = [],
  readyOrders = [],
  pausedOrders = [],
  updateStatus,
  surface = "kitchen",
  godModeEnabled = false,
}) {
  const [actionGroup, setActionGroup] = useState(null);
  const [choosingCancellationReason, setChoosingCancellationReason] = useState(false);
  const sheetRef = useRef(null);
  const lastGodModeActivation = useRef(new Map());
  const actionDispatches = useRef(new Set());

  const groupForDisplay = useCallback((orders) => godModeEnabled
    ? orders.map((order) => ({
      key: `god-mode:${orderKey(order)}`,
      location: orderLocation(order),
      orders: [order],
      items: Array.isArray(order.items) ? order.items : [],
    }))
    : groupOrdersByLocation(orders), [godModeEnabled]);

  const lanes = useMemo(() => ({
    new: groupForDisplay(newOrders),
    preparing: groupForDisplay(preparingOrders),
    ready: groupForDisplay(readyOrders),
  }), [groupForDisplay, newOrders, preparingOrders, readyOrders]);

  const updateGroup = (orders, status, pauseReason = null) => {
    orders.forEach((order) => {
      updateStatus(order._id || orderKey(order), status, pauseReason);
    });
  };

  const primaryAction = (_lead, orders) => {
    orders
      .forEach((order) => {
        const key = orderKey(order);
        const next = nextOrderStatus(order.status, surface, { godModeEnabled });
        const now = Date.now();
        const previousActivation = lastGodModeActivation.current.get(key);
        if (godModeEnabled && previousActivation?.status === next &&
            now - previousActivation.at < 800) return;
        if (next) {
          if (godModeEnabled) {
            const activation = { at: now, status: next };
            lastGodModeActivation.current.set(key, activation);
            window.setTimeout(() => {
              if (lastGodModeActivation.current.get(key) === activation) {
                lastGodModeActivation.current.delete(key);
              }
            }, 800);
          }
          updateStatus(order._id || orderKey(order), next, null);
        }
      });
  };

  const closeActions = useCallback(() => {
    setActionGroup(null);
    setChoosingCancellationReason(false);
  }, []);

  const runAction = (status, cancellationReason = null) => {
    if (!actionGroup) return;
    const signature = `${actionGroup.orders.map((order) => orderKey(order)).sort().join("|")}:${status}:${cancellationReason || ""}`;
    if (actionDispatches.current.has(signature)) return;
    actionDispatches.current.add(signature);
    updateGroup(actionGroup.orders, status, cancellationReason);
    closeActions();
    window.setTimeout(() => actionDispatches.current.delete(signature), 800);
  };

  useDialogFocus(Boolean(actionGroup), sheetRef, closeActions);

  useEffect(() => {
    if (!actionGroup) return;
    const currentOrders = [...newOrders, ...preparingOrders, ...readyOrders, ...pausedOrders];
    const isCurrent = actionGroup.orders.every((selected) => currentOrders.some(
      (order) => order._id === selected._id && order.status === selected.status
    ));
    if (!isCurrent) closeActions();
  }, [actionGroup, closeActions, newOrders, pausedOrders, preparingOrders, readyOrders]);

  return (
    <section className={`ops-board ops-board--${surface}${godModeEnabled ? " is-god-mode" : ""}`} aria-label={`${surface} active orders`}>
      {LANE_META.map((lane) => (
        <section
          className={`ops-lane ops-lane--${lane.key}${surface === "waiter" && lane.key === "ready" ? " ops-lane--waiter-delivery" : ""}`}
          key={lane.key}
          aria-label={surface === "waiter" && lane.key === "ready" ? "Ready orders awaiting delivery" : undefined}
        >
          <header className="ops-lane__head">
            <h2>{lane.title}</h2>
            <span className={`ops-lane__count${lane.key === "new" && lanes.new.length ? " is-live" : ""}`}>
              {lanes[lane.key]?.length ?? 0}
            </span>
          </header>
          <div className="ops-lane__cards">
            {(lanes[lane.key] || []).map((group) => (
              <OperationalOrderCard
                key={group.key}
                group={group}
                surface={surface}
                compact={godModeEnabled
                  ? surface === "kitchen" && lane.key === "ready"
                  : surface === "kitchen"
                    ? false
                    : lane.key !== "new" && !(surface === "waiter" && lane.key === "ready")}
                godModeEnabled={godModeEnabled}
              onPrimary={
                // Kitchen: suppress primary tap on ready (no further kitchen action).
                // Waiter: ready cards deliver on tap; all other lanes advance normally.
                (lane.key === "ready" && surface === "kitchen")
                  ? undefined
                  : primaryAction
              }
                onOptions={(_lead, orders) => setActionGroup({ ...group, orders })}
              />
            ))}
            {!lanes[lane.key]?.length && <p className="ops-lane__empty">{lane.empty}</p>}
          </div>
        </section>
      ))}

      {pausedOrders.length > 0 && (
        <div className="ops-paused-groups" aria-label="Paused orders">
          {groupForDisplay(pausedOrders).map((group) => (
            <div className="ops-paused-group" key={group.key}>
              <button
                type="button"
                className="ops-paused-strip"
                aria-label={`Resume preparing ${group.location} ${group.orders.length > 1 ? "orders" : "order"}`}
                onClick={() => updateGroup(group.orders, "preparing")}
              >
                {group.location} · {group.orders.length} paused · Tap to resume
              </button>
              <button
                type="button"
                className="ops-paused-options"
                aria-label={`More actions for paused ${group.location}`}
                onClick={() => setActionGroup(group)}
              >
                <FiMoreVertical aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {actionGroup && (
        <div className="ops-sheet-backdrop" role="presentation" onClick={closeActions}>
          <section ref={sheetRef} tabIndex={-1} className="ops-action-sheet" role="dialog" aria-modal="true" aria-label={`Actions for ${actionGroup.location}`} onClick={(event) => event.stopPropagation()}>
            <div>
              <h2>{actionGroup.location}</h2>
              <p>Choose an action for {actionGroup.orders.length > 1 ? "these orders" : "this order"}.</p>
            </div>
            {choosingCancellationReason ? (
              <div className="ops-cancellation-reasons" role="group" aria-label="Cancellation reason">
                {CANCELLATION_REASONS.map((reason) => (
                  <button type="button" className="is-danger" key={reason} onClick={() => runAction("cancelled", reason)}>
                    {reason}
                  </button>
                ))}
              </div>
            ) : (
              <div className="ops-action-sheet__actions">
                {actionGroup.orders[0]?.status === "paused" ? (
                  <button type="button" onClick={() => runAction("preparing")}>Resume preparing</button>
                ) : (
                  <button type="button" onClick={() => runAction("paused")}>Pause</button>
                )}
                {surface === "waiter" && (
                  <button type="button" onClick={() => runAction("delivered")}>Mark delivered</button>
                )}
                <button type="button" className="is-danger" onClick={() => setChoosingCancellationReason(true)}>Cancel order</button>
              </div>
            )}
            <button type="button" className="ops-sheet-cancel" onClick={choosingCancellationReason ? () => setChoosingCancellationReason(false) : closeActions}>
              {choosingCancellationReason ? "Back" : "Close"}
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
