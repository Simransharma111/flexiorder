import api from "../api/axios";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (
    base64String + padding
  )
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) =>
      char.charCodeAt(0)
    )
  );
}

export const subscribeToPush =
  async () => {
    try {
      const permission =
        await Notification.requestPermission();

      if (permission !== "granted") {
        return;
      }

      const registration =
        await navigator.serviceWorker.ready;

      const vapidRes = await api.get(
        "/push/vapid"
      );

      const subscription =
        await registration.pushManager.subscribe(
          {
            userVisibleOnly: true,

            applicationServerKey:
              urlBase64ToUint8Array(
                vapidRes.data.publicKey
              ),
          }
        );

      await api.post(
        "/push/subscribe",
        {
          subscription,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "token"
            )}`,
          },
        }
      );

      console.log(
        "Push subscribed successfully"
      );
    } catch (err) {
      console.log(err);
    }
  };