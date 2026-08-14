const DEFAULT_TTL_MS = 5 * 60 * 1000;

export const orderAlertKey = (value) => {
  const data = value?.data && typeof value.data === "object" ? value.data : {};
  const key = data.orderId || value?._id || value?.id || value?.clientOrderId;
  return key ? String(key) : "";
};

export const notificationIdForKey = (key) => {
  const text = String(key || "order");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) & 0x7fffffff;
  }
  return hash || 1;
};

export const shouldRequestNotificationPermission = (status, previouslyRequested) =>
  ["prompt", "prompt-with-rationale"].includes(status) && previouslyRequested !== true;

export const createOrderAlertDeduper = ({
  ttlMs = DEFAULT_TTL_MS,
  now = () => Date.now(),
} = {}) => {
  const seenAt = new Map();

  return {
    claim(value) {
      const key = typeof value === "string" ? value : orderAlertKey(value);
      if (!key) return false;

      const currentTime = now();
      for (const [seenKey, timestamp] of seenAt) {
        if (currentTime - timestamp >= ttlMs) seenAt.delete(seenKey);
      }
      if (seenAt.has(key)) return false;
      seenAt.set(key, currentTime);
      return true;
    },
    clear() {
      seenAt.clear();
    },
  };
};
