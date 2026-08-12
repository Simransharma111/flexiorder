import { PushNotifications } from "@capacitor/push-notifications";
import { Device } from "@capacitor/device";
import { LocalNotifications } from "@capacitor/local-notifications";
import { orderLocation } from "./orderModel";

const ORDER_CHANNEL_ID = "order_alerts_v2";

export const initFCM = async (api) => {
  try {
    // =========================
    // DEVICE INFO
    // =========================

    const info = await Device.getInfo();

    if (info.platform !== "android") {
      console.log("FCM only enabled on Android");
      return;
    }

    console.log("Initializing Android FCM...");

    // =========================
    // NOTIFICATION PERMISSION
    // =========================

    const pushPermission =
      await PushNotifications.requestPermissions();

    if (pushPermission.receive !== "granted") {
      console.log("Push notification permission denied");
      return;
    }

    const localPermission =
      await LocalNotifications.requestPermissions();

    if (localPermission.display !== "granted") {
      console.log("Local notification permission denied");
    }

    // =========================
    // CREATE NOTIFICATION CHANNEL
    // =========================

    try {
      await LocalNotifications.createChannel({
        id: ORDER_CHANNEL_ID,
        name: "New Order Alerts",
        description: "Alerts for new restaurant orders",
        importance: 5,
        sound: "orders_received",
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: "#F97316",
      });

      console.log(
        "Order notification channel created:",
        ORDER_CHANNEL_ID
      );
    } catch (err) {
      console.warn(
        "Notification channel creation failed:",
        err
      );
    }

    // =========================
    // PUSH LISTENERS
    // =========================

    await PushNotifications.addListener(
      "registration",
      async (token) => {
        console.log(
          "FCM TOKEN:",
          token.value
        );

        try {
          const authToken =
            localStorage.getItem("token") ||
            sessionStorage.getItem("token");

          if (!authToken) {
            console.log("No auth token found");
            return;
          }

          await api.post(
            "/notifications/save-token",
            {
              token: token.value,
            },
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          );

          console.log(
            "FCM token saved successfully"
          );
        } catch (err) {
          console.error(
            "Failed to save FCM token:",
            err
          );
        }
      }
    );

    await PushNotifications.addListener(
      "registrationError",
      (err) => {
        console.error(
          "FCM registration error:",
          err
        );
      }
    );

    // =========================
    // FOREGROUND PUSH
    // =========================

    await PushNotifications.addListener(
      "pushNotificationReceived",
      async (notification) => {
        console.log(
          "FOREGROUND PUSH RECEIVED:",
          notification
        );

        // -------------------------
        // PLAY WEBVIEW AUDIO
        // -------------------------

        try {
          const audio = new Audio(
            "/orders_received.mp3"
          );

          audio.volume = 1.0;

          await audio.play();

          console.log(
            "Order audio played"
          );
        } catch (err) {
          console.warn(
            "WebView audio failed:",
            err
          );
        }

        // -------------------------
        // SHOW NATIVE NOTIFICATION
        // -------------------------

        try {
          await LocalNotifications.schedule({
            notifications: [
              {
                id: Date.now(),

                title:
                  notification.title ||
                  "New Order",

                body:
                  notification.body ||
                  "You received a new order",

                channelId:
                  ORDER_CHANNEL_ID,

                sound:
                  "orders_received",

                smallIcon:
                  "ic_launcher",

                iconColor:
                  "#F97316",

                autoCancel: true,
              },
            ],
          });

          console.log(
            "Local order notification scheduled"
          );
        } catch (err) {
          console.error(
            "Local notification failed:",
            err
          );
        }
      }
    );

    // =========================
    // NOTIFICATION CLICK
    // =========================

    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (event) => {
        console.log(
          "Notification clicked:",
          event
        );
      }
    );

    // =========================
    // REGISTER
    // =========================

    await PushNotifications.register();

    console.log(
      "FCM registration requested"
    );

  } catch (err) {
    console.error(
      "FCM INIT ERROR:",
      err
    );
  }
};

// =====================================================
// LOCAL ORDER ALERT
// =====================================================

export const triggerLocalOrderNotification = async (
  order
) => {
  if (!order) return;

  // =========================
  // WEBVIEW AUDIO
  // =========================

  try {
    const audio = new Audio(
      "/orders_received.mp3"
    );

    audio.volume = 1.0;

    await audio.play();

    console.log(
      "Local order audio played"
    );
  } catch (err) {
    console.warn(
      "Local order audio failed:",
      err
    );
  }

  // =========================
  // NATIVE NOTIFICATION
  // =========================

  try {
    const location = orderLocation(order);

    const count = (
      order.items || []
    ).reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 1),
      0
    );

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),

          title:
            `New Order - ${location}`,

          body:
            `Received an order with ${count} items.`,

          channelId:
            ORDER_CHANNEL_ID,

          sound:
            "orders_received",

          smallIcon:
            "ic_launcher",

          iconColor:
            "#F97316",

          autoCancel: true,
        },
      ],
    });

    console.log(
      "Native order notification sent"
    );
  } catch (err) {
    console.error(
      "Local notification trigger failed:",
      err
    );
  }
};