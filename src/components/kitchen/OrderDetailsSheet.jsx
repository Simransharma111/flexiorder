import { useRef, useState } from "react";
import { FiAlertTriangle, FiClock, FiX } from "react-icons/fi";
import { orderLocation, statusLane, waitingMinutes } from "../../utils/orderModel";
import { operationalOrderTotal } from "../orders/OperationalOrderCard";
import useDialogFocus from "../../hooks/useDialogFocus";

const STATUS_TITLE = {
  new: "New order",
  preparing: "Preparing",
  ready: "Ready",
  paused: "Paused",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const qty = (item) => {
  const value = Number(item?.quantity);
  return Number.isFinite(value) && value > 0 ? value : item?.quantity ? 0 : 1;
};

const lineTotal = (item) => {
  const unit = Number(item?.finalPrice ?? item?.price);
  if (!Number.isFinite(unit)) return null;
  return unit * qty(item);
};

const money = (value) => `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const orderNotes = (order) => [...new Set(
  [order?.note, order?.notes, order?.specialInstructions, order?.instructions]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
)];

export default function OrderDetailsSheet({ group, surface = "kitchen", onClose }) {
  const sheetRef = useRef(null);
  const orders = group?.orders || [];
  const lead = orders[0];
  const location = group?.location || orderLocation(lead);
  const lane = statusLane(lead?.status);
  const oldest = orders.reduce((max, current) => (
    waitingMinutes(current) > waitingMinutes(max) ? current : max
  ), lead || {});
  const grandTotal = orders.reduce((sum, order) => sum + operationalOrderTotal(order), 0);
  const notes = [...new Set(orders.flatMap(orderNotes))];
  useDialogFocus(Boolean(group), sheetRef, onClose);

  return (
    <div className="ops-sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        ref={sheetRef}
        tabIndex={-1}
        className="ops-action-sheet ops-order-details"
        role="dialog"
        aria-modal="true"
        aria-label={`Order details for ${location}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ops-order-details__head">
          <div>
            <h2>{location}</h2>
            <p>{STATUS_TITLE[lane] || lead?.status || "Order"}</p>
          </div>
          <button type="button" className="ops-icon-button" aria-label="Close order details" onClick={onClose}>
            <FiX aria-hidden="true" />
          </button>
        </header>

        <div className="ops-order-details__meta">
          {lead?.guestName && lead.guestName !== "Guest" && <span>{lead.guestName}</span>}
          {orders.length > 1 && <span>{orders.length} orders</span>}
          <span><FiClock aria-hidden="true" /> {waitingMinutes(oldest)} min</span>
          {lead?.orderNumber && <span>#{String(lead.orderNumber).replace(/^order\s*#?\s*/i, "")}</span>}
        </div>

        <div className="ops-order-details__blocks">
          {orders.map((order, orderIndex) => {
            const items = (Array.isArray(order?.items) ? order.items : []).filter((item) => qty(item) > 0);
            const boundary = order?._id || order?.orderNumber || `order-${orderIndex}`;
            return (
              <section className="ops-order-details__block" key={boundary} aria-label={orders.length > 1 ? `Order ${orderIndex + 1}` : "Items"}>
                {orders.length > 1 && <strong className="ops-order-details__block-title">Order {orderIndex + 1}</strong>}
                {items.map((item, itemIndex) => {
                  const line = lineTotal(item);
                  return (
                    <div className="ops-order-details__row" key={`${boundary}-${item.menuId || item._id || item.name}-${itemIndex}`}>
                      <span className="ops-order-details__qty">{qty(item)} ×</span>
                      <span className="ops-order-details__name">{item.name || item.menu?.name || "Dish"}</span>
                      {line !== null && <span className="ops-order-details__price">{money(line)}</span>}
                    </div>
                  );
                })}
                {!items.length && (
                  <p className="ops-order-details__empty" role="alert">No items — review this order.</p>
                )}
              </section>
            );
          })}
        </div>

        {notes.map((note) => (
          <div className="ops-order-details__note" key={note}>
            <FiAlertTriangle aria-hidden="true" />
            <span>{note}</span>
          </div>
        ))}

        <footer className="ops-order-details__foot">
          <span>Total</span>
          <strong className="ops-order-details__total">{money(grandTotal)}</strong>
        </footer>

        <button type="button" className="ops-sheet-cancel" onClick={onClose}>Close</button>
      </section>
    </div>
  );
}
