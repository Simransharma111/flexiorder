import {
  PushNotifications,
} from "@capacitor/push-notifications";

import { Device } from "@capacitor/device";

import {
  LocalNotifications,
} from "@capacitor/local-notifications";

import { orderLocation } from "./orderModel";

export const initFCM = async (api) => {

  try {

    // =========================
    // DEVICE INFO
    // =========================

    const info =
      await Device.getInfo();

    // ONLY FOR ANDROID APK
    if (info.platform !== "android") {

      console.log(
        "FCM only enabled on Android"
      );

      return;
    }

    // =========================
    // PUSH PERMISSION
    // =========================

    const permission =
      await PushNotifications.requestPermissions();

    if (
      permission.receive !== "granted"
    ) {

      console.log(
        "Notification permission denied"
      );

      return;
    }

    await LocalNotifications.requestPermissions();

    // CREATE HIGH IMPORTANCE CHANNEL FOR ORDER ALERTS
    try {
      await LocalNotifications.createChannel({
        id: "orders",
        name: "Order Alerts",
        description: "Get alerts when new orders are placed",
        importance: 5,
        sound: "orders_received.mp3",
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: "#F97316",
      });
      console.log("Local notification channel 'orders' created successfully");
    } catch (channelErr) {
      console.warn("Could not create local notification channel", channelErr);
    }

    // =========================
    // REGISTER DEVICE
    // =========================

    await PushNotifications.register();

    // =========================
    // TOKEN RECEIVED
    // =========================

    PushNotifications.addListener(
      "registration",
      async (token) => {

        try {

          const authToken =
            localStorage.getItem(
              "token"
            ) ||
            sessionStorage.getItem(
              "token"
            );

          if (!authToken) {

            console.log(
              "No auth token found"
            );

            return;

          }

          // SAVE TOKEN TO DATABASE

          await api.post(
            "/notifications/save-token",
            {
              token: token.value,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${authToken}`,
              },
            }
          );

          console.log(
            "FCM token saved successfully"
          );

        } catch (err) {

          console.log(
            "Failed to save FCM token",
            err
          );

        }

      }
    );

    // =========================
    // REGISTRATION ERROR
    // =========================

    PushNotifications.addListener(
      "registrationError",
      (err) => {

        console.log(
          "FCM Registration Error",
          err
        );

      }
    );

    // =========================
    // FOREGROUND NOTIFICATION
    // =========================

    PushNotifications.addListener(
      "pushNotificationReceived",
      async (notification) => {

        console.log(
          "Notification Received",
          notification
        );

        try {

          // PLAY SOUND INSIDE APP

          const audio =
            new Audio(
              "/orders_received.mp3"
            );

          audio.play();

        } catch (err) {

          console.log(
            "Audio play failed",
            err
          );

        }

        // SHOW SYSTEM NOTIFICATION

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

                sound:
                  "orders_received.mp3",

                channelId:
                  "orders",

                smallIcon:
                  "ic_launcher",

                iconColor:
                  "#F97316",
              },
            ],
          });

        } catch (err) {

          console.log(
            "Local notification failed",
            err
          );

        }

      }
    );

    // =========================
    // NOTIFICATION CLICK
    // =========================

    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification) => {

        console.log(
          "Notification Clicked",
          notification
        );

      }
    );

  } catch (err) {

    console.log(
      "FCM INIT ERROR",
      err
    );

  }

};

export const triggerLocalOrderNotification = async (order) => {
  if (!order) return;

  // 1. Play audio in frontend
  try {
    const audio = new Audio("/orders_received.mp3");
    await audio.play();
  } catch (err) {
    console.warn("Audio play blocked/failed", err);
  }

  // 2. Schedule native local notification
  try {
    const location = orderLocation(order);
    const count = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: `New Order - ${location}`,
          body: `Received an order with ${count} items.`,
          sound: "orders_received.mp3",
          channelId: "orders",
          smallIcon: "ic_launcher",
          iconColor: "#F97316",
        },
      ],
    });
  } catch (err) {
    console.log("Local notification trigger failed", err);
  }
};
