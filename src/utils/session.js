export const AUTH_CLEARED_EVENT = "flexiorder:auth-cleared";

const safeGetItem = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const safeRemoveItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
};

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return globalThis.atob(normalized + padding);
};

export const readJwtPayload = (token) => {
  if (!token || token.split(".").length !== 3) return null;

  try {
    return JSON.parse(decodeBase64Url(token.split(".")[1]));
  } catch {
    return null;
  }
};

export const isTokenExpired = (token, now = Date.now()) => {
  const payload = readJwtPayload(token);
  if (!payload && token?.split(".").length === 3) return true;
  return Number.isFinite(payload?.exp) && payload.exp * 1000 <= now;
};

export const isUnauthorizedResponse = (error) => error?.response?.status === 401;

export const clearAuthSession = ({ notify = true } = {}) => {
  safeRemoveItem("token");
  safeRemoveItem("user");
  safeRemoveItem("role");

  if (notify && typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
  }
};

export const clearSessionForUnauthorizedResponse = (error) => {
  if (!isUnauthorizedResponse(error)) return false;
  const requestToken = error?.config?._flexiorderAuthToken;
  const currentToken = safeGetItem("token");
  if (!requestToken || requestToken !== currentToken) return false;

  clearAuthSession();
  return true;
};

export const readStoredSession = () => {
  const token = safeGetItem("token");
  const storedUser = safeGetItem("user");

  if (!token || !storedUser || isTokenExpired(token)) {
    clearAuthSession({ notify: false });
    return { token: null, user: null };
  }

  try {
    return { token, user: JSON.parse(storedUser) };
  } catch {
    clearAuthSession({ notify: false });
    return { token: null, user: null };
  }
};

export const saveAuthSession = (user, token) => {
  const tokenSaved = safeSetItem("token", token);
  const userSaved = safeSetItem("user", JSON.stringify(user));
  return tokenSaved && userSaved;
};

export const getStoredAuthToken = () => safeGetItem("token");
