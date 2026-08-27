/* JR PureLife Wellness — shared utilities.
   Helpers used across pages and other asset scripts. Load this before
   any inline page script or asset that relies on window.JRUtils. */
(function () {
  /* Translate `key` via the i18n engine when available; otherwise return
     `fallback`. Safe on pages that don't load assets/i18n.js. */
  function t(key, fallback) {
    if (window.JRI18N && typeof window.JRI18N.t === "function") {
      const v = window.JRI18N.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  window.JRUtils = { t: t };

  // Progressive Web App: register the service worker on every page.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
