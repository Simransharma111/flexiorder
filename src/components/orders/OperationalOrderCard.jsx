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
  delivered: "Delivered",
  history: "Completed",
};

const getNote = (order) =>
  order?.note || order?.notes || order?.specialInstructions || order?.instructions || "";

const getOrderNotes = (order) => [...new Set(
  [order?.note, order?.notes, order?.specialInstructions, order?.instructions]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
)];

const itemQuantity = (item) => {
  if (item?.quantity === undefined || item?.quantity === null || item?.quantity === "") return 1;
  const quantity = Number(item?.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
};

const countItems = (items = []) => items.reduce(
  (total, item) => total + itemQuantity(item),
  0,
);

const orderTimingLabel = (order) => {
  const type = String(order?.orderType || order?.type || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  const scheduled = order?.scheduledFor || order?.scheduledAt;
  if (!["schedule", "scheduled"].includes(type) && !scheduled) return "Immediate";

  const date = new Date(scheduled);
  if (!scheduled || Number.isNaN(date.getTime())) return "Scheduled";
  return `Scheduled · ${date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const orderReference = (order) => {
  const value = String(
    order?.orderNumber || order?.reference || orderKey(order) || "—"
  ).trim();
  return value.replace(/^order\s*#?\s*/i, "") || "—";
};

export default function OperationalOrderCard({
  order,
  group,
  surface = "kitchen",
  onPrimary,
  onOptions,
  compact = false,
  godModeEnabled = false,
}) {
  const orders = group?.orders || [order];
  const lead = order || orders[0];
  const items = group?.items || lead?.items || [];
  const location = group?.location || orderLocation(lead);
  const lane = statusLane(lead?.status);
  const delayed = orders.some((item) => isDelayedOrder(item));
  const updated = orders.some((item) => item?.isUpdated || item?.updatedByGuest || item?.hasEdits);
  const notes = [...new Set(orders.map(getNote).filter(Boolean))];
  const totalItems = countItems(items);
  const pressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const waitingToSync = orders.some((item) => item?.pendingSync || item?.pendingMutation);
  const interactive = Boolean(onPrimary);
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

  const actionName = godModeEnabled && ["new", "preparing"].includes(lane)
    ? "Mark ready"
    : lane === "new"
    ? "Accept"
    : lane === "preparing"
      ? "Finish"
      : lane === "ready" && surface === "waiter"
        ? "Deliver"
        : "Ready for pickup";

  const calculatedTotal = items.reduce(
    (sum, item) => sum + Number(item.price || item.finalPrice || 0) * Number(item.quantity || 1),
    0
  );

  return (
    <article
      className={`ops-order-card ops-order-card--${lane}${delayed ? " is-delayed" : ""}${updated ? " is-updated" : ""}${compact ? " is-compact" : ""}${godModeEnabled ? " is-god-mode" : ""}`}
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
          aria-label={`${actionName} ${location} order. ${totalItems} items.`}
          onClick={activate}
          onKeyDown={(event) => {
            if (event.key === "F10" && event.shiftKey) {
              event.preventDefault();
              onOptions?.(lead, orders);
            }
          }}
        />
      )}
      {lane === "new" && (
        <div className="ops-order-card__new-banner">
          <strong>NEW ORDER</strong>
          <span>{orders.length > 1
            ? `${orders.length} separate orders`
            : interactive && !godModeEnabled ? "Tap card to prepare" : "1 order"}</span>
        </div>
      )}
      <div className="ops-order-card__head">
        <div className="ops-order-card__identity">
          <strong>{location}</strong>
          {godModeEnabled && (
            <span className="ops-order-card__reference">
              Order #{orderReference(lead)}
            </span>
          )}
          {lead.guestName && lead.guestName !== "Guest" && (
            <span className="ops-order-card__guest-label">{lead.guestName}</span>
          )}
          {orders.length > 1 && <span>{orders.length} orders</span>}
        </div>
        <div className="ops-order-card__signals">
          {lane !== "new" && (
            <span className="ops-order-card__status">
              {STATUS_LABEL[lane]} {interactive && !godModeEnabled && " →"}
            </span>
          )}
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
        <span><FiClock /> {lane === "new" ? "Received " : ""}{waitingMinutes(oldest)} min{lane === "new" ? " ago" : ""}</span>
        {lane === "new" && orders.length === 1 && <span>{orderTimingLabel(lead)}</span>}
        <span>{totalItems} {totalItems === 1 ? "item" : "items"}</span>
        {calculatedTotal > 0 && <span className="ops-order-card__price-badge">₹{calculatedTotal}</span>}
        {delayed && <span className="ops-order-card__delay"><FiAlertTriangle /> Delayed</span>}
      </div>

      {lane === "new" && (
        <div className="ops-order-card__order-blocks">
          {orders.map((currentOrder, orderIndex) => {
            const orderItems = Array.isArray(currentOrder?.items) ? currentOrder.items : [];
            const visibleOrderItems = orderItems.filter((item) => itemQuantity(item) > 0);
            const orderNotes = getOrderNotes(currentOrder);
            const orderItemTotal = countItems(orderItems);
            const boundaryBase = orderKey(currentOrder) || currentOrder?.createdAt || currentOrder?.queuedAt || location;
            const boundaryKey = `${boundaryBase}-${orderIndex}`;

            return (
              <section
                className="ops-order-card__order-block"
                aria-label={orders.length > 1 ? `Order ${orderIndex + 1}` : "Order items"}
                key={boundaryKey}
              >
                {orders.length > 1 && (
                  <header className="ops-order-card__order-head">
                    <strong>Order {orderIndex + 1}</strong>
                    <span>{orderTimingLabel(currentOrder)}</span>
                    <span>{orderItemTotal} {orderItemTotal === 1 ? "item" : "items"}</span>
                  </header>
                )}
                {currentOrder?.guestName && currentOrder.guestName !== "Guest" && orders.length > 1 && (
                  <span className="ops-order-card__order-guest">{currentOrder.guestName}</span>
                )}
                <div className="ops-order-card__items">
                  {visibleOrderItems.map((item, itemIndex) => (
                    <div className="ops-order-card__item-row" key={`${boundaryKey}-${item.menuId || item._id || item.name}-${itemIndex}`}>
                      <b>{itemQuantity(item)} ×</b>
                      <span>{item.name || item.menu?.name || "Dish"}</span>
                    </div>
                  ))}
                  {!visibleOrderItems.length && (
                    <p className="ops-order-card__empty-items" role="alert">No items — review order</p>
                  )}
                </div>
                {orderNotes.map((note, noteIndex) => (
                  <div className="ops-order-card__note" key={`${boundaryKey}-note-${noteIndex}`}>
                    <FiAlertTriangle aria-hidden="true" />
                    <span>{note}</span>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}

      {!compact && lane !== "new" && (
        <div className="ops-order-card__items">
          {items.filter((item) => itemQuantity(item) > 0).map((item, index) => (
            <div className="ops-order-card__item-row" key={`${orderKey(lead)}-${item.menuId || item._id || item.name}-${index}`}>
              <b>{itemQuantity(item)} ×</b>
              <span>{item.name || item.menu?.name || "Dish"}</span>
            </div>
          ))}
        </div>
      )}

      {compact && lane !== "new" && (
        <p className="ops-order-card__summary">
          {itemCount({ items })} items
          {lane === "delivered"
            ? " · Delivered"
            : lane === "ready"
              ? surface === "waiter" && !godModeEnabled ? " · Tap to deliver" : " · Ready for pickup"
              : godModeEnabled ? ` · ${STATUS_LABEL[lane]}` : " · Tap to finish"}
        </p>
      )}

      {lane !== "new" && notes.map((note) => (
        <div className="ops-order-card__note" key={note}>
          <FiAlertTriangle aria-hidden="true" />
          <span>{note}</span>
        </div>
      ))}

    </article>
  );
}
