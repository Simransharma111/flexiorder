import {
  PushNotifications,
} from "@capacitor/push-notifications";

import { Device } from "@capacitor/device";

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
    // REQUEST PERMISSION
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

          // GET TOKEN FROM BOTH STORAGES
          const authToken =
            localStorage.getItem(
              "token"
            ) ||
            sessionStorage.getItem(
              "token"
            );

          // NO LOGIN TOKEN
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
      (notification) => {

        console.log(
          "Notification Received",
          notification
        );

        // PLAY SOUND
        try {

          const audio =
            new Audio(
              "/orders_received.mp3"
            );

          audio.play();

        } catch (err) {

          console.log(
            "Audio play failed"
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

        // OPTIONAL:
        // Navigate to kitchen/orders page here

      }
    );

  } catch (err) {

    console.log(
      "FCM INIT ERROR",
      err
    );

  }

};