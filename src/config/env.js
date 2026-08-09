const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const productionDefaults = import.meta.env.PROD
  ? {
      api: "https://flexibackend.onrender.com/api",
      socket: "https://flexibackend.onrender.com",
      frontend: "https://flexiorder.vercel.app",
    }
  : {};

export const API_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_URL,
) || normalizeBaseUrl(productionDefaults.api);
export const SOCKET_URL = normalizeBaseUrl(
  import.meta.env.VITE_SOCKET_URL,
) || normalizeBaseUrl(productionDefaults.socket);
const FRONTEND_URL = normalizeBaseUrl(
  import.meta.env.VITE_FRONTEND_URL,
) || normalizeBaseUrl(productionDefaults.frontend);

export const getPublicAppUrl = () => {
  if (FRONTEND_URL) return FRONTEND_URL;

  return typeof window !== "undefined" ? window.location.origin : "";
};

if (import.meta.env.DEV && !API_URL) {
  console.info("VITE_API_URL is not configured; API requests use the current origin.");
}
