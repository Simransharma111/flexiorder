/* global clients */
const SHELL_CACHE = "flexiorder-shell-v3";
const ASSET_CACHE = "flexiorder-assets-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.jpg",
  "/icon512.jpg",
  "/logo.jpg",
  "/orders_received.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => ![SHELL_CACHE, ASSET_CACHE].includes(key))
        .map((key) => caches.delete(key))
    ))
  );
});

const isPrivateRequest = (request, url) => (
  request.headers.has("authorization") ||
  url.pathname.startsWith("/api/") ||
  url.pathname.startsWith("/socket.io/")
);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivateRequest(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  if (!["script", "style", "image", "font", "audio"].includes(request.destination)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "New Notification", body: "" };

  try {
    data = event.data ? event.data.json() : data;
  } catch (error) {
    console.error("Push parse error", error);
  }

  event.waitUntil(self.registration.showNotification(data.title || "FlexiOrder", {
    body: data.body,
    icon: "/icon-192.jpg",
    badge: "/icon-192.jpg",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let safeUrl = self.location.origin;
  try {
    const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin);
    if (targetUrl.origin === self.location.origin) safeUrl = targetUrl.href;
  } catch (error) {
    console.warn("Invalid notification URL", error);
  }
  event.waitUntil(clients.openWindow(safeUrl));
});
