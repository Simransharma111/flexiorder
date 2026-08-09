import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OperationalOrderCard from "../orders/OperationalOrderCard";
import { groupOrdersByLocation, nextOrderStatus } from "../../utils/orderModel";
import useDialogFocus from "../../hooks/useDialogFocus";

const LANE_META = [
  { key: "new", title: "🔥 NEW", empty: "No new orders" },
  { key: "preparing", title: "🔵 PREPARING", empty: "Nothing preparing" },
  { key: "ready", title: "🟢 READY", empty: "Nothing ready" },
];

export default function KitchenBoard({
  newOrders = [],
  preparingOrders = [],
  readyOrders = [],
  pausedOrders = [],
  updateStatus,
  surface = "kitchen",
}) {
  const [actionGroup, setActionGroup] = useState(null);
  const [reason, setReason] = useState("");
  const sheetRef = useRef(null);

  const lanes = useMemo(() => ({
    new: groupOrdersByLocation(newOrders),
    preparing: groupOrdersByLocation(preparingOrders),
    ready: groupOrdersByLocation(readyOrders),
  }), [newOrders, preparingOrders, readyOrders]);

  const updateGroup = async (orders, status, pauseReason = null) => {
    for (const order of orders) {
      await updateStatus(order._id, status, pauseReason);
    }
  };

  const primaryAction = async (_lead, orders) => {
    for (const order of orders) {
      if (order.pendingSync) continue;
      const next = nextOrderStatus(order.status, surface);
      if (next) await updateStatus(order._id, next, null);
    }
  };

  const closeActions = useCallback(() => {
    setActionGroup(null);
    setReason("");
  }, []);

  const runAction = async (status) => {
    if (!actionGroup || actionGroup.orders.some((order) => order.pendingSync)) return;
    await updateGroup(actionGroup.orders, status, reason.trim() || null);
    closeActions();
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
    <section className={`ops-board ops-board--${surface}`} aria-label={`${surface} active orders`}>
      {LANE_META.map((lane) => (
        <section className={`ops-lane ops-lane--${lane.key}`} key={lane.key}>
          <header className="ops-lane__head">
            <h2>{lane.title}</h2>
            <span className={`ops-lane__count${lane.key === "new" && lanes.new.length ? " is-live" : ""}`}>
              {lanes[lane.key].length}
            </span>
          </header>
          <div className="ops-lane__cards">
            {lanes[lane.key].map((group) => (
              <OperationalOrderCard
                key={group.key}
                group={group}
                surface={surface}
                compact={lane.key !== "new"}
                onPrimary={(lane.key === "ready" && surface === "kitchen") || group.orders.every((order) => order.status === "delivered") ? undefined : primaryAction}
                onOptions={(_lead, orders) => setActionGroup({ ...group, orders })}
              />
            ))}
            {!lanes[lane.key].length && <p className="ops-lane__empty">{lane.empty}</p>}
          </div>
        </section>
      ))}

      {pausedOrders.length > 0 && (
        <div className="ops-paused-groups" aria-label="Paused orders">
          {groupOrdersByLocation(pausedOrders).map((group) => (
            <button type="button" className="ops-paused-strip" key={group.key} onClick={() => setActionGroup(group)}>
              {group.location} · {group.orders.length} paused · Review
            </button>
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
            {actionGroup.orders.some((order) => order.pendingSync) ? (
              <p>This order is saved on this device. Actions unlock after it syncs.</p>
            ) : <><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason or note (optional)" />
            <div className="ops-action-sheet__actions">
              {actionGroup.orders[0]?.status === "paused" ? (
                <button type="button" onClick={() => runAction("preparing")}>Resume preparing</button>
              ) : (
                <button type="button" onClick={() => runAction("paused")}>Pause</button>
              )}
              {surface === "waiter" && actionGroup.orders[0]?.status !== "delivered" && (
                <button type="button" onClick={() => runAction("delivered")}>Mark delivered</button>
              )}
              <button type="button" className="is-danger" onClick={() => runAction("cancelled")}>Cancel order</button>
            </div></>}
            <button type="button" className="ops-sheet-cancel" onClick={closeActions}>Close</button>
          </section>
        </div>
      )}
    </section>
  );
}
