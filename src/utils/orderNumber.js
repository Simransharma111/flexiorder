// A stable display reference, not a sequential invoice number or database key.
// Keep using the original IDs for API calls, retries and record matching.
export const orderNumber = (order) => {
  const provided = order?.orderNumber;
  if ((typeof provided === "string" || typeof provided === "number") && String(provided).trim()) {
    return String(provided).trim();
  }
  const id = order?._id || order?.clientOrderId;
  if (!id) return "—";
  // Hash the whole identity: truncating a Mongo ID repeats across nearby orders.
  let hash = 2166136261;
  for (const char of String(id)) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  return `FO-${String(hash % 100000000).padStart(8, "0")}`;
};
