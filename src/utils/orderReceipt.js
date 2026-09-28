import { orderNumber } from "./orderNumber";
import { customerName } from "./orderCustomer";
import { renderReceiptPdf } from "./receiptPdfLayout";
import { readRestaurantBilling } from "./restaurantBilling";
import { orderLocation } from "./orderModel";

const finiteNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const firstNumber = (...values) => {
  for (const value of values) {
    const number = finiteNumber(value);
    if (number !== null) return number;
  }
  return null;
};

const closeEnough = (left, right) => (
  left !== null && right !== null && Math.abs(left - right) < 0.02
);

const receiptDate = (order) => order?.deliveredAt || order?.updatedAt ||
  order?.createdAt || order?.queuedAt || null;

export const normalizeReceiptContact = (value) => {
  const source = String(value || "").trim();
  if (!source) return null;
  const compact = source.replace(/[\s().-]/g, "");
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`;
  if (/^91[6-9]\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  return null;
};

const normalizeItems = (order) => (Array.isArray(order?.items) ? order.items : [])
  .map((item, index) => {
    const quantity = firstNumber(item?.quantity) ?? 1;
    const unitPrice = firstNumber(item?.finalPrice, item?.price);
    return {
      key: String(item?.menuId || item?._id || `${item?.name || "dish"}-${index}`),
      name: item?.name || item?.menu?.name || "Dish",
      quantity,
      unitPrice,
      lineTotal: unitPrice === null ? null : unitPrice * quantity,
    };
  })
  .filter((item) => item.quantity > 0);

const normalizeFinancials = (order, items) => {
  const lineSubtotal = items.length && items.every((item) => item.lineTotal !== null)
    ? items.reduce((sum, item) => sum + item.lineTotal, 0)
    : null;
  const explicitGross = firstNumber(order?.grossSubtotal, order?.originalSubtotal);
  const explicitNet = firstNumber(order?.netSubtotal);
  const recordedSubtotal = firstNumber(order?.subtotal);
  const discount = firstNumber(order?.discountAmount, order?.discount) ?? 0;
  const gstRate = firstNumber(order?.gstRate, order?.gstPercentage) ?? 0;
  const gstAmount = firstNumber(order?.gstAmount, order?.taxAmount) ?? 0;
  const explicitTotal = firstNumber(order?.totalAmount, order?.total);

  let subtotal = explicitGross ?? explicitNet ?? recordedSubtotal ?? lineSubtotal;
  let subtotalLabel = explicitGross !== null ? "Gross subtotal" : "Subtotal";
  let subtotalKind = explicitGross !== null ? "gross" : explicitNet !== null ? "net" : "unknown";

  if (explicitGross === null && explicitNet !== null) subtotalLabel = "Subtotal after discount";
  if (explicitGross === null && explicitNet === null && recordedSubtotal !== null && explicitTotal !== null) {
    if (closeEnough(recordedSubtotal - discount + gstAmount, explicitTotal)) {
      subtotalKind = "gross";
      subtotalLabel = "Gross subtotal";
    } else if (closeEnough(recordedSubtotal + gstAmount, explicitTotal)) {
      subtotalKind = "net";
      subtotalLabel = "Subtotal after discount";
    } else {
      subtotalLabel = "Recorded subtotal";
    }
  }

  if (explicitGross === null && explicitNet === null && recordedSubtotal === null && lineSubtotal !== null) {
    subtotal = lineSubtotal;
    subtotalKind = "unknown";
    subtotalLabel = "Item subtotal";
  }

  const total = explicitTotal ?? (subtotal === null
    ? null
    : subtotalKind === "gross"
      ? subtotal - discount + gstAmount
      : subtotalKind === "net" || discount === 0
        ? subtotal + gstAmount
        : null);
  const hasAmbiguousLegacySubtotal = discount > 0 && subtotalKind === "unknown";
  const expectedTotals = subtotal === null ? [] : subtotalKind === "gross"
    ? [subtotal - discount + gstAmount]
    : subtotalKind === "net" ? [subtotal + gstAmount]
      : [subtotal + gstAmount, subtotal - discount + gstAmount];
  const taxMismatch = gstAmount > 0 && explicitTotal !== null && expectedTotals.length > 0 &&
    !expectedTotals.some(expected => closeEnough(expected, explicitTotal));
  const taxNote = taxMismatch
    ? "The saved GST and subtotal do not match the saved total. Confirm this bill with the restaurant; the recorded amount has not been changed."
    : "";


  return {
    subtotal,
    subtotalLabel,
    discount,
    gstRate,
    gstAmount,
    taxMismatch,
    total,
    totalIsServerSnapshot: explicitTotal !== null,
    note: taxNote || (hasAmbiguousLegacySubtotal
      ? explicitTotal !== null
        ? "Legacy subtotal meaning is unavailable; the recorded total is shown without recalculating the discount."
        : "Legacy subtotal meaning is unavailable, so a total was not recalculated. Confirm the amount from the server record."
      : ""),
  };
};

export const buildOrderReceipt = (order, hotel = {}) => {
  const items = normalizeItems(order);
  let billing = { gstin: "" };
  let billingWarning = "";
  try { billing = readRestaurantBilling(hotel); }
  catch { billingWarning = "The saved restaurant GSTIN could not be read. Open Settings and save receipt details again before exporting."; }
  const rawContact = order?.guestContact || order?.guestPhone || order?.contact || order?.phone || "";
  const reference = orderNumber(order, hotel);
  return {
    title: "Order receipt",
    restaurant: {
      name: hotel?.name || hotel?.hotelName || "Restaurant",
      address: hotel?.address || hotel?.location || "",
      phone: hotel?.phone || hotel?.contact || "",
      email: hotel?.email || "",
      gstin: billing.gstin,
      billingWarning,
    },
    order: {
      reference,
      date: receiptDate(order),
      location: orderLocation(order),
      guestName: customerName(order),
      contact: rawContact,
      normalizedContact: normalizeReceiptContact(rawContact),
      instructions: order?.note || order?.notes || order?.specialInstructions || order?.instructions || "",
    },
    items,
    financials: normalizeFinancials(order, items),
  };
};

export const receiptFilename = (receipt) => {
  const safeReference = String(receipt?.order?.reference || "order")
    .replace(/[^\p{L}\p{M}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "order";
  return `order-receipt-${safeReference}.pdf`;
};

const money = (value) => finiteNumber(value) !== null
  ? `INR ${finiteNumber(value).toFixed(2)}`
  : "Not recorded";

const dateTime = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

export const receiptShareText = (receipt) => [
  `${receipt.restaurant.name} — Order receipt`,
  ...(receipt.restaurant.gstin ? [`GSTIN: ${receipt.restaurant.gstin}`] : []),
  `Order ${receipt.order.reference}`,
  ...(receipt.order.guestName ? [`Customer: ${receipt.order.guestName}`] : []),
  `${receipt.order.location} · ${dateTime(receipt.order.date)}`,
  ...receipt.items.map((item) => `${item.quantity} x ${item.name}`),
  `${receipt.financials.subtotalLabel}: ${money(receipt.financials.subtotal)}`,
  ...(receipt.financials.discount > 0 ? [`Discount recorded: ${money(receipt.financials.discount)}`] : []),
  ...(receipt.financials.gstAmount > 0 ? [`GST${receipt.financials.gstRate ? ` (${receipt.financials.gstRate}%)` : ""}: ${money(receipt.financials.gstAmount)}`] : []),
  `Total: ${money(receipt.financials.total)}`,
  ...(receipt.financials.note ? [receipt.financials.note] : []),
].join("\n");

export const createOrderReceiptPdf = (receipt) => renderReceiptPdf(receipt, { money, dateTime });

export const createOrderReceiptPdfBlob = (receipt) => createOrderReceiptPdf(receipt).output("blob");

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;",
}[character]));

export const receiptPrintHtml = (receipt) => {
  const restaurantContact = [
    receipt.restaurant.address,
    receipt.restaurant.phone,
    receipt.restaurant.email,
    receipt.restaurant.gstin ? `GSTIN: ${receipt.restaurant.gstin}` : "",
  ].filter(Boolean).map((value) => escapeHtml(value)).join("<br>");
  const guest = receipt.order.guestName
    ? `<br><b>Guest:</b> ${escapeHtml(receipt.order.guestName)}`
    : "";
  const gstLabel = receipt.financials.gstRate
    ? `GST (${escapeHtml(receipt.financials.gstRate)}%)`
    : "GST";

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(receiptFilename(receipt))}</title><style>
@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,"Noto Sans",sans-serif;max-width:760px;margin:32px auto;color:#172c2a;font-size:14px;line-height:1.5}header{border-top:4px solid #176756;padding-top:18px}.eyebrow{color:#176756;font-size:11px;letter-spacing:2px;font-weight:bold}h1{font-size:32px;margin:10px 0;overflow-wrap:anywhere}.contact{color:#61716c;margin:8px 0;overflow-wrap:anywhere}.meta{border-top:1px solid #dce5e0;margin:22px 0;padding-top:16px;overflow-wrap:anywhere}table{width:100%;table-layout:fixed;border-collapse:collapse}thead{display:table-header-group}th{text-align:left;background:#edf4f0;color:#176756;font-size:11px;padding:12px 8px}td{padding:13px 8px;border-bottom:1px solid #dce5e0;vertical-align:top;overflow-wrap:anywhere}th:not(:first-child),td:not(:first-child){text-align:right}tr{break-inside:avoid}.totals{margin:24px 0;break-inside:avoid}.totals div{display:flex;justify-content:space-between;gap:24px;padding:7px 12px}.total{background:#172c2a;color:white;font-size:20px;font-weight:bold;margin-top:10px;padding:16px 12px!important}.muted{color:#61716c;font-size:12px}.notes{white-space:pre-wrap;overflow-wrap:anywhere}footer{border-top:1px solid #dce5e0;padding-top:16px;margin-top:28px;break-inside:avoid}@media print{body{margin:0}button{display:none}th,.total{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body><header><div class="eyebrow">ORDER RECEIPT</div><h1>${escapeHtml(receipt.restaurant.name)}</h1>${restaurantContact ? `<p class="contact">${restaurantContact}</p>` : ""}</header><p class="meta"><b>Order:</b> ${escapeHtml(receipt.order.reference)}<br><b>Date:</b> ${escapeHtml(dateTime(receipt.order.date))}<br><b>Location:</b> ${escapeHtml(receipt.order.location)}${guest}</p><table><colgroup><col style="width:49%"><col style="width:9%"><col style="width:20%"><col style="width:22%"></colgroup><thead><tr><th>ITEM</th><th>QTY</th><th>RATE (INR)</th><th>AMOUNT (INR)</th></tr></thead><tbody>${receipt.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.quantity)}</td><td>${escapeHtml(money(item.unitPrice).replace(/^INR /, ""))}</td><td>${escapeHtml(money(item.lineTotal).replace(/^INR /, ""))}</td></tr>`).join("")}</tbody></table><div class="totals"><div><span>${escapeHtml(receipt.financials.subtotalLabel)}</span><b>${escapeHtml(money(receipt.financials.subtotal))}</b></div>${receipt.financials.discount > 0 ? `<div><span>Discount recorded</span><b>−${escapeHtml(money(receipt.financials.discount))}</b></div>` : ""}${receipt.financials.gstAmount > 0 ? `<div><span>${gstLabel}</span><b>${escapeHtml(money(receipt.financials.gstAmount))}</b></div>` : ""}<div class="total"><span>TOTAL</span><span>${escapeHtml(money(receipt.financials.total))}</span></div></div>${receipt.financials.note ? `<p class="muted">${escapeHtml(receipt.financials.note)}</p>` : ""}${receipt.order.instructions ? `<h3>Order notes</h3><p class="notes">${escapeHtml(receipt.order.instructions)}</p>` : ""}<footer><b>Thank you for dining with us.</b><p class="muted">Order receipt, not a GST tax invoice. Amounts reflect the saved order.</p><span class="muted">Prepared with FlexiOrder</span></footer><script>window.addEventListener('load',()=>window.print());</script></body></html>`;
};
