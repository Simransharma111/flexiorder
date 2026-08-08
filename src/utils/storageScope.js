export const getStorageScope = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const userId = user?._id || user?.id || user?.email;
    const hotelId = user?.hotelId || user?.hotel?._id || user?.hotel?.id;
    const parts = [userId, hotelId].filter(Boolean).map(String);
    return parts.length ? parts.join(":") : "anonymous";
  } catch {
    return "anonymous";
  }
};

export const getScopedStorageKey = (baseKey) => (
  `${baseKey}:${encodeURIComponent(getStorageScope())}`
);
