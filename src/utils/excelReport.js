import ExcelJS from "exceljs";
import { analyticsComparison } from "./analyticsRanges";

// ── palette ────────────────────────────────────────────────────────────────
const INK = "FF17201D";
const MUTED = "FF55625D";
const WHITE = "FFFFFFFF";
const HEADER_FILL = "FFEDF7F2";
const ZEBRA = "FFF7FAF8";
const BORDER = { style: "thin", color: { argb: "FFD8E0DC" } };

const accentArgb = (hotel) => {
  const raw = String(hotel?.theme?.accent || hotel?.theme?.primary || "#34D399").replace("#", "");
  return raw.length === 6 ? `FF${raw.toUpperCase()}` : "FF34D399";
};

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;
const MONEY_FMT = '"₹"#,##0.00';

const fdate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};

const slug = (text) => String(text || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "report";

export const reportFilename = (hotel, range) =>
  `${slug(hotel?.name || "flexiorder")}-analytics-${fdate(range?.start) || "all"}-to-${fdate(range?.end) || "all"}.xlsx`;

// ── hand-drawn revenue diagerm (no chart lib needed in the spreadsheet) ────
const drawRevenueBars = (chartData, accent) => {
  if (typeof document === "undefined") return null;
  try {
    const points = (chartData || []).filter((p) => Number.isFinite(p?.revenue));
    if (!points.length || points.every((p) => p.revenue <= 0)) return null;

    const W = 880, H = 260, PAD_L = 52, PAD_B = 30, PAD_T = 16, PAD_R = 12;
    const canvas = document.createElement("canvas");
    const dpr = 2;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    const max = Math.max(...points.map((p) => p.revenue), 1);
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;
    const n = points.length;

    // gridlines + y labels (₹ compact)
    ctx.strokeStyle = "#E3EAE7";
    ctx.fillStyle = "#6B7B75";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "right";
    for (let g = 0; g <= 4; g += 1) {
      const y = PAD_T + (plotH * g) / 4;
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
      const val = max * (1 - g / 4);
      const compact = val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(Math.round(val));
      ctx.fillText(`₹${compact}`, PAD_L - 6, y + 3);
    }

    // bars
    const slot = plotW / n;
    const barW = Math.min(34, slot * 0.6);
    ctx.fillStyle = `#${accent.slice(2)}`;
    points.forEach((p, i) => {
      const bh = (p.revenue / max) * plotH;
      const x = PAD_L + slot * i + (slot - barW) / 2;
      const y = PAD_T + (plotH - bh);
      ctx.beginPath();
      ctx.roundRect(x, y, barW, Math.max(2, bh), 3);
      ctx.fill();
    });

    // x labels (show up to 8)
    ctx.fillStyle = "#6B7B75";
    ctx.textAlign = "center";
    const step = Math.max(1, Math.ceil(n / 8));
    points.forEach((p, i) => {
      if (i % step !== 0 && i !== n - 1) return;
      ctx.fillText(p.name || "", PAD_L + slot * i + slot / 2, H - 10);
    });

    const dataUrl = canvas.toDataURL("image/png");
    return { base64: dataUrl.split(",")[1], width: W, height: H };
  } catch {
    return null;
  }
};

const styleHeaderRow = (row, accent) => {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accent } };
    cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
  });
  row.height = 22;
};

const cellBorders = (cell) => {
  cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
};

