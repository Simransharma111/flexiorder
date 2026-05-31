import {
  PushNotifications,
} from "@capacitor/push-notifications";

import { Device } from "@capacitor/device";

export const initFCM = async (api) => {

  try {

    const info =
      await Device.getInfo();

    // ONLY Android APK
    if (info.platform !== "android") {
      return;
    }

    let permission =
      await PushNotifications.requestPermissions();

    if (permission.receive !== "granted") {
      return;
    }

    await PushNotifications.register();

    // FCM TOKEN
    PushNotifications.addListener(
      "registration",
      async (token) => {

        console.log(
          "FCM TOKEN:",
          token.value
        );

        await api.post(
          "/notifications/save-token",
          {
            token: token.value,
          },
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

      }
    );

    // Notification while app open
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {

        console.log(notification);

        new Audio(
          "/orders_received.mp3"
        ).play();

      }
    );

  } catch (err) {
    console.log(err);
  }

};