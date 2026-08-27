import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, loadI18n } from "./helpers/load.js";

const STORAGE_KEY = "jr_lang";

const DICTS = {
  en: {
    meta: { title: "Sanctuary" },
    nav: { shop: "Shop", cart: "Basket" },
    hero: { alt: "A bottle", placeholder: "Your email" },
  },
  es: {
    meta: { title: "Santuario" },
    nav: { shop: "Tienda" },
    hero: { alt: "Un frasco", placeholder: "Tu correo" },
  },
};

/* Serves the dictionaries above the way the site's JSON files are served, and
   lets a test make a language unavailable to exercise the fallback paths. */
function mockFetch(dicts = DICTS) {
  const fetchMock = vi.fn((url) => {
    const lang = String(url).match(/i18n\/([a-z]{2})\.json/)[1];
    if (!dicts[lang]) return Promise.resolve({ ok: false, status: 404 });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(dicts[lang]) });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setNavigatorLanguage(language) {
  Object.defineProperty(navigator, "language", { value: language, configurable: true });
}

const PAGE = `
  <nav><div class="flex items-center gap-4"></div></nav>
  <h1 data-i18n="nav.shop">Shop</h1>
  <span data-i18n="nav.cart">Basket</span>
  <img data-i18n-alt="hero.alt" alt=""/>
  <input data-i18n-placeholder="hero.placeholder"/>`;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.setAttribute("lang", "en");
  document.documentElement.removeAttribute("dir");
  document.title = "";
  document.body.innerHTML = PAGE;
  document.body.removeAttribute("data-i18n-title-key");
  setNavigatorLanguage("en-US");
  mockFetch();
  /* The engine logs its fallbacks on purpose; tests that care assert on the spy. */
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("language detection", () => {
  it("prefers the language stored from a previous visit", async () => {
    localStorage.setItem(STORAGE_KEY, "it");
    await loadI18n();
    expect(window.JRI18N.getLang()).toBe("it");
  });

  it("ignores a stored language that is no longer supported", async () => {
    localStorage.setItem(STORAGE_KEY, "de");
    setNavigatorLanguage("fr-FR");
    await loadI18n();
    expect(window.JRI18N.getLang()).toBe("fr");
  });

  it("falls back to the browser language when nothing is stored", async () => {
    setNavigatorLanguage("pt-BR");
    await loadI18n();
    expect(window.JRI18N.getLang()).toBe("pt");
  });

  it("falls back to the language the page was written in", async () => {
    setNavigatorLanguage("ja-JP");
    document.documentElement.setAttribute("lang", "es");
    await loadI18n();
    expect(window.JRI18N.getLang()).toBe("es");
  });

  it("treats an unsupported document language as English", async () => {
    setNavigatorLanguage("ja-JP");
    document.documentElement.setAttribute("lang", "de");
    await loadI18n();
    expect(window.JRI18N.getLang()).toBe("en");
  });

  it("survives a localStorage that throws on read", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    setNavigatorLanguage("it-IT");
    await loadI18n();
    expect(window.JRI18N.getLang()).toBe("it");
  });

  it("exposes the supported language list", async () => {
    await loadI18n();
    expect(window.JRI18N.SUPPORTED_LANGS).toEqual(["en", "es", "pt", "fr", "it"]);
  });
});

describe("applying translations", () => {
  it("translates text, alt text, placeholders and the document title", async () => {
    localStorage.setItem(STORAGE_KEY, "es");
    await loadI18n();
    await flushPromises();
    expect(document.querySelector("[data-i18n='nav.shop']").textContent).toBe("Tienda");
    expect(document.querySelector("[data-i18n-alt='hero.alt']").getAttribute("alt")).toBe("Un frasco");
    expect(document.querySelector("[data-i18n-placeholder='hero.placeholder']").getAttribute("placeholder")).toBe(
      "Tu correo"
    );
    expect(document.title).toBe("Santuario");
    expect(document.documentElement.getAttribute("lang")).toBe("es");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });

  it("uses the English value for a key missing from the active language", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, "es");
    await loadI18n();
    await flushPromises();
    expect(document.querySelector("[data-i18n='nav.cart']").textContent).toBe("Basket");
    expect(warn).toHaveBeenCalled();
  });

  it("honours a per-page title key", async () => {
    document.body.setAttribute("data-i18n-title-key", "nav.shop");
    localStorage.setItem(STORAGE_KEY, "es");
    await loadI18n();
    await flushPromises();
    expect(document.title).toBe("Tienda");
  });

  it("requests each dictionary only once", async () => {
    const fetchMock = mockFetch();
    localStorage.setItem(STORAGE_KEY, "es");
    await loadI18n();
    await flushPromises();
    const callsAfterInit = fetchMock.mock.calls.length;
    await window.JRI18N.setLanguage("es");
    expect(fetchMock.mock.calls.length).toBe(callsAfterInit);
  });

  it("falls back to the default dictionary when a language file is missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch({ en: DICTS.en });
    localStorage.setItem(STORAGE_KEY, "fr");
    await loadI18n();
    await flushPromises();
    expect(document.querySelector("[data-i18n='nav.shop']").textContent).toBe("Shop");
  });

  it("leaves the page untouched when no dictionary loads at all", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch({});
    await loadI18n();
    await flushPromises();
    expect(document.querySelector("[data-i18n='nav.shop']").textContent).toBe("Shop");
    expect(document.title).toBe("");
  });

  it("warns and keeps going when the network request rejects", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    await loadI18n();
    await flushPromises();
    expect(warn).toHaveBeenCalled();
    expect(document.querySelector("[data-i18n='nav.shop']").textContent).toBe("Shop");
  });
});

