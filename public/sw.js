// Service worker for Web Push. Registered once from lib/push.ts; stays alive
// in the background so notifications show up even with every admin tab
// closed — the whole point of "push" over the in-app bell dropdown.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Artisan Admin", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Artisan Admin";
  // No bundled icon file yet — omitting these falls back to the OS/browser
  // default rather than a broken image request. Add /public/icon-192.png
  // and point these at it once branded artwork exists.
  const options = {
    body: payload.body || "",
    tag: payload.tag || undefined,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clicking the notification focuses an existing admin tab if one is open,
// otherwise opens a new one at the relevant page.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
