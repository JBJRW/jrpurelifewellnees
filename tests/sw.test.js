import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadServiceWorker } from "./helpers/load.js";

const CACHE = "jr-purelife-v1";

/* Minimal stand-ins for the Cache Storage API and the service worker events,
   enough to drive install / activate / fetch and inspect what was stored. */
function createCacheStorage(initial = {}) {
  const caches = new Map(Object.entries(initial).map(([name, entries]) => [name, new Map(Object.entries(entries))]));

  function cacheApi(store) {
    return {
      addAll: vi.fn(async (urls) => urls.forEach((url) => store.set(url, { url, body: "cached" }))),
      put: vi.fn(async (request, response) => store.set(keyOf(request), response)),
      match: vi.fn(async (request) => store.get(keyOf(request))),
      store,
    };
  }

  const api = {
    open: vi.fn(async (name) => {
      if (!caches.has(name)) caches.set(name, new Map());
      return cacheApi(caches.get(name));
    }),
    match: vi.fn(async (request) => {
      for (const store of caches.values()) {
        const hit = store.get(keyOf(request));
        if (hit) return hit;
      }
      return undefined;
    }),
    keys: vi.fn(async () => [...caches.keys()]),
    delete: vi.fn(async (name) => caches.delete(name)),
    entries: (name) => [...(caches.get(name) || new Map()).keys()],
    names: () => [...caches.keys()],
  };
  return api;
}

function keyOf(request) {
  return typeof request === "string" ? request : request.url;
}

function request(url, method = "GET") {
  return { url, method };
}

function installEvent() {
  const event = { promises: [], waitUntil: (p) => event.promises.push(p) };
  return event;
}

function fetchEvent(req) {
  const event = { request: req, respondWith: vi.fn((p) => (event.response = p)) };
  return event;
}

let caches;

beforeEach(() => {
  caches = createCacheStorage();
  vi.stubGlobal("caches", caches);
  vi.stubGlobal("fetch", vi.fn());
  window.skipWaiting = vi.fn();
  window.clients = { claim: vi.fn() };
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.skipWaiting;
  delete window.clients;
});

describe("install", () => {
  it("pre-caches the core pages and assets, then takes over immediately", async () => {
    const jr = await loadServiceWorker();
    const event = installEvent();
    jr.trigger("install", event);
    await Promise.all(event.promises);

    const cached = caches.entries(CACHE);
    expect(cached).toContain("./home.html");
    expect(cached).toContain("./cart.html");
    expect(cached).toContain("./assets/cart.js");
    expect(cached).toContain("./assets/i18n/en.json");
    expect(cached).toContain("./manifest.json");
    expect(cached.every((url) => url.startsWith("./"))).toBe(true);
    expect(window.skipWaiting).toHaveBeenCalledOnce();
  });
});

describe("activate", () => {
  it("drops caches from previous versions and keeps the current one", async () => {
    caches = createCacheStorage({ [CACHE]: { "./home.html": {} }, "jr-purelife-v0": { "./old.html": {} } });
    vi.stubGlobal("caches", caches);
    const jr = await loadServiceWorker();
    const event = installEvent();
    jr.trigger("activate", event);
    await Promise.all(event.promises);

    expect(caches.names()).toEqual([CACHE]);
    expect(window.clients.claim).toHaveBeenCalledOnce();
  });
});

describe("fetch", () => {
  it("ignores non-GET requests so form posts reach the network", async () => {
    const jr = await loadServiceWorker();
    const event = fetchEvent(request("https://jr.test/checkout", "POST"));
    jr.trigger("fetch", event);
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("serves a cached response without hitting the network", async () => {
    caches = createCacheStorage({ [CACHE]: { "https://jr.test/home.html": { body: "from cache" } } });
    vi.stubGlobal("caches", caches);
    const jr = await loadServiceWorker();
    const event = fetchEvent(request("https://jr.test/home.html"));
    jr.trigger("fetch", event);

    await expect(event.response).resolves.toEqual({ body: "from cache" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("falls back to the network and caches a copy of the response", async () => {
    const clone = { body: "copy" };
    const response = { body: "from network", clone: vi.fn(() => clone) };
    vi.stubGlobal("fetch", vi.fn(async () => response));
    const jr = await loadServiceWorker();
    const req = request("https://jr.test/new.html");
    const event = fetchEvent(req);
    jr.trigger("fetch", event);

    await expect(event.response).resolves.toBe(response);
    await Promise.resolve();
    expect(caches.open).toHaveBeenCalledWith(CACHE);
  });

  it("resolves with nothing when the request is neither cached nor reachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));
    const jr = await loadServiceWorker();
    const event = fetchEvent(request("https://jr.test/missing.html"));
    jr.trigger("fetch", event);
    await expect(event.response).resolves.toBeUndefined();
  });

  it("still returns the response when writing to the cache fails", async () => {
    const response = { body: "from network", clone: vi.fn(() => ({})) };
    vi.stubGlobal("fetch", vi.fn(async () => response));
    caches.open = vi.fn(async () => {
      throw new Error("quota exceeded");
    });
    const jr = await loadServiceWorker();
    const event = fetchEvent(request("https://jr.test/new.html"));
    jr.trigger("fetch", event);
    await expect(event.response).resolves.toBe(response);
  });
});
