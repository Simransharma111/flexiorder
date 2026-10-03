import OrderReceiptActions from "./OrderReceiptActions";
import { buildOrderReceipt } from "../../utils/orderReceipt";
import { orderLocation } from "../../utils/orderModel";

const formatMoney = (value) => Number.isFinite(Number(value))
  && value !== null && value !== ""
  ? `₹${Number(value).toFixed(2)}`
  : "—";

const formatDateTime = (value) => value
  ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
  : "—";

export default function OrderHistoryDetails({ dialogRef, order, hotel, onClose }) {
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
        <header><div><h2>{orderLocation(order)}</h2><p>Order #{receipt.order.reference}</p></div><button type="button" className="ops-icon-button" aria-label="Close order details" onClick={onClose}>×</button></header>
        <dl className="ops-history-facts">
          <div><dt>Status</dt><dd>{order.status}</dd></div>
          <div><dt>Placed</dt><dd>{formatDateTime(order.createdAt || order.queuedAt)}</dd></div>
          {receipt.order.guestName && <div><dt>Customer</dt><dd>{receipt.order.guestName}</dd></div>}
          {contact && <div><dt>Contact</dt><dd>{contact}</dd></div>}
        </dl>
        <section><h3>Items</h3>{receipt.items.map((item, index) => <div className="ops-history-item" key={`${item.key}-${index}`}><span>{item.quantity} × {item.name}</span><b>{formatMoney(item.lineTotal)}</b></div>)}</section>
        {note && <section className="ops-history-note"><h3>Instructions</h3><p>{note}</p></section>}
        {cancellationReason && <section className="ops-history-note"><h3>Cancellation reason</h3><p>{cancellationReason}</p></section>}
        <section><h3>Amount</h3><div className="ops-history-money"><span>{subtotalLabel} <b>{formatMoney(subtotal)}</b></span>{Number(discount) > 0 && <span>Discount recorded <b>− {formatMoney(discount)}</b></span>}{Number(gstAmount) > 0 && <span>{Number(gstRate) > 0 ? `GST (${gstRate}%)` : "GST"} <b>{formatMoney(gstAmount)}</b></span>}<span className="is-total">Total <b>{formatMoney(total)}</b></span></div>{financialNote && <p className="ops-history-financial-note">{financialNote}</p>}</section>
        {order.status === "delivered" && <OrderReceiptActions order={order} hotel={hotel} />}
        <section><h3>Timing</h3><ol className="ops-history-timeline">{timeline.map(([label, value]) => <li key={`${label}-${value}`}><span>{label}</span><time>{formatDateTime(value)}</time></li>)}</ol></section>
        <button type="button" className="ops-sheet-cancel" onClick={onClose}>Close</button>
      </section>
    </div>
  );
}
