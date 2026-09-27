import { jsPDF } from "jspdf";

// Canvas keeps restaurant/dish names in the browser's Unicode font system.
// All columns wrap independently; oversized rows continue on another page.
export function renderReceiptPdf(receipt, { money, dateTime }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: `${receipt.restaurant.name} - Order ${receipt.order.reference}`, creator: "FlexiOrder" });
  const W = 1240, H = 1754, M = 82, BOTTOM = 1630;
  const ink = "#172c2a", muted = "#61716c", accent = "#176756";
  let canvas, ctx, y, page = 0;
  const font = (size = 27, bold = false) => { ctx.font = `${bold ? 700 : 400} ${size}px Arial, "Noto Sans", sans-serif`; };
  const wrap = (value, width) => {
    const lines = [];
    for (const paragraph of String(value ?? "").split(/\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width <= width) { line = candidate; continue; }
        if (line) { lines.push(line); line = ""; }
        for (const char of word) {
          if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ""; }
          line += char;
        }
      }
      lines.push(line);
    }
    return lines;
  };
  const commit = () => {
    if (page) doc.addPage();
    doc.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    page++;
  };
  const start = () => {
    canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This device could not render the receipt.");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent; ctx.fillRect(M, 48, W - M * 2, 7);
    ctx.textBaseline = "top"; ctx.textAlign = "left";
    font(21, true); ctx.fillStyle = accent;
    ctx.fillText(page ? "ORDER RECEIPT / CONTINUED" : "ORDER RECEIPT", M, 79);
    y = 126;
  };
  const next = () => { commit(); start(); };
  const ensure = height => { if (y + height > BOTTOM) next(); };
  const text = (value, { size = 27, bold = false, color = ink, gap = 10 } = {}) => {
    font(size, bold);
    const lines = wrap(value, W - M * 2);
    for (const line of lines) {
      ensure(size * 1.4);
      font(size, bold); ctx.fillStyle = color; ctx.fillText(line, M, y); y += size * 1.4;
    }
    y += gap;
  };
  const rule = () => { ensure(18); ctx.fillStyle = "#dce5e0"; ctx.fillRect(M, y, W - M * 2, 1); y += 18; };
  const cells = [
    { x: M + 16, width: 490, align: "left" },
    { x: 697, width: 80, align: "right" },
    { x: 867, width: 152, align: "right" },
    { x: W - M - 16, width: 180, align: "right" },
  ];
  const tableHead = () => {
    ensure(116); ctx.fillStyle = "#edf4f0"; ctx.fillRect(M, y, W - M * 2, 52);
    font(21, true); ctx.fillStyle = accent;
    ["ITEM", "QTY", "RATE (INR)", "AMOUNT (INR)"].forEach((label, index) => {
      ctx.textAlign = cells[index].align; ctx.fillText(label, cells[index].x, y + 16);
    });
    ctx.textAlign = "left"; y += 68;
  };
  const amount = value => value === null ? "Not recorded" : money(value).replace(/^INR /, "");
  start();
  text(receipt.restaurant.name, { size: 51, bold: true, gap: 16 });
  [receipt.restaurant.address, [receipt.restaurant.phone, receipt.restaurant.email].filter(Boolean).join("  |  ")]
    .filter(Boolean).forEach(value => text(value, { size: 25, color: muted, gap: 4 }));
  if (receipt.restaurant.gstin) text(`GSTIN: ${receipt.restaurant.gstin}`, { size: 26, bold: true, gap: 8 });
  y += 16; rule();
  text(`Order  ${receipt.order.reference}`, { size: 27, bold: true, gap: 4 });
  text(`${dateTime(receipt.order.date)}  |  ${receipt.order.location}`, { size: 25, color: muted, gap: 4 });
  if (receipt.order.guestName) text(`Guest  ${receipt.order.guestName}`, { size: 25, gap: 4 });
  if (receipt.order.paymentMethod || receipt.order.paymentStatus) {
    text(`Payment  ${[receipt.order.paymentMethod, receipt.order.paymentStatus].filter(Boolean).join(" / ")}`, { size: 25, gap: 4 });
  }
  y += 22; tableHead();
  for (const item of receipt.items) {
    font(27);
    const columns = [item.name, String(item.quantity), amount(item.unitPrice), amount(item.lineTotal)]
      .map((value, index) => wrap(value, cells[index].width));
    const count = Math.max(...columns.map(lines => lines.length));
    const rowHeight = count * 38 + 32;
    // Move ordinary rows intact; only exceptionally tall rows are split.
    if (rowHeight <= BOTTOM - 194 && y + rowHeight > BOTTOM) { next(); tableHead(); }
    for (let index = 0; index < count; index++) {
      if (y + 38 > BOTTOM) { next(); tableHead(); }
      font(27); ctx.fillStyle = ink;
      columns.forEach((lines, column) => {
        ctx.textAlign = cells[column].align;
        if (lines[index]) ctx.fillText(lines[index], cells[column].x, y);
      });
      ctx.textAlign = "left"; y += 38;
    }
    y += 14;
    if (y + 18 <= BOTTOM) {
      ctx.fillStyle = "#dce5e0"; ctx.fillRect(M, y, W - M * 2, 1); y += 18;
    } else { y = BOTTOM; }
  }
  if (!receipt.items.length) text("No item details recorded.", { color: muted });
  y += 22;
  const totals = [[receipt.financials.subtotalLabel, money(receipt.financials.subtotal)]];
  if (receipt.financials.discount > 0) totals.push(["Discount recorded", `-${money(receipt.financials.discount)}`]);
  if (receipt.financials.gstAmount > 0) totals.push([receipt.financials.gstRate ? `GST (${receipt.financials.gstRate}%)` : "GST recorded", money(receipt.financials.gstAmount)]);
  // Keep the subtotal, recorded adjustments and total together.
  ensure(totals.length * 55 + 125);
  for (const [label, value] of totals) {
    font(26); ctx.fillStyle = muted; ctx.fillText(label, M, y);
    ctx.textAlign = "right"; ctx.fillText(value, W - M - 16, y); ctx.textAlign = "left"; y += 55;
  }
  ctx.fillStyle = ink; ctx.fillRect(M, y, W - M * 2, 86);
  font(30, true); ctx.fillStyle = "#ffffff"; ctx.fillText("TOTAL", M + 22, y + 27);
  ctx.textAlign = "right"; ctx.fillText(money(receipt.financials.total), W - M - 22, y + 27); ctx.textAlign = "left"; y += 115;
  if (receipt.financials.note) text(receipt.financials.note, { size: 23, color: muted, gap: 16 });
  if (receipt.order.instructions) {
    ensure(95); text("ORDER NOTES", { size: 21, bold: true, color: accent });
    text(receipt.order.instructions, { size: 25, color: muted });
  }
  ensure(118); y += 20;
  text("Thank you for dining with us.", { size: 28, bold: true });
  text("Order receipt, not a GST tax invoice. Amounts reflect the saved order.", { size: 21, color: muted });
  commit();
  for (let index = 1; index <= page; index++) {
    doc.setPage(index); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(97, 113, 108);
    doc.text("Prepared with FlexiOrder", 14, 287);
    doc.text(`${index} / ${page}`, 196, 287, { align: "right" });
  }
  return doc;
}
