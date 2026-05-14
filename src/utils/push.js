export const subscribeToPush = async (api, hotelId) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register("/sw.js");

    const { data } = await api.get("/push/vapid");

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    await api.post("/push/subscribe", {
      hotelId,
      subscription,
    });
  } catch (err) {
    console.error("Push subscription failed:", err);
  }
};