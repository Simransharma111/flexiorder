import { jsPDF } from "jspdf";
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

  return {
    subtotal,
    subtotalLabel,
    discount,
    gstRate,
    gstAmount,
    total,
    totalIsServerSnapshot: explicitTotal !== null,
    note: hasAmbiguousLegacySubtotal
      ? explicitTotal !== null
        ? "Legacy subtotal meaning is unavailable; the recorded total is shown without recalculating the discount."
        : "Legacy subtotal meaning is unavailable, so a total was not recalculated. Confirm the amount from the server record."
      : "",
  };
};

export const buildOrderReceipt = (order, hotel = {}) => {
  const items = normalizeItems(order);
  const rawContact = order?.guestContact || order?.guestPhone || order?.contact || order?.phone || "";
  const reference = String(order?.orderNumber || order?._id || order?.clientOrderId || "Order");
  return {
    title: "Order receipt",
    restaurant: {
      name: hotel?.name || hotel?.hotelName || "Restaurant",
      address: hotel?.address || hotel?.location || "",
      phone: hotel?.phone || hotel?.contact || "",
      email: hotel?.email || "",
    },
    order: {
      reference,
      date: receiptDate(order),
      location: orderLocation(order),
      guestName: order?.guestName || order?.customerName || "",
      contact: rawContact,
      normalizedContact: normalizeReceiptContact(rawContact),
      paymentMethod: order?.paymentMethod || order?.payment?.method || "",
      paymentStatus: order?.paymentStatus || order?.payment?.status || "",
      instructions: order?.note || order?.notes || order?.specialInstructions || order?.instructions || "",
    },
    items,
    financials: normalizeFinancials(order, items),
  };
};

export const receiptFilename = (receipt) => {
  const safeReference = String(receipt?.order?.reference || "order")
    .replace(/[^a-z0-9_-]+/gi, "-")
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
  `Order ${receipt.order.reference}`,
  `${receipt.order.location} · ${dateTime(receipt.order.date)}`,
  ...receipt.items.map((item) => `${item.quantity} x ${item.name}`),
  `Total: ${money(receipt.financials.total)}`,
].join("\n");

export const createOrderReceiptPdf = (receipt) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 1240;
  const pageHeight = 1754;
  const margin = 94;
  const printableWidth = pageWidth - margin * 2;
  let canvas;
  let context;
  let y;
  let pages = 0;
  const startPage = () => {
    canvas = document.createElement("canvas");
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageWidth, pageHeight);
    context.fillStyle = "#17201d";
    context.textBaseline = "top";
    y = margin;
  };
  const commitPage = () => {
    if (pages > 0) doc.addPage();
    doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    pages += 1;
    startPage();
  };
  const wrapLine = (text) => {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= printableWidth) {
        line = candidate;
        return;
      }
      if (line) lines.push(line);
      if (context.measureText(word).width <= printableWidth) {
        line = word;
        return;
      }
      let segment = "";
      [...word].forEach((character) => {
        if (segment && context.measureText(segment + character).width > printableWidth) {
          lines.push(segment);
          segment = character;
        } else {
          segment += character;
        }
      });
      line = segment;
    });
    if (line) lines.push(line);
    return lines;
  };
  const write = (text, { size = 10, bold = false, gap = 6 } = {}) => {
    const fontSize = Math.max(24, size * 3);
    const lineHeight = Math.max(fontSize * 1.35, gap * 3);
    context.font = `${bold ? 700 : 400} ${fontSize}px Arial, "Noto Sans", sans-serif`;
    wrapLine(text).forEach((line) => {
      if (y + lineHeight > pageHeight - margin) commitPage();
      context.fillText(line, margin, y);
      y += lineHeight;
    });
  };

  startPage();
  write(receipt.title, { size: 18, bold: true, gap: 8 });
  write(receipt.restaurant.name, { size: 13, bold: true });
  [receipt.restaurant.address, receipt.restaurant.phone, receipt.restaurant.email]
    .filter(Boolean).forEach((line) => write(line, { size: 9, gap: 5 }));
  y += 12;
  write(`Order: ${receipt.order.reference}`, { bold: true });
  write(`Date: ${dateTime(receipt.order.date)}`);
  write(`Location: ${receipt.order.location}`);
  if (receipt.order.guestName) write(`Guest: ${receipt.order.guestName}`);
  if (receipt.order.paymentMethod || receipt.order.paymentStatus) {
    write(`Payment: ${[receipt.order.paymentMethod, receipt.order.paymentStatus].filter(Boolean).join(" · ")}`);
  }
  y += 12;
  write("Items", { size: 12, bold: true });
  receipt.items.forEach((item) => write(
    `${item.quantity} x ${item.name}${item.lineTotal === null ? "" : `  ${money(item.lineTotal)}`}`
  ));
  if (receipt.order.instructions) {
    y += 8;
    write("Instructions", { size: 12, bold: true });
    write(receipt.order.instructions);
  }
  y += 12;
  write(`${receipt.financials.subtotalLabel}: ${money(receipt.financials.subtotal)}`);
  if (receipt.financials.discount > 0) write(`Discount recorded: -${money(receipt.financials.discount)}`);
  if (receipt.financials.gstAmount > 0) {
    write(`${receipt.financials.gstRate ? `GST (${receipt.financials.gstRate}%)` : "GST recorded"}: ${money(receipt.financials.gstAmount)}`);
  }
  write(`Total: ${money(receipt.financials.total)}`, { size: 12, bold: true });
  if (receipt.financials.note) write(receipt.financials.note, { size: 8, gap: 4 });
  write("Generated from the delivered order record. This is an order receipt, not a GST tax invoice.", { size: 8, gap: 4 });
  commitPage();
  return doc;
};

