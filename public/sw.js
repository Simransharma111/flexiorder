self.addEventListener("push", (event) => {
  let data = {
    title: "New Notification",
    body: "",
  };

  try {
    data = event.data
      ? event.data.json()
      : data;
  } catch (err) {
    console.error("Push parse error", err);
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title,
      {
        body: data.body,

        icon: "/icon-192.png",

        badge: "/icon-192.png",

        vibrate: [200, 100, 200],

        data: {
          url: data.url || "/",
        },
      }
    )
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    event.waitUntil(
      clients.openWindow(
        event.notification.data.url
      )
    );
  }
);