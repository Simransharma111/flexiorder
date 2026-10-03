const initials = (name) => {
  const words = String(name || "").match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu) || [];
  if (!words.length) return "FO";
  const segments = (word) => typeof Intl.Segmenter !== "function" ? Array.from(word) : Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(word), part => part.segment);
  return (words.length === 1 ? segments(words[0]).slice(0, 3).join("")
    : words.slice(0, 3).map(word => segments(word)[0]).join("")).toUpperCase();
};

// A stable display reference, not a sequential invoice number or database key.
// Keep using the original IDs for API calls, retries and record matching.
export const orderNumber = (order, hotel = {}) => {
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
  const restaurantName = order?.restaurantName || order?.hotelName || order?.hotelId?.name || hotel?.name || hotel?.hotelName;
  return `${initials(restaurantName)}-${String(hash % 100000000).padStart(8, "0")}`;
};