// ── main builder ───────────────────────────────────────────────────────────
export async function buildAnalyticsReportBlob({
  hotel = {},
  orders = [],
  stats = {},
  previousStats = {},
  chartData = [],
  popularDishes = [],
  range = {},
  rangeLabel = "",
}) {
  const accent = accentArgb(hotel);
  const wb = new ExcelJS.Workbook();
  wb.creator = "FlexiOrder";
  wb.created = new Date();
  const ws = wb.addWorksheet("Sales Report", {
    views: [{ showGridLines: false }],
  });

  ws.columns = [
    { width: 16 }, { width: 12 }, { width: 9 }, { width: 16 }, { width: 26 },
    { width: 38 }, { width: 7 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 13 }, { width: 12 },
  ];

  // brand block ───────────────────────────────────────────────────────────
  ws.mergeCells("A1:M1");
  const brand = ws.getCell("A1");
  brand.value = hotel?.name || hotel?.hotelName || "Restaurant";
  brand.font = { size: 20, bold: true, color: { argb: WHITE } };
  brand.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accent } };
  brand.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(1).height = 34;

  ws.mergeCells("A2:M2");
  const brandMeta = ws.getCell("A2");
  brandMeta.value = [hotel?.address || hotel?.location, hotel?.phone || hotel?.contact, hotel?.email].filter(Boolean).join("  ·  ");
  brandMeta.font = { size: 10, color: { argb: MUTED }, italic: true };
  brandMeta.alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A3:M3");
  const title = ws.getCell("A3");
  title.value = "Sales Analytics Report";
  title.font = { size: 14, bold: true, color: { argb: INK } };
  title.alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A4:M4");
  const period = ws.getCell("A4");
  period.value = `Period: ${rangeLabel || "Selected range"}   ·   Generated: ${new Date().toLocaleString("en-IN")}   ·   Powered by FlexiOrder`;
  period.font = { size: 10, color: { argb: MUTED } };
  period.alignment = { vertical: "middle", horizontal: "center" };

  let r = 6;

  // summary ───────────────────────────────────────────────────────────────
  ws.mergeCells(`A${r}:M${r}`);
  ws.getCell(`A${r}`).value = "Summary — what happened in this period";
  ws.getCell(`A${r}`).font = { size: 12, bold: true, color: { argb: INK } };
  r += 1;
  ws.mergeCells(`A${r}:M${r}`);
  ws.getCell(`A${r}`).value = "Money earned, how many orders, and how this compares with the period just before.";
  ws.getCell(`A${r}`).font = { size: 9, italic: true, color: { argb: MUTED } };
  r += 1;

  const summaryRows = [
    ["Total revenue collected", money(stats.totalRevenue), "sum of all order amounts in the period"],
    ["Orders placed", stats.totalOrders || 0, "every order recorded in the period"],
    ["Average order value", money(stats.avgOrderValue), "revenue ÷ orders — how much a typical guest spends"],
    ["Orders delivered", stats.completedOrders || 0, "served and closed orders"],
    ["Orders still open", stats.pendingOrders || 0, "pending / accepted / preparing / paused"],
  ];
  summaryRows.forEach(([label, value, note]) => {
    const row = ws.getRow(r);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true, size: 10, color: { argb: INK } };
    row.getCell(3).value = value;
    row.getCell(3).font = { size: 11, color: { argb: INK } };
    row.getCell(3).alignment = { horizontal: "right" };
    if (label !== "Orders placed" && label !== "Orders delivered" && label !== "Orders still open") row.getCell(3).numFmt = MONEY_FMT;
    ws.mergeCells(`E${r}:M${r}`);
    row.getCell(5).value = note;
    row.getCell(5).font = { size: 9, italic: true, color: { argb: MUTED } };
    if (r % 2 === 0) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }; });
    r += 1;
  });

  const revCmp = analyticsComparison(stats.totalRevenue, previousStats.totalRevenue);
  if (revCmp.percent !== null) {
    const row = ws.getRow(r);
    row.getCell(1).value = "Revenue vs previous period";
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(3).value = revCmp.label;
    row.getCell(3).font = { size: 11, bold: true, color: { argb: revCmp.percent >= 0 ? "FF059669" : "FFDC2626" } };
    r += 1;
  }
  r += 1;

  // diagram ───────────────────────────────────────────────────────────────
  const chart = drawRevenueBars(chartData, accent);
  ws.mergeCells(`A${r}:M${r}`);
  ws.getCell(`A${r}`).value = "Revenue trend — diagram for the selected period";
  ws.getCell(`A${r}`).font = { size: 12, bold: true, color: { argb: INK } };
  r += 1;
  ws.mergeCells(`A${r}:M${r}`);
  ws.getCell(`A${r}`).value = chart
    ? "Each bar is one day (or week for long ranges). Taller bar = more money earned."
    : "No revenue recorded in this period yet — the diagram appears once orders are billed.";
  ws.getCell(`A${r}`).font = { size: 9, italic: true, color: { argb: MUTED } };
  r += 1;
  if (chart) {
    const imageId = wb.addImage({ base64: chart.base64, extension: "png" });
    ws.addImage(imageId, {
      tl: { col: 0, row: r - 1 },
      ext: { width: chart.width * 0.75, height: chart.height * 0.75 },
    });
    r += 11; // reserve space under image
  } else {
    r += 1;
  }

  // top dishes ────────────────────────────────────────────────────────────
  if (popularDishes.length) {
    ws.mergeCells(`A${r}:M${r}`);
    ws.getCell(`A${r}`).value = "Best sellers — dishes guests ordered most";
    ws.getCell(`A${r}`).font = { size: 12, bold: true, color: { argb: INK } };
    r += 1;
    const head = ws.getRow(r);
    head.getCell(1).value = "Dish";
    head.getCell(7).value = "Qty";
    ws.mergeCells(`A${r}:F${r}`);
    styleHeaderRow(head, accent);
    r += 1;
    popularDishes.forEach((dish, idx) => {
      const row = ws.getRow(r);
      row.getCell(1).value = `${idx + 1}. ${dish.name}`;
      ws.mergeCells(`A${r}:F${r}`);
      row.getCell(7).value = dish.qty;
      row.getCell(7).alignment = { horizontal: "center" };
      [1, 7].forEach((c) => cellBorders(row.getCell(c)));
      if (idx % 2 === 1) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }; });
      r += 1;
    });
    r += 1;
  }

  // order detail ──────────────────────────────────────────────────────────
  ws.mergeCells(`A${r}:M${r}`);
  ws.getCell(`A${r}`).value = `Every order in ${rangeLabel ? `"${rangeLabel}"` : "the selected period"} (${orders.length} rows)`;
  ws.getCell(`A${r}`).font = { size: 12, bold: true, color: { argb: INK } };
  r += 1;
  ws.mergeCells(`A${r}:M${r}`);
  ws.getCell(`A${r}`).value = "Columns: order number, when, where the guest sat, contact, items, amounts, and final status.";
  ws.getCell(`A${r}`).font = { size: 9, italic: true, color: { argb: MUTED } };
  r += 1;

  const headers = ["Order #", "Date", "Time", "Table / Spot", "Guest contact", "Items", "Qty", "Subtotal", "Discount", "GST", "Total", "Status", "Payment"];
  const hrow = ws.getRow(r);
  headers.forEach((h, i) => { hrow.getCell(i + 1).value = h; });
  styleHeaderRow(hrow, accent);
  ws.views = [{ showGridLines: false, state: "frozen", ySplit: r }];
  r += 1;

  orders.forEach((order, idx) => {
    const placed = new Date(order?.placedAt || order?.createdAt || order?.date || Date.now());
    const items = Array.isArray(order?.items) ? order.items : [];
    const qty = items.reduce((s, it) => s + (Number(it?.quantity) || 1), 0);
    const row = ws.getRow(r);
    const values = [
      String(order?.orderNumber || order?._id || order?.clientOrderId || "").slice(0, 18),
      placed.toLocaleDateString("en-IN"),
      placed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      order?.table?.name || order?.tableName || order?.location || order?.spot || "—",
      order?.guestContact || order?.guestPhone || order?.contact || order?.phone || "—",
      items.map((it) => `${it?.quantity ?? 1}× ${it?.name || "Item"}`).join(", "),
      qty,
      money(order?.subtotal ?? order?.totalAmount ?? order?.total),
      money(order?.discount ?? order?.discountAmount ?? 0),
      money(order?.gstAmount ?? order?.tax ?? order?.taxAmount ?? 0),
      money(order?.totalAmount ?? order?.total),
      order?.status || "",
      (order?.paymentMethod || order?.payment?.method || "").toUpperCase() || "—",
    ];
    values.forEach((v, i) => { row.getCell(i + 1).value = v; });
    [8, 9, 10, 11].forEach((c) => { row.getCell(c).numFmt = MONEY_FMT; row.getCell(c).alignment = { horizontal: "right" }; });
    row.getCell(7).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { wrapText: true, vertical: "top" };
    row.eachCell(cellBorders);
    if (idx % 2 === 1) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }; });
    row.height = Math.min(48, 14 + Math.ceil(String(values[5]).length / 60) * 10);
    r += 1;
  });

  // totals ────────────────────────────────────────────────────────────────
  const trow = ws.getRow(r);
  trow.getCell(1).value = "TOTAL";
  trow.getCell(7).value = orders.reduce((s, o) => s + (Array.isArray(o?.items) ? o.items.reduce((q, it) => q + (Number(it?.quantity) || 1), 0) : 0), 0);
  trow.getCell(8).value = money(stats.totalRevenue);
  trow.getCell(11).value = money(stats.totalRevenue);
  [8, 11].forEach((c) => { trow.getCell(c).numFmt = MONEY_FMT; });
  trow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: INK } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cellBorders(cell);
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
