export const subscribeToPush = async (api) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register("/sw.js");

    // 🔥 GET KEY FROM BACKEND (IMPORTANT)
    const { data } = await api.get("/push/vapid");

    const publicKey = data.publicKey;

    if (!publicKey) {
      console.error("VAPID public key missing");
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await api.post("/push/subscribe", subscription);
  } catch (err) {
    console.error("Push subscription failed:", err);
  }
};