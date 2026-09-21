import orderSoundUrl from "../assets/order-notification.mp3";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { getHomePathForRole } from "../constants/roles";
import { orderLocation } from "./orderModel";
import {
  createOrderAlertDeduper,
  notificationIdForKey,
  orderAlertKey,
  shouldRequestNotificationPermission,
} from "./orderAlerts";

export const ORDER_NOTIFICATION_CHANNEL_ID = "order_alerts_v4";
export const ORDER_NOTIFICATION_STATUS_EVENT = "flexiorder:order-notification-status";

const PUSH_PERMISSION_REQUESTED_KEY = "flexiorder_push_permission_requested";
const LOCAL_PERMISSION_REQUESTED_KEY = "flexiorder_local_notification_permission_requested";
const DEVICE_ID_KEY = "flexiorder_push_device_id";
const DEVICE_TOKEN_KEY = "flexiorder_push_device_token";
const MAX_RETRY_ATTEMPTS = 4;
const RETRY_BASE_MS = 1000;
const orderAlertDeduper = createOrderAlertDeduper();

let notificationStatus = { state: "unknown", message: "Phone notification status has not been checked yet." };
let apiClient = null;
let listenersInstalled = false;
let listenerInstallPromise = null;
let lifecycleInstalled = false;
let registrationRequested = false;
let registrationAttempts = 0;
let sessionCleanup = Promise.resolve();
let initializationPromise = null;
let deviceIdPromise = null;
let lastDeviceToken = "";
let lastSavedTokenKey = "";
let saveInFlightKey = "";
let saveInFlightPromise = null;
let saveRetryTimer = null;
let registrationRetryTimer = null;
let authGeneration = 0;

const isAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const publishStatus = (state, message) => {
  notificationStatus = { state, message };
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(ORDER_NOTIFICATION_STATUS_EVENT, { detail: notificationStatus }));
  }
  return notificationStatus;
};

export const getOrderNotificationStatus = () => notificationStatus;

const storageRead = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const storageWrite = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* Keep setup usable with restricted storage. */ }
};
const currentAuthToken = () => storageRead("token") || (() => {
  try { return sessionStorage.getItem("token"); } catch { return null; }
})();
const currentUser = () => {
  try { return JSON.parse(storageRead("user") || "null"); } catch { return null; }
};
const retryDelay = (attempt) => Math.min(RETRY_BASE_MS * (2 ** Math.max(0, attempt - 1)), 30_000);
const isRetryableRequestError = (error) => {
  const status = Number(error?.response?.status || 0);
  return !status || status === 408 || status === 429 || status >= 500;
};
const cancelRetryTimers = () => {
  if (saveRetryTimer) clearTimeout(saveRetryTimer);
  if (registrationRetryTimer) clearTimeout(registrationRetryTimer);
  saveRetryTimer = null;
  registrationRetryTimer = null;
};

const getDeviceId = async () => {
  const stored = storageRead(DEVICE_ID_KEY);
  if (stored) return stored;
  if (deviceIdPromise) return deviceIdPromise;
  deviceIdPromise = (async () => {
    let identifier = "";
    try { identifier = String((await Device.getId())?.identifier || ""); } catch { /* Use generated ID. */ }
    const generated = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const value = `android-${identifier || generated}`.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 200);
    storageWrite(DEVICE_ID_KEY, value);
    return value;
  })().finally(() => { deviceIdPromise = null; });
  return deviceIdPromise;
};

const playOrderSound = async () => {
  try {
    const audio = new Audio(orderSoundUrl);
    audio.volume = 1;
    await audio.play();
  } catch (error) { console.warn("Order alert audio could not play", error); }
};

const createOrderChannels = async () => {
  const channel = {
    id: ORDER_NOTIFICATION_CHANNEL_ID,
    name: "New Order Alerts",
    description: "High-priority alerts for new restaurant orders",
    importance: 5,
    sound: "orders_received.mp3",
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: "#F97316",
  };
  const results = await Promise.allSettled([
    PushNotifications.createChannel(channel),
    LocalNotifications.createChannel(channel),
  ]);
  if (results.every((result) => result.status === "rejected")) throw results[0].reason;
};