export const createOrderReceiptPdfBlob = (receipt) => createOrderReceiptPdf(receipt).output("blob");

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;",
}[character]));

export const receiptPrintHtml = (receipt) => {
  const restaurantContact = [
    receipt.restaurant.address,
    receipt.restaurant.phone,
    receipt.restaurant.email,
  ].filter(Boolean).map((value) => escapeHtml(value)).join("<br>");
  const guest = receipt.order.guestName
    ? `<br><b>Guest:</b> ${escapeHtml(receipt.order.guestName)}`
    : "";
  const payment = receipt.order.paymentMethod || receipt.order.paymentStatus
    ? `<br><b>Payment:</b> ${escapeHtml([
      receipt.order.paymentMethod,
      receipt.order.paymentStatus,
    ].filter(Boolean).join(" · "))}`
    : "";
  const gstLabel = receipt.financials.gstRate
    ? `GST (${escapeHtml(receipt.financials.gstRate)}%)`
    : "GST recorded";

  return `<!doctype html><html><head><title>${escapeHtml(receiptFilename(receipt))}</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:24px auto;color:#17201d}h1{font-size:24px}table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right}.total{font-size:18px;font-weight:700}.muted{color:#55625d;font-size:12px}@media print{button{display:none}}</style></head><body><h1>Order receipt</h1><h2>${escapeHtml(receipt.restaurant.name)}</h2>${restaurantContact ? `<p>${restaurantContact}</p>` : ""}<p><b>Order:</b> ${escapeHtml(receipt.order.reference)}<br><b>Date:</b> ${escapeHtml(dateTime(receipt.order.date))}<br><b>Location:</b> ${escapeHtml(receipt.order.location)}${guest}${payment}</p><h3>Items</h3><table>${receipt.items.map((item) => `<tr><td>${escapeHtml(item.quantity)} × ${escapeHtml(item.name)}</td><td>${escapeHtml(item.lineTotal === null ? "—" : money(item.lineTotal))}</td></tr>`).join("")}</table>${receipt.order.instructions ? `<h3>Instructions</h3><p>${escapeHtml(receipt.order.instructions)}</p>` : ""}<p>${escapeHtml(receipt.financials.subtotalLabel)}: <b>${escapeHtml(money(receipt.financials.subtotal))}</b><br>${receipt.financials.discount > 0 ? `Discount recorded: <b>−${escapeHtml(money(receipt.financials.discount))}</b><br>` : ""}${receipt.financials.gstAmount > 0 ? `${gstLabel}: <b>${escapeHtml(money(receipt.financials.gstAmount))}</b><br>` : ""}<span class="total">Total: ${escapeHtml(money(receipt.financials.total))}</span></p>${receipt.financials.note ? `<p class="muted">${escapeHtml(receipt.financials.note)}</p>` : ""}<p class="muted">Generated from the delivered order record. This is an order receipt, not a GST tax invoice.</p><script>window.addEventListener('load',()=>window.print());</script></body></html>`;
};