describe("setLanguage", () => {
  it("persists the choice and announces it", async () => {
    await loadI18n();
    await flushPromises();
    const langChange = vi.fn();
    window.addEventListener("jr:langchange", langChange);
    await window.JRI18N.setLanguage("es");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("es");
    expect(langChange).toHaveBeenCalledOnce();
    expect(langChange.mock.calls[0][0].detail).toEqual({ lang: "es" });
    window.removeEventListener("jr:langchange", langChange);
  });

  it("falls back to the default language for an unsupported code", async () => {
    await loadI18n();
    await flushPromises();
    await window.JRI18N.setLanguage("kl");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("en");
  });

  it("still applies translations when the choice cannot be persisted", async () => {
    await loadI18n();
    await flushPromises();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    await window.JRI18N.setLanguage("es");
    expect(document.querySelector("[data-i18n='nav.shop']").textContent).toBe("Tienda");
  });
});

describe("synchronous t()", () => {
  it("resolves nested keys from the active dictionary", async () => {
    localStorage.setItem(STORAGE_KEY, "es");
    await loadI18n();
    await flushPromises();
    expect(window.JRI18N.t("nav.shop")).toBe("Tienda");
  });

  it("falls back to the English value for a missing key", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, "es");
    await loadI18n();
    await flushPromises();
    expect(window.JRI18N.t("nav.cart")).toBe("Basket");
  });

  it("returns the key itself when it exists in no dictionary", async () => {
    await loadI18n();
    await flushPromises();
    expect(window.JRI18N.t("nav.unknown.deep")).toBe("nav.unknown.deep");
  });

  it("returns the key while no dictionary has loaded yet", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    await loadI18n();
    expect(window.JRI18N.t("nav.shop")).toBe("nav.shop");
  });

  it("accepts an explicit language argument", async () => {
    localStorage.setItem(STORAGE_KEY, "es");
    await loadI18n();
    await flushPromises();
    expect(window.JRI18N.t("nav.shop", "en")).toBe("Shop");
  });
});

describe("language switcher", () => {
  it("injects a trigger and one option per supported language", async () => {
    await loadI18n();
    await flushPromises();
    const switcher = document.getElementById("jr-lang-switcher");
    expect(switcher).not.toBeNull();
    expect(switcher.parentElement.className).toContain("flex items-center gap-4");
    expect(document.querySelectorAll("[data-lang-option]")).toHaveLength(5);
    expect(document.getElementById("jr-lang-current-code").textContent).toBe("en");
    expect(document.getElementById("jr-lang-current-flag").textContent).toBe("🇺🇸");
  });

  it("appends itself to the nav when there is no icon group", async () => {
    document.body.innerHTML = `<nav></nav><h1 data-i18n="nav.shop">Shop</h1>`;
    await loadI18n();
    await flushPromises();
    expect(document.querySelector("nav > #jr-lang-switcher")).not.toBeNull();
  });

  it("does nothing when the page has no nav", async () => {
    document.body.innerHTML = `<h1 data-i18n="nav.shop">Shop</h1>`;
    await loadI18n();
    await flushPromises();
    expect(document.getElementById("jr-lang-switcher")).toBeNull();
  });

  it("never injects a second switcher", async () => {
    await loadI18n();
    await flushPromises();
    await loadI18n();
    await flushPromises();
    expect(document.querySelectorAll("#jr-lang-switcher")).toHaveLength(1);
  });

  it("opens and closes the menu from the trigger", async () => {
    await loadI18n();
    await flushPromises();
    const menu = document.getElementById("jr-lang-menu");
    const trigger = document.getElementById("jr-lang-trigger");
    expect(menu.style.pointerEvents).toBe("none");
    trigger.click();
    expect(menu.style.pointerEvents).toBe("auto");
    expect(menu.style.opacity).toBe("1");
    trigger.click();
    expect(menu.style.pointerEvents).toBe("none");
  });

  it("closes the menu when the page is clicked", async () => {
    await loadI18n();
    await flushPromises();
    document.getElementById("jr-lang-trigger").click();
    document.body.click();
    expect(document.getElementById("jr-lang-menu").style.pointerEvents).toBe("none");
  });

  it("switches language, updates the trigger and closes the menu on option click", async () => {
    await loadI18n();
    await flushPromises();
    document.getElementById("jr-lang-trigger").click();
    document.querySelector("[data-lang-option='es']").click();
    await flushPromises();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("es");
    expect(document.getElementById("jr-lang-current-code").textContent).toBe("es");
    expect(document.getElementById("jr-lang-current-flag").textContent).toBe("🇪🇸");
    expect(document.getElementById("jr-lang-menu").style.pointerEvents).toBe("none");
    expect(document.querySelector("[data-i18n='nav.shop']").textContent).toBe("Tienda");
  });

  it("highlights an option on hover", async () => {
    await loadI18n();
    await flushPromises();
    const option = document.querySelector("[data-lang-option='fr']");
    option.dispatchEvent(new Event("mouseenter"));
    expect(option.style.background).toBe("rgb(240, 238, 233)");
    option.dispatchEvent(new Event("mouseleave"));
    expect(option.style.background).toBe("none");
  });
});
