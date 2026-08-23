const CACHE = "jr-purelife-v1";
const CORE = [
  "./home.html",
  "./index.html",
  "./product.html",
  "./alchemy.html",
  "./reserve.html",
  "./journal.html",
  "./vault.html",
  "./cart.html",
  "./checkout.html",
  "./contact.html",
  "./manifest.json",
  "./assets/cart.js",
  "./assets/nav-fix.js",
  "./assets/config.js",
  "./assets/i18n.js",
  "./assets/i18n/en.json",
  "./assets/i18n/es.json",
  "./assets/i18n/pt.json",
  "./assets/i18n/fr.json",
  "./assets/i18n/it.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
            return response;
          })
          .catch(() => cached)
    )
  );
});
