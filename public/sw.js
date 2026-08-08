self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("flexiorder-shell-v1").then((cache) =>
      cache.addAll(["/", "/index.html", "/manifest.json"])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open("flexiorder-shell-v1").then((cache) =>
          cache.put(event.request, copy)
        );
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) =>
        cached || caches.match("/index.html")
      ))
  );
});

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
