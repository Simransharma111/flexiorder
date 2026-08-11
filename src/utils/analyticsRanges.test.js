import { describe, expect, it } from "vitest";
import {
  analyticsComparison,
  buildAnalyticsChartData,
  calculatePopularDishes,
  calculateAnalyticsStats,
  filterAnalyticsOrders,
  orderMatchesAnalyticsSearch,
  previousAnalyticsRange,
  resolveAnalyticsRange,
} from "./analyticsRanges";

const localTimestamp = (year, month, day, hour = 12) =>
  new Date(year, month - 1, day, hour).toISOString();

describe("analytics date ranges", () => {
  it("resolves a selected calendar month including leap day", () => {
    const range = resolveAnalyticsRange({ mode: "monthly", month: "2024-02" });

    expect(range.error).toBe("");
    expect([range.start.getFullYear(), range.start.getMonth(), range.start.getDate()]).toEqual([2024, 1, 1]);
    expect([range.end.getFullYear(), range.end.getMonth(), range.end.getDate()]).toEqual([2024, 1, 29]);
    expect(range.end.getHours()).toBe(23);
  });

  it("rejects low years that JavaScript Date would remap into the 1900s", () => {
    expect(resolveAnalyticsRange({ mode: "monthly", month: "0099-08" }).error)
      .toBe("Choose a valid month.");
  });

  it("resolves calendar quarter boundaries instead of a rolling 90-day range", () => {
    const range = resolveAnalyticsRange({ mode: "quarterly", quarter: 2, year: 2026 });

    expect([range.start.getFullYear(), range.start.getMonth(), range.start.getDate()]).toEqual([2026, 3, 1]);
    expect([range.end.getFullYear(), range.end.getMonth(), range.end.getDate()]).toEqual([2026, 5, 30]);
    expect(range.label).toBe("Q2 2026");
  });

  it("falls back to the current year for an invalid quarter year", () => {
    const range = resolveAnalyticsRange({
      mode: "quarterly",
      quarter: 4,
      year: "",
      now: new Date(2026, 7, 11),
    });

    expect(range.label).toBe("Q4 2026");
  });

  it("includes an entire single custom day and rejects a reversed range", () => {
    const oneDay = resolveAnalyticsRange({
      mode: "custom",
      startDate: "2026-08-11",
      endDate: "2026-08-11",
    });
    const reversed = resolveAnalyticsRange({
      mode: "custom",
      startDate: "2026-08-12",
      endDate: "2026-08-11",
    });

    expect(oneDay.start.getHours()).toBe(0);
    expect(oneDay.end.getHours()).toBe(23);
    expect(oneDay.end.getMilliseconds()).toBe(999);
    expect(reversed.error).toMatch(/on or after/);
  });

  it("derives an immediately preceding period with equal duration", () => {
    const current = resolveAnalyticsRange({
      mode: "custom",
      startDate: "2026-08-10",
      endDate: "2026-08-11",
    });
    const previous = previousAnalyticsRange(current);

    expect(previous.end.getTime()).toBe(current.start.getTime() - 1);
    expect(previous.end.getTime() - previous.start.getTime())
      .toBe(current.end.getTime() - current.start.getTime());
  });
});

describe("analytics filtering and calculations", () => {
  const orders = [
    {
      _id: "order-paneer",
      guestName: "Aarav Shah",
      locationNumber: "8",
      createdAt: localTimestamp(2026, 8, 1),
      status: "delivered",
      totalAmount: 500,
      items: [{ name: "Paneer Tikka", quantity: 2 }],
    },
    {
      clientOrderId: "client-noodle",
      customerName: "Meera",
      tableId: { tableNumber: "12" },
      createdAt: localTimestamp(2026, 8, 31, 23),
      status: "preparing",
      total: 300,
      items: [{ name: "Hakka Noodles", quantity: 1 }],
    },
    {
      guestName: "Cancelled Guest",
      createdAt: localTimestamp(2026, 8, 15),
      status: "cancelled",
      totalAmount: 900,
      items: [],
    },
    { guestName: "Broken Date", createdAt: "not-a-date", status: "delivered", totalAmount: 100 },
  ];
  const august = resolveAnalyticsRange({ mode: "monthly", month: "2026-08" });

  it("matches useful name and identifier fields case-insensitively", () => {
    expect(orderMatchesAnalyticsSearch(orders[0], "AARAV")).toBe(true);
    expect(orderMatchesAnalyticsSearch(orders[0], "paneer")).toBe(true);
    expect(orderMatchesAnalyticsSearch(orders[1], "client-noodle")).toBe(true);
    expect(orderMatchesAnalyticsSearch(orders[1], "12")).toBe(true);
    expect(orderMatchesAnalyticsSearch(orders[1], "   ")).toBe(true);
  });

  it("applies inclusive range, search, cancelled, and invalid-date rules together", () => {
    expect(filterAnalyticsOrders(orders, august)).toHaveLength(2);
    expect(filterAnalyticsOrders(orders, august, "paneer")).toEqual([orders[0]]);
    expect(filterAnalyticsOrders(orders, { error: "Invalid" }, "")).toEqual([]);
  });

  it("uses the first valid order timestamp when an earlier timestamp is malformed", () => {
    const order = {
      createdAt: "not-a-date",
      updatedAt: localTimestamp(2026, 8, 20),
      status: "delivered",
    };

    expect(filterAnalyticsOrders([order], august)).toEqual([order]);
  });

  it("calculates every metric from the same filtered orders", () => {
    expect(calculateAnalyticsStats(filterAnalyticsOrders(orders, august))).toEqual({
      totalRevenue: 800,
      totalOrders: 2,
      avgOrderValue: 400,
      pendingOrders: 1,
      completedOrders: 1,
    });
  });

  it("preserves explicit zero totals and ignores malformed numeric values", () => {
    const stats = calculateAnalyticsStats([
      { totalAmount: 0, total: 999 },
      { totalAmount: "invalid" },
      { total: "125.50" },
    ]);

    expect(stats.totalRevenue).toBe(125.5);
  });

  it("ignores non-positive quantities and safely defaults malformed quantities", () => {
    expect(calculatePopularDishes([{ items: [
      { name: "Zero", quantity: 0 },
      { name: "Negative", quantity: -2 },
      { name: "Unknown quantity", quantity: "invalid" },
    ] }])).toEqual([{ name: "Unknown quantity", qty: 1 }]);
  });

  it("returns a neutral comparison when the previous baseline is zero", () => {
    expect(analyticsComparison(10, 0)).toEqual({ percent: null, label: "No prior data" });
    expect(analyticsComparison(120, 100).label).toBe("+20% vs previous period");
  });

  it("builds daily buckets for a month and weekly buckets for a quarter", () => {
    const monthly = buildAnalyticsChartData(filterAnalyticsOrders(orders, august), august);
    const quarter = resolveAnalyticsRange({ mode: "quarterly", quarter: 3, year: 2026 });
    const quarterly = buildAnalyticsChartData(filterAnalyticsOrders(orders, quarter), quarter);

    expect(monthly).toHaveLength(31);
    expect(monthly.reduce((sum, bucket) => sum + bucket.orders, 0)).toBe(2);
    expect(quarterly).toHaveLength(14);
    expect(quarterly.reduce((sum, bucket) => sum + bucket.revenue, 0)).toBe(800);
  });
});
