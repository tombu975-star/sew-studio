// Minimal service worker for installability + a graceful offline fallback.
//
// Deliberately does NOT cache API responses or app pages for offline use —
// this is a live business app (orders, tasks, payments); serving stale
// cached data while looking current would be actively misleading. The only
// things cached are the offline fallback page itself and the app icons.

const CACHE_NAME = "madam-studio-shell-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle page navigations specially; let every other request
  // (API calls, assets) go straight to the network untouched.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});
