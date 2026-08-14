import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { orderLocation } from "./orderModel";
import {
  createOrderAlertDeduper,
  notificationIdForKey,
  orderAlertKey,
  shouldRequestNotificationPermission,
} from "./orderAlerts";

export const ORDER_NOTIFICATION_CHANNEL_ID = "order_alerts_v3";
export const ORDER_NOTIFICATION_STATUS_EVENT = "flexiorder:order-notification-status";

const PUSH_PERMISSION_REQUESTED_KEY = "flexiorder_push_permission_requested";
const LOCAL_PERMISSION_REQUESTED_KEY = "flexiorder_local_notification_permission_requested";
const orderAlertDeduper = createOrderAlertDeduper();

let notificationStatus = {
  state: "unknown",
  message: "Phone notification status has not been checked yet.",
};
let apiClient = null;
let listenersInstalled = false;
let listenerInstallPromise = null;
let registrationRequested = false;
let initializationPromise = null;
let lastDeviceToken = "";
let lastSavedTokenKey = "";

const isAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const publishStatus = (state, message) => {
  notificationStatus = { state, message };
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(ORDER_NOTIFICATION_STATUS_EVENT, {
      detail: notificationStatus,
    }));
  }
  return notificationStatus;
};

export const getOrderNotificationStatus = () => notificationStatus;

const storageRead = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const storageWrite = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Permission flow remains usable when WebView storage is restricted.
  }
};

const currentAuthToken = () => storageRead("token") || (() => {
  try {
    return sessionStorage.getItem("token");
  } catch {
    return null;
  }
})();

const playOrderSound = async () => {
  try {
    const audio = new Audio("/orders_received.mp3");
    audio.volume = 1;
    await audio.play();
  } catch (error) {
    console.warn("Order alert audio could not play", error);
  }
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
  if (results.every((result) => result.status === "rejected")) {
    throw results[0].reason;
  }
};

const saveDeviceToken = async (tokenValue) => {
  const token = String(tokenValue || "").trim();
  if (!token) return;
  lastDeviceToken = token;

  const authToken = currentAuthToken();
  if (!apiClient || !authToken) return;
  const saveKey = `${authToken}:${token}`;
  if (saveKey === lastSavedTokenKey) return;

  try {
    const response = await apiClient.post(
      "/notifications/save-token",
      { token },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    lastSavedTokenKey = saveKey;
    if (response.data?.pushReady === false) {
      publishStatus(
        "error",
        "This phone is registered, but server push alerts need administrator attention.",
      );
    } else {
      publishStatus("enabled", "Phone order notifications are enabled.");
    }
  } catch (error) {
    publishStatus(
      "error",
      error?.response?.data?.message || "Phone notification registration could not reach the server.",
    );
    console.warn("FCM token could not be saved", error);
  }
};

const scheduleLocalAlert = async ({ key, title, body }) => {
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") {
    publishStatus("denied", "Phone notifications are off. Enable them in Android app settings.");
    return false;
  }

  await LocalNotifications.schedule({
    notifications: [{
      id: notificationIdForKey(key),
      title: title || "New Order",
      body: body || "You received a new order.",
      channelId: ORDER_NOTIFICATION_CHANNEL_ID,
      sound: "orders_received.mp3",
      smallIcon: "ic_stat_order",
      iconColor: "#F97316",
      autoCancel: true,
      extra: { orderId: key },
    }],
  });
  return true;
};

const installPushListeners = async () => {
  if (listenersInstalled) return;
  if (listenerInstallPromise) return listenerInstallPromise;

  listenerInstallPromise = (async () => {
    const handles = [];
    try {
      handles.push(await PushNotifications.addListener("registration", ({ value }) => {
        saveDeviceToken(value);
      }));
      handles.push(await PushNotifications.addListener("registrationError", (error) => {
        registrationRequested = false;
        publishStatus("error", "Android could not register this phone for order notifications.");
        console.warn("FCM registration failed", error);
      }));
      handles.push(await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
        const key = orderAlertKey(notification);
        if (!orderAlertDeduper.claim(key)) return;
        await playOrderSound();
        try {
          await scheduleLocalAlert({
            key,
            title: notification.title || "New Order",
            body: notification.body || "You received a new order.",
          });
        } catch (error) {
          publishStatus("error", "A foreground order arrived, but its phone alert could not be shown.");
          console.warn("Foreground order notification failed", error);
        }
      }));
      listenersInstalled = true;
    } catch (error) {
      await Promise.allSettled(handles.map((handle) => handle.remove()));
      throw error;
    } finally {
      listenerInstallPromise = null;
    }
  })();
  return listenerInstallPromise;
};

const ensurePermission = async () => {
  let pushPermission = await PushNotifications.checkPermissions();
  if (shouldRequestNotificationPermission(
    pushPermission.receive,
    storageRead(PUSH_PERMISSION_REQUESTED_KEY) === "yes",
  )) {
    storageWrite(PUSH_PERMISSION_REQUESTED_KEY, "yes");
    pushPermission = await PushNotifications.requestPermissions();
  }
  if (pushPermission.receive !== "granted") {
    return publishStatus(
      "denied",
      "Phone notifications are off. Enable them in Android app settings so new orders are not missed.",
    );
  }

  let localPermission = await LocalNotifications.checkPermissions();
  if (shouldRequestNotificationPermission(
    localPermission.display,
    storageRead(LOCAL_PERMISSION_REQUESTED_KEY) === "yes",
  )) {
    storageWrite(LOCAL_PERMISSION_REQUESTED_KEY, "yes");
    localPermission = await LocalNotifications.requestPermissions();
  }
  if (localPermission.display !== "granted") {
    return publishStatus(
      "denied",
      "Phone notifications are off. Enable them in Android app settings so new orders are not missed.",
    );
  }
  return publishStatus("enabled", "Phone order notifications are enabled.");
};

const initializeAndroidNotifications = async () => {
  await createOrderChannels();
  await installPushListeners();
  const permission = await ensurePermission();
  if (permission.state !== "enabled") return permission;

  if (lastDeviceToken) await saveDeviceToken(lastDeviceToken);
  if (!registrationRequested) {
    registrationRequested = true;
    try {
      await PushNotifications.register();
    } catch (error) {
      registrationRequested = false;
      throw error;
    }
  }
  return getOrderNotificationStatus();
};

export const initFCM = async (api) => {
  apiClient = api;
  if (!isAndroid()) return publishStatus("unsupported", "Phone alerts are managed by the browser.");
  if (initializationPromise) return initializationPromise;

  initializationPromise = initializeAndroidNotifications()
    .catch((error) => {
      console.warn("Android notification setup failed", error);
      return publishStatus("error", "Phone notifications could not be set up on this device.");
    })
    .finally(() => {
      initializationPromise = null;
    });
  return initializationPromise;
};

export const triggerLocalOrderNotification = async (order) => {
  const key = orderAlertKey(order);
  if (!key || !orderAlertDeduper.claim(key)) return false;

  await playOrderSound();
  if (!isAndroid()) return true;

  const count = (Array.isArray(order?.items) ? order.items : [])
    .reduce((sum, item) => sum + Math.max(0, Number(item?.quantity) || 0), 0);
  try {
    return await scheduleLocalAlert({
      key,
      title: `New Order · ${orderLocation(order)}`,
      body: `${count || 1} item${count === 1 ? "" : "s"} received.`,
    });
  } catch (error) {
    publishStatus("error", "A new order arrived, but its phone alert could not be shown.");
    console.warn("Local order notification failed", error);
    return false;
  }
};
