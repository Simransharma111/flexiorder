import { useEffect, useRef } from "react";
import { FiAlertTriangle, FiClock, FiMoreVertical } from "react-icons/fi";
import {
  isDelayedOrder,
  itemCount,
  orderKey,
  orderLocation,
  statusLane,
  waitingMinutes,
} from "../../utils/orderModel";

const STATUS_LABEL = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  paused: "Paused",
  history: "Completed",
};

const getNote = (order) =>
  order?.note || order?.notes || order?.specialInstructions || order?.instructions || "";

export default function OperationalOrderCard({
  order,
  group,
  surface = "kitchen",
  onPrimary,
  onOptions,
  compact = false,
}) {
  const orders = group?.orders || [order];
  const lead = order || orders[0];
  const items = group?.items || lead?.items || [];
  const location = group?.location || orderLocation(lead);
  const lane = statusLane(lead?.status);
  const delayed = orders.some((item) => isDelayedOrder(item));
  const updated = orders.some((item) => item?.isUpdated || item?.updatedByGuest || item?.hasEdits);
  const notes = [...new Set(orders.map(getNote).filter(Boolean))];
  const pressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const waitingToSync = orders.some((item) => item?.pendingSync);
  const interactive = Boolean(onPrimary) && !waitingToSync;
  const oldest = orders.reduce((oldestOrder, currentOrder) => (
    waitingMinutes(currentOrder) > waitingMinutes(oldestOrder) ? currentOrder : oldestOrder
  ), lead);

  const clearPress = () => {
    window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const startPress = () => {
    if (!onOptions) return;
    longPressTriggered.current = false;
    clearPress();
    pressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      onOptions(lead, orders);
    }, 550);
  };

  const activate = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (interactive) onPrimary(lead, orders);
  };

  useEffect(() => () => clearPress(), []);

  const actionName = lane === "new"
    ? "Accept"
    : lane === "preparing"
      ? "Finish"
      : lane === "ready" && surface === "waiter"
        ? "Deliver"
        : "Ready for pickup";

  return (
    <article
      className={`ops-order-card ops-order-card--${lane}${delayed ? " is-delayed" : ""}${updated ? " is-updated" : ""}${compact ? " is-compact" : ""}`}
      onPointerDown={startPress}
      onPointerUp={clearPress}
      onPointerLeave={clearPress}
      onPointerCancel={clearPress}
      onContextMenu={(event) => {
        event.preventDefault();
        onOptions?.(lead, orders);
      }}
    >
      {interactive && (
        <button
          type="button"
          className="ops-order-card__primary-action"
          aria-label={`${actionName} ${location} order. ${items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} items.`}
          onClick={activate}
          onKeyDown={(event) => {
            if (event.key === "F10" && event.shiftKey) {
              event.preventDefault();
              onOptions?.(lead, orders);
            }
          }}
        />
      )}
      <div className="ops-order-card__head">
        <div className="ops-order-card__identity">
          <strong>{location}</strong>
          {orders.length > 1 && <span>{orders.length} orders</span>}
        </div>
        <div className="ops-order-card__signals">
          <span className="ops-order-card__status">{STATUS_LABEL[lane]}</span>
          {waitingToSync && <span className="ops-order-card__updated">Syncing</span>}
          {updated && <span className="ops-order-card__updated">Updated</span>}
          {onOptions && (
            <button
              type="button"
              className="ops-icon-button"
              aria-label={`More actions for ${location}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOptions(lead, orders);
              }}
            >
              <FiMoreVertical />
            </button>
          )}
        </div>
      </div>

      <div className="ops-order-card__meta">
        <span><FiClock /> {waitingMinutes(oldest)} min</span>
        <span>{items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} items</span>
        {delayed && <span className="ops-order-card__delay"><FiAlertTriangle /> Delayed</span>}
      </div>

      {(!compact || lane === "new") && (
        <div className="ops-order-card__items">
          {items.map((item, index) => (
            <div key={`${orderKey(lead)}-${item.menuId || item._id || item.name}-${index}`}>
              <b>{Number(item.quantity || 1)} ×</b> {item.name || item.menu?.name || "Dish"}
            </div>
          ))}
        </div>
      )}

      {compact && lane !== "new" && (
        <p className="ops-order-card__summary">
          {itemCount({ items })} items
          {lane === "ready"
            ? surface === "waiter" ? " · Tap to deliver" : " · Ready for pickup"
            : waitingToSync ? " · Waiting to sync" : " · Tap to finish"}
        </p>
      )}

      {notes.map((note) => (
        <div className="ops-order-card__note" key={note}>
          <FiAlertTriangle aria-hidden="true" />
          <span>{note}</span>
        </div>
      ))}
    </article>
  );
}
