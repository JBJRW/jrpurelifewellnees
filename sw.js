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

// Precaches every core file individually: cache.addAll() rejects the whole
// install when a single URL 404s, which would leave the site with no offline
// cache at all and no clue about which file was missing.
async function precache() {
  const cache = await caches.open(CACHE);
  const results = await Promise.allSettled(CORE.map((url) => cache.add(url)));
  const failed = results
    .map((r, i) => (r.status === "rejected" ? { url: CORE[i], reason: r.reason } : null))
    .filter(Boolean);
  failed.forEach(({ url, reason }) => console.error(`[sw] No se pudo precachear "${url}" —`, reason));
  if (failed.length === CORE.length) {
    throw new Error("[sw] No se pudo precachear ningún archivo; la instalación falla.");
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE)
            .map((k) =>
              caches.delete(k).catch((e) => console.warn(`[sw] No se pudo borrar la caché "${k}" —`, e))
            )
        )
      )
      .then(() => self.clients.claim())
      .catch((e) => console.error("[sw] Falló la activación —", e))
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      caches
        .open(CACHE)
        .then((cache) => cache.put(request, copy))
        .catch((e) => console.warn(`[sw] No se pudo cachear "${request.url}" —`, e));
    } else {
      console.warn(`[sw] "${request.url}" respondió HTTP ${response.status}; no se cachea.`);
    }
    return response;
  } catch (e) {
    console.warn(`[sw] Sin red y sin caché para "${request.url}" —`, e);
    // Devolver undefined haría que respondWith() rechazara con un error opaco;
    // una respuesta 504 explícita deja claro qué pasó.
    return new Response("Offline: este recurso no está en la caché del sitio.", {
      status: 504,
      statusText: "Gateway Timeout",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(cacheFirst(event.request));
});
