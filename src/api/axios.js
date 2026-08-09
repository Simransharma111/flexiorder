import axios from "axios";
import {
  clearAuthSession,
  clearSessionForUnauthorizedResponse,
  getStoredAuthToken,
} from "../utils/session";
import { API_URL } from "../config/env";
import {
  reportApiFailure,
  reportApiRequest,
  reportApiSuccess,
} from "../utils/connectivity";

const api = axios.create({
  baseURL: API_URL || undefined,
});

api.interceptors.request.use(
  (config) => {
    reportApiRequest();
    const token = getStoredAuthToken();

    // Always attach the token and let the server decide via 401 if it's
    // expired. Client-side expiry checks cause premature logouts when the
    // backend uses longer TTLs or rolling tokens.
    if (!config.skipAuth && token) {
      config.headers.Authorization = `Bearer ${token}`;
      config._flexiorderAuthToken = token;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    reportApiSuccess();
    return response;
  },
  (error) => {
    reportApiFailure(error);
    clearSessionForUnauthorizedResponse(error);
    return Promise.reject(error);
  }
);

export default api;
