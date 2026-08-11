const DAY_MS = 24 * 60 * 60 * 1000;

const finiteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const orderAmount = (order) => finiteNumber(order?.totalAmount ?? order?.total ?? 0);

const startOfDay = (date) => new Date(
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
  0,
  0,
  0,
  0,
);

const endOfDay = (date) => new Date(
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
  23,
  59,
  59,
  999,
);

const parseLocalDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;

  return date;
};

const formatRangeDate = (date) => date.toLocaleDateString([], {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const getOrderAnalyticsDate = (order) => {
  for (const value of [order?.createdAt, order?.queuedAt, order?.updatedAt]) {
    if (value === undefined || value === null || value === "") continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

export const resolveAnalyticsRange = ({
  mode,
  month,
  quarter,
  year,
  startDate,
  endDate,
  now = new Date(),
}) => {
  let start;
  let end;
  let label;

  if (mode === "custom") {
    const parsedStart = parseLocalDate(startDate);
    const parsedEnd = parseLocalDate(endDate);
    if (!parsedStart || !parsedEnd) {
      return { error: "Choose both a valid start date and end date." };
    }
    start = startOfDay(parsedStart);
    end = endOfDay(parsedEnd);
    if (end < start) {
      return { error: "End date must be on or after the start date." };
    }
    label = startDate === endDate
      ? formatRangeDate(start)
      : `${formatRangeDate(start)} – ${formatRangeDate(end)}`;
  } else if (mode === "quarterly") {
    const safeYear = Number.isInteger(Number(year)) && Number(year) >= 1900 && Number(year) <= 9999
      ? Number(year)
      : now.getFullYear();
    const safeQuarter = Math.min(4, Math.max(1, Number(quarter) || 1));
    const firstMonth = (safeQuarter - 1) * 3;
    start = new Date(safeYear, firstMonth, 1);
    end = endOfDay(new Date(safeYear, firstMonth + 3, 0));
    label = `Q${safeQuarter} ${safeYear}`;
  } else {
    const match = /^(\d{4})-(\d{2})$/.exec(String(month || ""));
    if (!match) return { error: "Choose a valid month." };
    const selectedYear = Number(match[1]);
    const selectedMonth = Number(match[2]);
    if (
      selectedYear < 1900 ||
      selectedYear > 9999 ||
      selectedMonth < 1 ||
      selectedMonth > 12
    ) return { error: "Choose a valid month." };
    start = new Date(selectedYear, selectedMonth - 1, 1);
    end = endOfDay(new Date(selectedYear, selectedMonth, 0));
    label = start.toLocaleDateString([], { month: "long", year: "numeric" });
  }

  return { start, end, label, error: "" };
};

export const previousAnalyticsRange = (range) => {
  if (!range?.start || !range?.end || range.error) return null;
  const duration = range.end.getTime() - range.start.getTime();
  const end = new Date(range.start.getTime() - 1);
  const start = new Date(end.getTime() - duration);
  return {
    start,
    end,
    label: `${formatRangeDate(start)} – ${formatRangeDate(end)}`,
    error: "",
  };
};

export const orderMatchesAnalyticsSearch = (order, search) => {
  const term = String(search || "").trim().toLocaleLowerCase();
  if (!term) return true;

  const table = order?.tableId || order?.table || {};
  const values = [
    order?.guestName,
    order?.customerName,
    order?.name,
    order?._id,
    order?.clientOrderId,
    order?.orderNumber,
    order?.reference,
    order?.locationNumber,
    order?.roomNumber,
    order?.tableNumber,
    table?.locationNumber,
    table?.roomNumber,
    table?.tableNumber,
    table?.number,
    ...(Array.isArray(order?.items) ? order.items.map((item) => item?.name) : []),
  ];

  return values.some((value) => String(value ?? "").toLocaleLowerCase().includes(term));
};

export const filterAnalyticsOrders = (orders, range, search = "") => {
  if (!range?.start || !range?.end || range.error) return [];
  const startTime = range.start.getTime();
  const endTime = range.end.getTime();

  return (Array.isArray(orders) ? orders : []).filter((order) => {
    if (order?.status === "cancelled" || !orderMatchesAnalyticsSearch(order, search)) return false;
    const date = getOrderAnalyticsDate(order);
    return date && date.getTime() >= startTime && date.getTime() <= endTime;
  });
};

export const calculateAnalyticsStats = (orders) => {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalOrders = safeOrders.length;
  const totalRevenue = safeOrders.reduce(
    (sum, order) => sum + orderAmount(order),
    0,
  );

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
    pendingOrders: safeOrders.filter((order) =>
      ["pending", "accepted", "preparing", "paused"].includes(order?.status)).length,
    completedOrders: safeOrders.filter((order) => order?.status === "delivered").length,
  };
};

export const analyticsComparison = (current, previous) => {
  const currentValue = Number(current) || 0;
  const previousValue = Number(previous) || 0;
  if (previousValue === 0) return { percent: null, label: "No prior data" };
  const percent = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  return {
    percent,
    label: `${percent >= 0 ? "+" : ""}${Math.round(percent)}% vs previous period`,
  };
};

export const buildAnalyticsChartData = (orders, range) => {
  if (!range?.start || !range?.end || range.error) return [];
  const totalDays = Math.max(1, Math.round((
    startOfDay(range.end).getTime() - startOfDay(range.start).getTime()
  ) / DAY_MS) + 1);
  const bucketDays = totalDays <= 45 ? 1 : 7;
  const buckets = [];

  for (let offset = 0; offset < totalDays; offset += bucketDays) {
    const start = new Date(
      range.start.getFullYear(),
      range.start.getMonth(),
      range.start.getDate() + offset,
    );
    const end = endOfDay(new Date(
      range.start.getFullYear(),
      range.start.getMonth(),
      range.start.getDate() + Math.min(totalDays - 1, offset + bucketDays - 1),
    ));
    buckets.push({
      start,
      end,
      name: bucketDays === 1
        ? start.toLocaleDateString([], { month: "short", day: "numeric" })
        : `${start.toLocaleDateString([], { month: "short", day: "numeric" })}`,
      revenue: 0,
      orders: 0,
    });
  }

  (Array.isArray(orders) ? orders : []).forEach((order) => {
    const date = getOrderAnalyticsDate(order);
    if (!date) return;
    const bucket = buckets.find((item) => date >= item.start && date <= item.end);
    if (!bucket) return;
    bucket.revenue += orderAmount(order);
    bucket.orders += 1;
  });

  return buckets.map((bucket) => ({
    ...bucket,
    aov: bucket.orders ? Math.round(bucket.revenue / bucket.orders) : 0,
  }));
};

export const calculatePopularDishes = (orders, limit = 7) => {
  const counts = new Map();
  (Array.isArray(orders) ? orders : []).forEach((order) => {
    (Array.isArray(order?.items) ? order.items : []).forEach((item) => {
      const name = item?.name || "Unknown Item";
      const qty = finiteNumber(item?.quantity ?? 1, 1);
      if (qty <= 0) return;
      counts.set(name, (counts.get(name) || 0) + qty);
    });
  });

  return [...counts.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
    .slice(0, limit);
};
