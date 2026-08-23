/* JR PureLife Wellness — Motor de idiomas.
   Diseño defensivo: si algo falla (red, clave faltante, idioma no
   soportado), el sitio SIEMPRE muestra texto legible en inglés como
   respaldo — nunca queda una página vacía o rota.

   Piloto: en, es, pt, fr, it (mismo alfabeto, mismo layout).
   Fase 2 pendiente de confirmación: ko, zh, he (fuentes distintas / RTL).
*/
(function () {
  const SUPPORTED = ["en", "es", "pt", "fr", "it"];
  // El idioma de respaldo es el idioma ORIGINAL en que se escribió cada página
  // (el atributo lang="" que ya trae el HTML). Así el contenido nunca cambia
  // de significado si algo falla — siempre cae al texto que el dueño aprobó.
  const PAGE_DEFAULT_LANG = (function () {
    const docLang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(docLang) ? docLang : "en";
  })();
  const DEFAULT_LANG = PAGE_DEFAULT_LANG;
  const STORAGE_KEY = "jr_lang";
  const LANG_LABELS = {
    en: { flag: "🇺🇸", label: "English" },
    es: { flag: "🇪🇸", label: "Español" },
    pt: { flag: "🇵🇹", label: "Português" },
    fr: { flag: "🇫🇷", label: "Français" },
    it: { flag: "🇮🇹", label: "Italiano" },
  };

  const cache = {}; // lang -> dict, evita recargar el mismo JSON

  function detectInitialLang() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.includes(stored)) return stored;
    } catch (e) {
      /* localStorage puede fallar en modo privado; seguimos sin romper */
    }
    const nav = (navigator.language || navigator.userLanguage || "").slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(nav)) return nav;
    return DEFAULT_LANG;
  }

  function resolveKey(dict, key) {
    return key.split(".").reduce((obj, part) => (obj && typeof obj === "object" ? obj[part] : undefined), dict);
  }

  async function loadDict(lang) {
    if (cache[lang]) return cache[lang];
    try {
      const res = await fetch(`assets/i18n/${lang}.json`, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const dict = await res.json();
      cache[lang] = dict;
      return dict;
    } catch (e) {
      console.warn(`[i18n] No se pudo cargar "${lang}.json" —`, e.message);
      return null;
    }
  }

  async function getDictWithFallback(lang) {
    const dict = await loadDict(lang);
    if (dict) return dict;
    if (lang !== DEFAULT_LANG) {
      console.warn(`[i18n] Usando "${DEFAULT_LANG}" como respaldo.`);
      return loadDict(DEFAULT_LANG);
    }
    return null; // ni siquiera el inglés cargó — el HTML original queda tal cual
  }

  async function applyTranslations(lang) {
    const dict = await getDictWithFallback(lang);
    const enDict = lang === DEFAULT_LANG ? dict : await loadDict(DEFAULT_LANG);
    if (!dict) return; // sin red / sin JSON: el texto en inglés ya escrito en el HTML queda visible

    let missing = 0;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      let value = resolveKey(dict, key);
      if (value === undefined) {
        value = enDict ? resolveKey(enDict, key) : undefined;
        missing++;
      }
      if (value !== undefined) el.textContent = value;
    });

    document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
      const key = el.getAttribute("data-i18n-alt");
      let value = resolveKey(dict, key);
      if (value === undefined) value = enDict ? resolveKey(enDict, key) : undefined;
      if (value !== undefined) el.setAttribute("alt", value);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      let value = resolveKey(dict, key);
      if (value === undefined) value = enDict ? resolveKey(enDict, key) : undefined;
      if (value !== undefined) el.setAttribute("placeholder", value);
    });

    const titleKey = document.body.getAttribute("data-i18n-title-key") || "meta.title";
    const titleValue = resolveKey(dict, titleKey) || (enDict && resolveKey(enDict, titleKey));
    if (titleValue) document.title = titleValue;

    document.documentElement.setAttribute("lang", lang);
    // RTL reservado para cuando se agregue hebreo (fase 2); por ahora siempre ltr.
    document.documentElement.setAttribute("dir", "ltr");

    if (missing > 0) {
      console.warn(`[i18n] ${missing} clave(s) faltaban en "${lang}.json" y se usó el respaldo en inglés.`);
    }
  }

  function injectSwitcher() {
    if (document.getElementById("jr-lang-switcher")) return; // ya existe, no duplicar
    const nav = document.querySelector("nav");
    if (!nav) return;

    const wrap = document.createElement("div");
    wrap.id = "jr-lang-switcher";
    wrap.style.cssText = "position:relative;display:inline-flex;align-items:center;margin-left:8px;";
    wrap.innerHTML = `
      <button id="jr-lang-trigger" type="button"
        style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:0.08em;
               color:#3d441e;background:transparent;border:1px solid rgba(119,120,108,0.4);
               border-radius:4px;padding:6px 10px;cursor:pointer;display:flex;align-items:center;gap:4px;">
        <span id="jr-lang-current-flag">🌐</span>
        <span id="jr-lang-current-code" style="text-transform:uppercase;"></span>
      </button>
      <div id="jr-lang-menu" role="menu"
        style="position:absolute;top:calc(100% + 6px);right:0;background:#fbf9f4;
               border:1px solid rgba(119,120,108,0.3);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.12);
               min-width:150px;opacity:0;pointer-events:none;transform:translateY(-6px);
               transition:all .2s ease;z-index:200;overflow:hidden;">
      </div>`;

    const menu = wrap.querySelector("#jr-lang-menu");
    SUPPORTED.forEach((code) => {
      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("data-lang-option", code);
      item.style.cssText =
        "display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;background:none;border:none;" +
        "font-family:'Hanken Grotesk',sans-serif;font-size:13px;color:#1b1c19;cursor:pointer;text-align:left;";
      item.innerHTML = `<span>${LANG_LABELS[code].flag}</span><span>${LANG_LABELS[code].label}</span>`;
      item.addEventListener("mouseenter", () => (item.style.background = "#f0eee9"));
      item.addEventListener("mouseleave", () => (item.style.background = "none"));
      item.addEventListener("click", () => {
        setLanguage(code);
        closeMenu();
      });
      menu.appendChild(item);
    });

    function openMenu() {
      menu.style.opacity = "1";
      menu.style.pointerEvents = "auto";
      menu.style.transform = "translateY(0)";
    }
    function closeMenu() {
      menu.style.opacity = "0";
      menu.style.pointerEvents = "none";
      menu.style.transform = "translateY(-6px)";
    }
    const trigger = wrap.querySelector("#jr-lang-trigger");
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu.style.pointerEvents === "auto";
      isOpen ? closeMenu() : openMenu();
    });
    document.addEventListener("click", closeMenu);

    // Se coloca junto a los íconos de la derecha del nav si existen; si no, al final del nav.
    const candidates = nav.querySelectorAll(".flex.items-center.gap-4");
    const iconGroup = candidates.length ? candidates[candidates.length - 1] : null;
    if (iconGroup && iconGroup.parentElement === nav && iconGroup !== wrap) {
      iconGroup.appendChild(wrap);
    } else {
      nav.appendChild(wrap);
    }
  }

  function updateSwitcherUI(lang) {
    const flagEl = document.getElementById("jr-lang-current-flag");
    const codeEl = document.getElementById("jr-lang-current-code");
    if (flagEl) flagEl.textContent = (LANG_LABELS[lang] || LANG_LABELS[DEFAULT_LANG]).flag;
    if (codeEl) codeEl.textContent = lang;
  }

  async function setLanguage(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* modo privado: seguimos, solo no persiste entre visitas */
    }
    await applyTranslations(lang);
    updateSwitcherUI(lang);
    window.dispatchEvent(new CustomEvent("jr:langchange", { detail: { lang: lang } }));
  }

  // Traducción síncrona para contenido generado por JS (ej. cart.js redibuja
  // filas del carrito). Usa lo que ya está en caché; si el idioma actual aún
  // no cargó, cae al idioma por defecto de la página, y si tampoco, a la key.
  function t(key, lang) {
    lang = lang || detectInitialLang();
    let dict = cache[lang] || cache[DEFAULT_LANG];
    if (!dict) return key;
    let value = resolveKey(dict, key);
    if (value === undefined && cache[DEFAULT_LANG]) value = resolveKey(cache[DEFAULT_LANG], key);
    return value !== undefined ? value : key;
  }

  async function init() {
    injectSwitcher();
    const lang = detectInitialLang();
    updateSwitcherUI(lang);
    await applyTranslations(lang);
    window.dispatchEvent(new CustomEvent("jr:langchange", { detail: { lang: lang } }));
  }

  window.JRI18N = { setLanguage, getLang: detectInitialLang, t: t, SUPPORTED_LANGS: SUPPORTED };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