const scheduleSaveRetry = (token, attempt, generation) => {
  if (attempt >= MAX_RETRY_ATTEMPTS || generation !== authGeneration) return;
  if (saveRetryTimer) clearTimeout(saveRetryTimer);
  saveRetryTimer = setTimeout(() => {
    saveRetryTimer = null;
    if (token === lastDeviceToken) void saveDeviceToken(token, attempt + 1, generation);
  }, retryDelay(attempt));
};

const saveDeviceToken = async (tokenValue, attempt = 1, generation = authGeneration) => {
  const token = String(tokenValue || "").trim();
  if (!token) return false;
  if (generation !== authGeneration) return false;
  lastDeviceToken = token;
  storageWrite(DEVICE_TOKEN_KEY, token);
  await sessionCleanup;
  const authToken = currentAuthToken();
  if (!apiClient || !authToken || generation !== authGeneration) return false;
  const deviceId = await getDeviceId();
  if (generation !== authGeneration || authToken !== currentAuthToken()) return false;
  const saveKey = `${authToken}:${deviceId}:${token}`;
  if (saveKey === lastSavedTokenKey) {
    publishStatus("enabled", "Phone order notifications are enabled.");
    return true;
  }
  if (saveKey === saveInFlightKey && saveInFlightPromise) return saveInFlightPromise;

  if (saveInFlightPromise) await saveInFlightPromise;
  if (generation !== authGeneration || authToken !== currentAuthToken() || token !== lastDeviceToken) return false;
  saveInFlightKey = saveKey;
  saveInFlightPromise = apiClient.post(
    "/notifications/save-token",
    { token, deviceId, platform: "android" },
    { headers: { Authorization: `Bearer ${authToken}` }, timeout: 10_000 },
  ).then((response) => {
    if (generation !== authGeneration || authToken !== currentAuthToken()) return false;
    lastSavedTokenKey = saveKey;
    if (response.data?.pushReady === false) {
      publishStatus("error", "This phone is registered, but server push alerts need administrator attention.");
      return false;
    }
    publishStatus("enabled", "Phone order notifications are enabled.");
    return true;
  }).catch((error) => {
    if (generation !== authGeneration || authToken !== currentAuthToken()) return false;
    if (isRetryableRequestError(error) && attempt < MAX_RETRY_ATTEMPTS) {
      publishStatus("registering", "Finishing phone notification setup…");
      scheduleSaveRetry(token, attempt, generation);
    } else {
      publishStatus("error", error?.response?.data?.message || "Phone notification registration could not reach the server.");
    }
    console.warn("FCM token registration failed", { status: error?.response?.status || "network", attempt });
    return false;
  }).finally(() => {
    if (saveInFlightKey === saveKey) {
      saveInFlightKey = "";
      saveInFlightPromise = null;
    }
  });
  return saveInFlightPromise;
};

const scheduleLocalAlert = async ({ key, title, body }) => {
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") {
    publishStatus("denied", "Phone notifications are off. Enable them in Android app settings.");
    return false;
  }
  await LocalNotifications.schedule({ notifications: [{
    id: notificationIdForKey(key), title: title || "New Order", body: body || "You received a new order.",
    channelId: ORDER_NOTIFICATION_CHANNEL_ID, sound: "orders_received.mp3", smallIcon: "ic_stat_order",
    iconColor: "#F97316", autoCancel: true, extra: { orderId: key },
  }] });
  return true;
};

const openNotificationDestination = () => {
  if (!currentAuthToken()) return;
  const path = getHomePathForRole(currentUser()?.role);
  if (!path || path === "/" || typeof window === "undefined") return;
  if (window.location.pathname !== path) window.location.assign(path);
};

