export const guestActiveOrdersKey = (qrId) => `activeOrders_${qrId}`;

const HANDOFF_TTL_MS = 5 * 60 * 1000;
const STATUS_RANK = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  paused: 2,
  ready: 3,
  delivered: 4,
  cancelled: 4,
};

const identifiers = (order) => [order?._id, order?.clientOrderId, order?.localId]
  .filter(Boolean)
  .map(String);

export const sameGuestOrder = (left, right) => {
  const rightIds = new Set(identifiers(right));
  return identifiers(left).some((id) => rightIds.has(id));
};

const itemIdentifier = (item) =>
  item?.menuId || item?._id || item?.menu?._id || item?.menu?.id || null;

export const mergeGuestOrderItems = (serverItems, submittedItems) => {
  const server = Array.isArray(serverItems) ? serverItems : [];
  const submitted = Array.isArray(submittedItems) ? submittedItems : [];
  if (!server.length) return submitted;

  return server.map((serverItem, index) => {
    const serverId = itemIdentifier(serverItem);
    const submittedItem = submitted.find((item) => {
      const submittedId = itemIdentifier(item);
      return serverId && submittedId && String(serverId) === String(submittedId);
    }) || submitted[index] || {};
    return {
      ...submittedItem,
      ...serverItem,
      name: serverItem?.name || serverItem?.menu?.name || submittedItem?.name,
    };
  });
};

export const readGuestActiveOrders = (qrId, now = Date.now()) => {
  if (!qrId) return [];
  try {
    const value = JSON.parse(localStorage.getItem(guestActiveOrdersKey(qrId)) || "[]");
    return (Array.isArray(value) ? value : []).filter(
      (order) => !order?.guestHandoffUntil || Number(order.guestHandoffUntil) > now,
    );
  } catch {
    return [];
  }
};

export const writeGuestActiveOrders = (qrId, orders) => {
  if (!qrId) return false;
  try {
    localStorage.setItem(
      guestActiveOrdersKey(qrId),
      JSON.stringify(Array.isArray(orders) ? orders : []),
    );
    return true;
  } catch (error) {
    console.warn("Could not save active customer orders", error);
    return false;
  }
};

const mergeMatchedOrder = (serverOrder, localOrder) => {
  const serverRank = STATUS_RANK[serverOrder?.status] ?? -1;
  const localRank = STATUS_RANK[localOrder?.status] ?? -1;
  return {
    ...localOrder,
    ...serverOrder,
    _id: serverOrder?._id || localOrder?._id,
    clientOrderId: serverOrder?.clientOrderId || localOrder?.clientOrderId,
    status: serverRank < localRank ? localOrder.status : serverOrder.status,
    items: mergeGuestOrderItems(serverOrder?.items, localOrder?.items),
    guestHandoffUntil: localOrder?.guestHandoffUntil,
    guestHandoffConfirmed: true,
  };
};

const uniqueServerOrders = (orders) => {
  const unique = [];
  orders.forEach((order) => {
    const index = unique.findIndex((candidate) => sameGuestOrder(candidate, order));
    if (index === -1) unique.push(order);
    else unique[index] = { ...unique[index], ...order };
  });
  return unique;
};

export const mergeGuestActiveOrders = (serverOrders, currentOrders, now = Date.now()) => {
  const server = uniqueServerOrders(Array.isArray(serverOrders) ? serverOrders : []);
  const current = Array.isArray(currentOrders) ? currentOrders : [];

  const mergedServer = server.map((serverOrder) => {
    const localOrder = current.find((order) => sameGuestOrder(order, serverOrder));
    return localOrder ? mergeMatchedOrder(serverOrder, localOrder) : serverOrder;
  });

  const retainedLocal = current.filter((localOrder) => (
    !mergedServer.some((order) => sameGuestOrder(order, localOrder)) &&
    Number(localOrder?.guestHandoffUntil || 0) > now
  ));

  return [...retainedLocal, ...mergedServer];
};

export const saveGuestOrderHandoff = (qrId, order, now = Date.now()) => {
  const handoff = {
    ...order,
    guestHandoffUntil: now + HANDOFF_TTL_MS,
  };
  const current = readGuestActiveOrders(qrId, now);
  const updated = [
    handoff,
    ...current.filter((item) => !sameGuestOrder(item, handoff)),
  ].slice(0, 20);
  writeGuestActiveOrders(qrId, updated);
  return handoff;
};
