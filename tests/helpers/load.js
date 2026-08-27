import { vi } from "vitest";

/* The site's scripts are plain IIFEs that attach themselves to `window` and
   bootstrap from document/window events. jsdom keeps a single document per
   test file, so a script re-loaded for the next test would otherwise still be
   driven by the listeners its previous instance registered. Loading through
   `loadScript` captures the bootstrap listeners registered during import and
   hands back a handle that fires them for that instance only. */
async function loadScript(importer) {
  const domReady = [];
  const windowListeners = [];
  const addDocumentListener = document.addEventListener.bind(document);

  const documentSpy = vi.spyOn(document, "addEventListener").mockImplementation((type, fn, options) => {
    if (type === "DOMContentLoaded") domReady.push(fn);
    else addDocumentListener(type, fn, options);
  });
  const windowSpy = vi.spyOn(window, "addEventListener").mockImplementation((type, fn, options) => {
    windowListeners.push([type, fn]);
    if (type === "DOMContentLoaded") domReady.push(fn);
  });

  try {
    vi.resetModules();
    await importer();
  } finally {
    documentSpy.mockRestore();
    windowSpy.mockRestore();
  }

  return {
    ready() {
      domReady.forEach((fn) => fn(new Event("DOMContentLoaded")));
    },
    emit(type, detail) {
      return this.trigger(type, new CustomEvent(type, { detail }));
    },
    /* Service worker style events are plain objects carrying waitUntil /
       respondWith, so tests build the event themselves. Returns the number of
       listeners that ran. */
    trigger(type, event) {
      const listeners = windowListeners.filter(([t]) => t === type).map(([, fn]) => fn);
      listeners.forEach((fn) => fn(event));
      return listeners.length;
    },
  };
}

export function loadCart() {
  return loadScript(() => import("../../assets/cart.js"));
}

export function loadI18n() {
  return loadScript(() => import("../../assets/i18n.js"));
}

export function loadNavFix() {
  return loadScript(() => import("../../assets/nav-fix.js"));
}

export function loadConfig() {
  return loadScript(() => import("../../assets/config.js"));
}

export function loadServiceWorker() {
  return loadScript(() => import("../../sw.js"));
}

/* jsdom refuses real navigation, so tests swap in a plain object and read
   back the href the code under test assigned. */
export function stubLocation() {
  const location = { href: "http://localhost/", assign: vi.fn() };
  Object.defineProperty(window, "location", { value: location, writable: true, configurable: true });
  return location;
}

export function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