const scheduleRegistrationRetry = (attempt, generation) => {
  if (attempt >= MAX_RETRY_ATTEMPTS || generation !== authGeneration) return;
  if (registrationRetryTimer) clearTimeout(registrationRetryTimer);
  registrationRetryTimer = setTimeout(() => {
    registrationRetryTimer = null;
    void requestRegistration(attempt + 1, generation);
  }, retryDelay(attempt));
};

const requestRegistration = async (attempt = 1, generation = authGeneration) => {
  if (registrationRequested || generation !== authGeneration || !currentAuthToken()) return;
  if (registrationAttempts >= MAX_RETRY_ATTEMPTS) return;
  registrationAttempts = attempt;
  registrationRequested = true;
  try { await PushNotifications.register(); } catch {
    registrationRequested = false;
    if (attempt < MAX_RETRY_ATTEMPTS) {
      publishStatus("registering", "Finishing phone notification setup…");
      scheduleRegistrationRetry(attempt, generation);
    } else publishStatus("error", "Android could not register this phone for order notifications.");
    console.warn("FCM registration failed", { attempt });
  }
};

const installPushListeners = async () => {
  if (listenersInstalled) return;
  if (listenerInstallPromise) return listenerInstallPromise;
  listenerInstallPromise = (async () => {
    const handles = [];
    try {
      handles.push(await PushNotifications.addListener("registration", ({ value }) => {
        registrationRequested = true;
        if (registrationRetryTimer) clearTimeout(registrationRetryTimer);
        registrationRetryTimer = null;
        return saveDeviceToken(value);
      }));
      handles.push(await PushNotifications.addListener("registrationError", () => {
        registrationRequested = false;
        if (registrationAttempts < MAX_RETRY_ATTEMPTS) {
          publishStatus("registering", "Android is retrying notification setup…");
          scheduleRegistrationRetry(registrationAttempts || 1, authGeneration);
        } else publishStatus("error", "Android could not register this phone. Tap Check again to retry.");
      }));
      handles.push(await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
        const user = currentUser();
        const hotelId = user?.hotelId?._id || user?.hotelId;
        if (!currentAuthToken() || !["owner", "staff"].includes(user?.role)) return;
        if (hotelId && notification.data?.hotelId && String(hotelId) !== String(notification.data.hotelId)) return;
        const key = orderAlertKey(notification);
        if (!orderAlertDeduper.claim(key)) return;
        void playOrderSound();
        try { await scheduleLocalAlert({ key, title: notification.title, body: notification.body }); }
        catch (error) {
          publishStatus("error", "A foreground order arrived, but its phone alert could not be shown.");
          console.warn("Foreground order notification failed", error);
        }
      }));
      handles.push(await PushNotifications.addListener("pushNotificationActionPerformed", openNotificationDestination));
      handles.push(await LocalNotifications.addListener("localNotificationActionPerformed", openNotificationDestination));
      listenersInstalled = true;
    } catch (error) {
      await Promise.allSettled(handles.map((handle) => handle.remove()));
      throw error;
    } finally { listenerInstallPromise = null; }
  })();
  return listenerInstallPromise;
};

const ensurePermission = async ({ forcePrompt = false } = {}) => {
  let pushPermission = await PushNotifications.checkPermissions();
  if (shouldRequestNotificationPermission(
    pushPermission.receive,
    forcePrompt ? false : storageRead(PUSH_PERMISSION_REQUESTED_KEY) === "yes",
  )) {
    storageWrite(PUSH_PERMISSION_REQUESTED_KEY, "yes");
    pushPermission = await PushNotifications.requestPermissions();
  }
  if (pushPermission.receive !== "granted") {
    return publishStatus("denied", "Phone notifications are off. Enable them in Android app settings, then tap Check again.");
  }
  let localPermission = await LocalNotifications.checkPermissions();
  if (shouldRequestNotificationPermission(
    localPermission.display,
    forcePrompt ? false : storageRead(LOCAL_PERMISSION_REQUESTED_KEY) === "yes",
  )) {
    storageWrite(LOCAL_PERMISSION_REQUESTED_KEY, "yes");
    localPermission = await LocalNotifications.requestPermissions();
  }
  if (localPermission.display !== "granted") {
    return publishStatus("denied", "Phone notifications are off. Enable them in Android app settings, then tap Check again.");
  }
  return { state: "granted" };
};

