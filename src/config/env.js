const normalizeBaseUrl = (value) => String(value || "").replace(/\/$/, "");

export const API_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL);
export const SOCKET_URL = normalizeBaseUrl(import.meta.env.VITE_SOCKET_URL);

export const getPublicAppUrl = () => {
  const configuredUrl = normalizeBaseUrl(import.meta.env.VITE_FRONTEND_URL);
  if (configuredUrl) return configuredUrl;

  return typeof window !== "undefined" ? window.location.origin : "";
};

if (import.meta.env.DEV && !API_URL) {
  console.info("VITE_API_URL is not configured; API requests use the current origin.");
}
