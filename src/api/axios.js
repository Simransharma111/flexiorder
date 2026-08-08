import axios from "axios";
import {
  clearAuthSession,
  clearSessionForUnauthorizedResponse,
  getStoredAuthToken,
  isTokenExpired,
} from "../utils/session";
import { API_URL } from "../config/env";

const api = axios.create({
  baseURL: API_URL || undefined,
});

api.interceptors.request.use(
  (config) => {
    const token = getStoredAuthToken();

    if (!config.skipAuth && token && !isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
      config._flexiorderAuthToken = token;
    } else if (token) {
      if (isTokenExpired(token)) clearAuthSession();
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    clearSessionForUnauthorizedResponse(error);
    return Promise.reject(error);
  }
);

export default api;