const initializeAndroidNotifications = async (options) => {
  await createOrderChannels();
  await installPushListeners();
  const permission = await ensurePermission(options);
  if (permission.state !== "granted") return permission;
  if (!lastSavedTokenKey) publishStatus("registering", "Finishing phone notification setup…");
  lastDeviceToken ||= storageRead(DEVICE_TOKEN_KEY) || "";
  if (lastDeviceToken) await saveDeviceToken(lastDeviceToken);
  void requestRegistration();
  return getOrderNotificationStatus();
};

const installLifecycleRetry = () => {
  if (lifecycleInstalled || typeof window === "undefined") return;
  lifecycleInstalled = true;
  const recover = () => {
    if (!registrationRequested) registrationAttempts = 0;
    if (apiClient && currentAuthToken()) void initFCM(apiClient);
  };
  window.addEventListener("online", recover);
  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) recover();
  }).catch(() => {});
};

export const initFCM = async (api, options = {}) => {
  apiClient = api;
  if (!isAndroid()) return publishStatus("unsupported", "Phone alerts are managed by the browser.");
  installLifecycleRetry();
  if (initializationPromise) return initializationPromise;
  initializationPromise = initializeAndroidNotifications(options)
    .catch((error) => {
      console.warn("Android notification setup failed", error);
      return publishStatus("error", "Phone notifications could not be set up on this device.");
    }).finally(() => { initializationPromise = null; });
  return initializationPromise;
};

export const recheckOrderNotifications = async () => {
  if (!apiClient) return getOrderNotificationStatus();
  registrationRequested = false;
  registrationAttempts = 0;
  lastSavedTokenKey = "";
  return initFCM(apiClient, { forcePrompt: true });
};

export const endNotificationSession = (authToken) => {
  const token = lastDeviceToken || storageRead(DEVICE_TOKEN_KEY) || "";
  const client = apiClient;
  const pendingSave = saveInFlightPromise;
  authGeneration += 1;
  cancelRetryTimers();
  registrationRequested = false;
  registrationAttempts = 0;
  lastSavedTokenKey = "";
  saveInFlightKey = "";
  saveInFlightPromise = null;
  orderAlertDeduper.clear();
  publishStatus("unknown", "Phone notification status has not been checked yet.");
  if (!client || !authToken || !token) return Promise.resolve(false);
  sessionCleanup = Promise.resolve(pendingSave).catch(() => false).then(getDeviceId).then((deviceId) => client.delete("/notifications/token", {
    data: { deviceId }, headers: { Authorization: `Bearer ${authToken}` }, skipAuth: true, timeout: 10_000,
  })).then(() => true).catch((error) => {
    console.warn("Phone notification cleanup could not reach the server", { status: error?.response?.status || "network" });
    return false;
  });
  return sessionCleanup;
};

export const triggerLocalOrderNotification = async (order) => {
  const key = orderAlertKey(order);
  if (!key || !orderAlertDeduper.claim(key)) return false;
  void playOrderSound();
  if (!isAndroid()) return true;
  const count = (Array.isArray(order?.items) ? order.items : [])
    .reduce((sum, item) => sum + Math.max(0, Number(item?.quantity) || 0), 0);
  try {
    return await scheduleLocalAlert({ key, title: `New Order · ${orderLocation(order)}`,
      body: `${count || 1} item${count === 1 ? "" : "s"} received.` });
  } catch (error) {
    publishStatus("error", "A new order arrived, but its phone alert could not be shown.");
    console.warn("Local order notification failed", error);
    return false;
  }
};
