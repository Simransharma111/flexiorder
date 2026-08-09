const STATUS_RANK = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  paused: 2,
  ready: 3,
  delivered: 4,
  cancelled: 4,
};

export const statusLane = (status) => {
  if (status === "pending") return "new";
  if (["accepted", "preparing"].includes(status)) return "preparing";
  if (status === "ready") return "ready";
  if (status === "paused") return "paused";
  return "history";
};

export const nextOrderStatus = (status, surface = "kitchen") => {
  if (status === "pending") return "accepted";
  if (status === "accepted") return "preparing";
  if (status === "preparing") return "ready";
  if (status === "paused") return "preparing";
  if (status === "ready" && surface === "waiter") return "delivered";
  return null;
};

export const orderKey = (order) =>
  order?.clientOrderId || order?._id || order?.localId || "";

const normalizedOrderType = (order) => String(
  order?.orderType || order?.type || order?.serviceType || ""
).toLowerCase().replace(/[\s_-]/g, "");

export const orderLocation = (order) => {
  if (["takeaway", "takeout", "pickup"].includes(normalizedOrderType(order))) {
    return "Takeaway";
  }

  const table = order?.tableId && typeof order.tableId === "object"
    ? order.tableId
    : order?.table && typeof order.table === "object"
      ? order.table
      : order?.location && typeof order.location === "object"
        ? order.location
        : null;
  const number = order?.locationNumber ?? order?.roomNumber ?? order?.tableNumber ??
    table?.locationNumber ?? table?.roomNumber ?? table?.tableNumber ?? table?.number ?? "-";
  const locationType = String(
    order?.locationType || table?.locationType || table?.type || "table"
  ).toLowerCase();
  return locationType === "room" ? `Room ${number}` : `Table ${number}`;
};

export const waitingMinutes = (order, now = Date.now()) => {
  const time = new Date(order?.createdAt || order?.queuedAt || 0).getTime();
  return Number.isFinite(time) && time > 0
    ? Math.max(0, Math.floor((now - time) / 60000))
    : 0;
};

export const itemCount = (order) =>
  (order?.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0);

const orderTime = (order) => new Date(
  order?.updatedAt || order?.createdAt || order?.queuedAt || 0
).getTime() || 0;

const chooseOrder = (current, incoming) => {
  if (!current) return incoming;
  if (!incoming) return current;

  const currentRank = STATUS_RANK[current.status] ?? -1;
  const incomingRank = STATUS_RANK[incoming.status] ?? -1;
  const explicitRevert = incoming.reverted === true || incoming.statusChangeType === "revert";

  if (!explicitRevert && incomingRank < currentRank) return current;
  if (incomingRank === currentRank && orderTime(incoming) < orderTime(current)) return current;
  const merged = { ...current, ...incoming };
  if (current.pendingSync && incoming._id && current.clientOrderId &&
      current.clientOrderId === incoming.clientOrderId) {
    merged.pendingSync = false;
  }
  return merged;
};

export const mergeOrders = (current = [], incoming = []) => {
  const merged = new Map();
  [...current, ...incoming].forEach((order) => {
    const key = orderKey(order);
    if (!key) return;
    merged.set(key, chooseOrder(merged.get(key), order));
  });
  return [...merged.values()].sort((a, b) => orderTime(b) - orderTime(a));
};

const sameOrder = (left, right) => Boolean(
  (left?.clientOrderId && left.clientOrderId === right?.clientOrderId) ||
  (left?._id && left._id === right?._id)
);

export const replaceOrderAuthoritatively = (orders = [], incoming) => {
  if (!incoming) return orders;
  let replaced = false;
  const next = orders.map((order) => {
    if (!sameOrder(order, incoming)) return order;
    replaced = true;
    return {
      ...order,
      ...incoming,
      pendingMutation: incoming.pendingMutation ?? false,
      pendingSync: incoming.pendingSync ?? false,
    };
  });
  return replaced ? next : [incoming, ...next];
};

export const reconcileAuthoritativeOrders = (
  current = [],
  incoming = [],
  pendingUpdates = [],
) => {
  const active = Array.isArray(incoming) ? incoming : [];
  let reconciled = mergeOrders([], active);

  current.filter((order) => order?.pendingSync && !active.some(
    (serverOrder) => sameOrder(order, serverOrder)
  )).forEach((order) => {
    reconciled = mergeOrders(reconciled, [order]);
  });

  pendingUpdates.forEach((update) => {
    const local = current.find((order) => order?._id === update.orderId);
    const base = reconciled.find((order) => order?._id === update.orderId) || local;
    if (!base) return;
    reconciled = replaceOrderAuthoritatively(reconciled, {
      ...base,
      status: update.status,
      pauseReason: update.pauseReason ?? base.pauseReason,
      pendingMutation: true,
    });
  });

  return reconciled;
};

export const groupOrdersByLocation = (orders = []) => {
  const groups = new Map();
  orders.forEach((order) => {
    const location = orderLocation(order);
    const groupable = location !== "Takeaway" && !location.endsWith(" -");
    const key = groupable
      ? `${location}:${statusLane(order.status)}`
      : `${orderKey(order)}:${statusLane(order.status)}`;
    const group = groups.get(key) || { key, location, orders: [], items: [] };
    group.orders.push(order);
    group.items.push(...(Array.isArray(order.items) ? order.items : []));
    groups.set(key, group);
  });
  return [...groups.values()];
};

export const isDelayedOrder = (order, thresholdMinutes = 15) =>
  !["ready", "delivered", "cancelled"].includes(order?.status) &&
  waitingMinutes(order) >= thresholdMinutes;
