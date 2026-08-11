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
  if (status === "delivered") return "delivered";
  return "history";
};

export const nextOrderStatus = (status, surface = "kitchen", { godModeEnabled = false } = {}) => {
  if (godModeEnabled && ["pending", "accepted", "preparing"].includes(status)) return "ready";
  if (status === "pending") return "preparing";
  if (status === "accepted") return "ready";
  if (status === "preparing") return "ready";
  if (status === "paused") return "preparing";
  if (status === "ready" && surface === "waiter") return "delivered";
  return null;
};

export const orderKey = (order) =>
  order?.clientOrderId || order?._id || order?.localId || "";

export const matchesOrderId = (order, id) => Boolean(
  id && [order?._id, order?.clientOrderId, order?.localId].some(
    (candidate) => candidate && String(candidate) === String(id)
  )
);

const BULK_ACTIVE_STATUSES = new Set(["pending", "accepted", "preparing", "paused", "ready"]);

export const getActiveOrderIds = (orders = [], snapshotIds = null, blockedIds = []) => {
  const frozenIds = Array.isArray(snapshotIds) ? snapshotIds.map(String) : null;
  const blocked = (Array.isArray(blockedIds) ? blockedIds : []).map(String);
  const groups = [];

  (Array.isArray(orders) ? orders : []).forEach((order) => {
    const aliases = [order?._id, order?.clientOrderId, order?.localId]
      .filter(Boolean)
      .map(String);
    if (!aliases.length) return;

    const matchingIndexes = groups.flatMap((group, index) => (
      [...group.aliases].some((alias) => aliases.includes(alias)) ? [index] : []
    ));
    if (!matchingIndexes.length) {
      groups.push({ aliases: new Set(aliases), orders: [order] });
      return;
    }

    const primary = groups[matchingIndexes[0]];
    aliases.forEach((alias) => primary.aliases.add(alias));
    primary.orders.push(order);
    matchingIndexes.slice(1).reverse().forEach((index) => {
      groups[index].aliases.forEach((alias) => primary.aliases.add(alias));
      primary.orders.push(...groups[index].orders);
      groups.splice(index, 1);
    });
  });

  return groups.flatMap((group) => {
    const aliases = [...group.aliases];
    const representative = group.orders.reduce(
      (selected, order) => chooseOrder(selected, order),
      null,
    );
    if (!BULK_ACTIVE_STATUSES.has(representative?.status)) return [];
    if (blocked.some((id) => aliases.includes(id))) return [];
    if (frozenIds && !frozenIds.some((id) => aliases.includes(id))) return [];
    const serverOrder = group.orders.find((order) => order?._id &&
      [order?.clientOrderId, order?.localId]
        .filter(Boolean)
        .every((alias) => String(alias) !== String(order._id)));
    return [String(serverOrder?._id || representative?._id || orderKey(representative))];
  });
};

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
  const currentIsRevert = current.reverted === true || current.statusChangeType === "revert";

  const preserveIdentityAndSync = (selected) => ({
    ...selected,
    _id: incoming._id || selected._id,
    clientOrderId: incoming.clientOrderId || selected.clientOrderId,
    localId: incoming.localId || selected.localId,
    pendingMutation: incoming.pendingMutation ?? selected.pendingMutation,
    pendingSync: incoming.pendingSync ?? selected.pendingSync,
  });

  if (!explicitRevert && incomingRank < currentRank) {
    return preserveIdentityAndSync(current);
  }
  if (currentIsRevert && incomingRank > currentRank && orderTime(incoming) <= orderTime(current)) {
    return preserveIdentityAndSync(current);
  }
  if (incomingRank === currentRank && orderTime(incoming) < orderTime(current)) {
    return preserveIdentityAndSync(current);
  }
  const merged = preserveIdentityAndSync({ ...current, ...incoming });
  if (current.pendingSync && incoming._id && current.clientOrderId &&
      current.clientOrderId === incoming.clientOrderId) {
    merged.pendingSync = false;
  }
  return merged;
};

export const mergeOrders = (current = [], incoming = []) => {
  const merged = [];
  [...current, ...incoming].forEach((order) => {
    if (!orderKey(order)) return;
    const existingIndex = merged.findIndex((candidate) => sameOrder(candidate, order));
    if (existingIndex === -1) merged.push(order);
    else merged[existingIndex] = chooseOrder(merged[existingIndex], order);
  });
  return merged.sort((a, b) => orderTime(b) - orderTime(a));
};

const sameOrder = (left, right) => Boolean(
  [left?._id, left?.clientOrderId, left?.localId]
    .filter(Boolean)
    .some((leftId) => [right?._id, right?.clientOrderId, right?.localId]
      .filter(Boolean)
      .some((rightId) => String(leftId) === String(rightId)))
);

const hasPendingMutation = (order, currentOrder, pendingUpdates) => pendingUpdates.some(
  (update) => matchesOrderId(order, update.orderId) || matchesOrderId(currentOrder, update.orderId)
);

export const mergeOrderUpdate = (current = [], incoming, pendingUpdates = []) => {
  if (!incoming) return current;
  const currentOrder = current.find((order) => sameOrder(order, incoming));
  const pendingMutation = hasPendingMutation(incoming, currentOrder, pendingUpdates);
  return mergeOrders(current, [{
    ...incoming,
    clientOrderId: incoming.clientOrderId || currentOrder?.clientOrderId,
    pendingMutation,
    ...(!pendingMutation ? { reverted: false, statusChangeType: undefined } : {}),
  }]);
};

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
  let reconciled = mergeOrders([], active.map((incomingOrder) => {
    const currentOrder = current.find((order) => sameOrder(order, incomingOrder));
    const pendingMutation = hasPendingMutation(incomingOrder, currentOrder, pendingUpdates);
    return chooseOrder(currentOrder, {
      ...incomingOrder,
      clientOrderId: incomingOrder.clientOrderId || currentOrder?.clientOrderId,
      pendingMutation,
      ...(!pendingMutation ? { reverted: false, statusChangeType: undefined } : {}),
    });
  }));

  current.forEach((order) => {
    const key = orderKey(order);
    if (!key) return;
    const inActive = active.some((incomingOrder) => sameOrder(order, incomingOrder));
    if (!inActive) {
      if (["delivered", "cancelled"].includes(order.status) || order.pendingSync) {
        reconciled = replaceOrderAuthoritatively(reconciled, order);
      }
    }
  });

  pendingUpdates.forEach((update) => {
    const local = current.find((order) => matchesOrderId(order, update.orderId));
    const base = reconciled.find((order) => matchesOrderId(order, update.orderId)) || local;
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
