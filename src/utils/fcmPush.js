import {
  PushNotifications,
} from "@capacitor/push-notifications";

import { Device } from "@capacitor/device";

import {
  LocalNotifications,
} from "@capacitor/local-notifications";

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

    // =========================
    // LOCAL NOTIFICATION PERMISSION
    // =========================

    await LocalNotifications.requestPermissions();

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

          console.log(
            "FCM TOKEN:",
            token.value
          );

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