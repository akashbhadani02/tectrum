const CACHE = "lead-manager-v9";
self.addEventListener("install", event => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname === "/favicon.ico" || url.pathname.startsWith("/img/") || url.pathname.endsWith(".webmanifest") || url.pathname.endsWith("/manifest.json")) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
