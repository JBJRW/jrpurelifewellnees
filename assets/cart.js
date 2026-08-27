/* JR PureLife Wellness — Ritual Basket (cart) logic
   Front-end only, localStorage-based. No visual changes to the design —
   this only reads/writes data and (re)draws the existing card markup. */
(function () {
  const STORAGE_KEY = "jr_purelife_cart_v1";
  const SHIPPING = 8.5;
  const TAX_RATE = 0.087; // matches the $2.10 on $24 example in the original mock

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function writeCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateBadge();
  }
  function addItem(product, qty) {
    qty = qty || 1;
    const cart = readCart();
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push(Object.assign({ qty: qty }, product));
    }
    writeCart(cart);
    flashAdded(product.name);
  }
  function removeItem(id) {
    writeCart(readCart().filter((i) => i.id !== id));
    renderCartPage();
  }
  function setQty(id, qty) {
    const cart = readCart();
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, qty);
    writeCart(cart);
    renderCartPage();
  }
  function totals() {
    const cart = readCart();
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = cart.length ? SHIPPING : 0;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total, count: cart.reduce((s, i) => s + i.qty, 0) };
  }
  function fmt(n, currency) {
    currency = currency || "$";
    return currency + n.toFixed(2);
  }

  function updateBadge() {
    const t = totals();
    document.querySelectorAll("button.material-symbols-outlined").forEach((btn) => {
      if (btn.textContent.trim() !== "shopping_cart" && btn.textContent.trim() !== "shopping_bag") return;
      if (btn.dataset.badged) {
        const existing = btn.parentElement.querySelector(".jr-cart-badge");
        if (existing) existing.textContent = t.count;
        if (existing) existing.style.display = t.count ? "flex" : "none";
        return;
      }
      btn.dataset.badged = "1";
      const wrapper = btn.parentElement;
      wrapper.style.position = wrapper.style.position || "relative";
      const badge = document.createElement("span");
      badge.className = "jr-cart-badge";
      badge.style.cssText =
        "position:absolute;top:-4px;right:-4px;background:#3d441e;color:#fbf9f4;border-radius:9999px;font-size:10px;line-height:1;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:2px;font-family:sans-serif;";
      badge.textContent = t.count;
      badge.style.display = t.count ? "flex" : "none";
      wrapper.appendChild(badge);
      btn.style.cursor = "pointer";
      btn.addEventListener("click", () => (window.location.href = "cart.html"));
    });
  }

  const tt = window.JRUtils.t;

  function flashAdded(name) {
    let toast = document.getElementById("jr-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "jr-toast";
      toast.style.cssText =
        "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#3d441e;color:#fbf9f4;padding:14px 24px;border-radius:6px;font-family:'Playfair Display',serif;font-size:14px;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,0.25);opacity:0;transition:opacity .3s ease;";
      document.body.appendChild(toast);
    }
    const template = tt("cart.dynamic.added_toast", "{name} added to your ritual basket");
    toast.textContent = template.replace("{name}", name);
    toast.style.opacity = "1";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (toast.style.opacity = "0"), 2200);
  }

  function attachAddButtons() {
    // Explicit product button on the product detail page
    const explicit = document.getElementById("add-to-cart-btn");
    if (explicit) {
      explicit.addEventListener("click", (e) => {
        e.preventDefault();
        addItem(
          {
            id: explicit.dataset.productId,
            name: explicit.dataset.productName,
            price: parseFloat(explicit.dataset.productPrice),
            currency: explicit.dataset.productCurrency || "$",
            image: explicit.dataset.productImage,
            desc: explicit.dataset.productDesc || "",
          },
          1
        );
      });
    }

    // Generic text-based detection for catalog/collection pages: any button
    // or link whose visible text matches common "add to cart" phrasing.
    const addPhrases = /añadir al ritual|add to (cart|bag|ritual)|reserve (this|my)|select extraction/i;
    document.querySelectorAll("button, a").forEach((el) => {
      if (el.id === "add-to-cart-btn") return;
      const txt = el.textContent.trim();
      if (!addPhrases.test(txt)) return;
      el.addEventListener("click", (e) => {
        // try to infer product name/price from the closest card
        const card = el.closest("article, .group, div[class*='rounded']") || el.parentElement;
        let name = "JR PureLife Wellness Product";
        let price = 0;
        if (card) {
          const h = card.querySelector("h1,h2,h3,h4");
          if (h) name = h.textContent.trim();
          const priceMatch = card.textContent.match(/[$€]\s?[0-9]+[.,][0-9]{2}/);
          if (priceMatch) price = parseFloat(priceMatch[0].replace(/[^0-9.,]/g, "").replace(",", "."));
        }
        e.preventDefault();
        addItem({ id: name.toLowerCase().replace(/\s+/g, "-"), name, price, currency: "$" }, 1);
      });
    });
  }

  const ITEM_TEMPLATE = (item) => `
    <div class="group relative bg-surface-container-lowest p-6 flex flex-col md:flex-row gap-6 soft-shadow rounded-lg overflow-hidden transition-all duration-500 hover:-translate-y-1" data-cart-row="${item.id}">
      <div class="w-full md:w-48 h-48 bg-surface-container-low rounded overflow-hidden">
        <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="${item.name}" src="${item.image || ""}"/>
      </div>
      <div class="flex-grow flex flex-col justify-between py-2">
        <div>
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-headline-md text-[24px] text-primary">${item.name}</h3>
              <p class="text-on-surface-variant text-sm mt-1">${item.desc || ""}</p>
            </div>
            <button class="text-outline hover:text-error transition-colors" data-remove="${item.id}">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        <div class="flex flex-wrap justify-between items-end mt-6 gap-4">
          <div class="flex items-center bg-surface-container border border-outline-variant rounded p-1">
            <button class="w-8 h-8 flex items-center justify-center text-primary hover:bg-surface-container-highest transition-colors" data-decr="${item.id}">
              <span class="material-symbols-outlined text-sm">remove</span>
            </button>
            <span class="px-4 font-label-caps text-label-caps text-on-surface">${item.qty}</span>
            <button class="w-8 h-8 flex items-center justify-center text-primary hover:bg-surface-container-highest transition-colors" data-incr="${item.id}">
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
          <div class="text-right">
            <p class="text-xs font-label-caps text-outline mb-1">${tt("cart.dynamic.unit_price", "UNIT PRICE")}: ${fmt(item.price, item.currency)}</p>
            <p class="font-headline-md text-headline-md text-primary">${fmt(item.price * item.qty, item.currency)}</p>
          </div>
        </div>
      </div>
    </div>`;

  function renderCartPage() {
    const list = document.getElementById("cart-items-list");
    if (!list) return; // not on the cart page
    const cart = readCart();
    if (!cart.length) {
      const emptyTitle = tt("cart.dynamic.empty_title", "Your basket is empty");
      const emptyText = tt("cart.dynamic.empty_text", "Begin your ritual by exploring the collection.");
      const emptyCta = tt("cart.dynamic.empty_cta", "Explore the Reserve");
      list.innerHTML =
        `<div class="text-center py-20 text-on-surface-variant"><p class="font-headline-md text-headline-md text-primary mb-3">${emptyTitle}</p><p class="mb-8">${emptyText}</p><a href="reserve.html" class="inline-block bg-primary text-white px-8 py-4 rounded font-label-caps text-label-caps">${emptyCta}</a></div>`;
    } else {
      list.innerHTML = cart.map(ITEM_TEMPLATE).join("");
    }
    const t = totals();
    const sub = document.getElementById("cart-subtotal");
    const total = document.getElementById("cart-total");
    if (sub) sub.textContent = fmt(t.subtotal);
    if (total) total.textContent = fmt(t.total);

    list.querySelectorAll("[data-remove]").forEach((b) =>
      b.addEventListener("click", () => removeItem(b.dataset.remove))
    );
    list.querySelectorAll("[data-incr]").forEach((b) =>
      b.addEventListener("click", () => {
        const item = readCart().find((i) => i.id === b.dataset.incr);
        if (item) setQty(item.id, item.qty + 1);
      })
    );
    list.querySelectorAll("[data-decr]").forEach((b) =>
      b.addEventListener("click", () => {
        const item = readCart().find((i) => i.id === b.dataset.decr);
        if (item) setQty(item.id, item.qty - 1);
      })
    );

    const checkoutBtn = document.getElementById("cart-checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        if (!readCart().length) {
          alert(tt("cart.dynamic.alert_empty_checkout", "Your ritual basket is empty. Add a product before checking out."));
          return;
        }
        window.location.href = "checkout.html";
      });
    }
  }

  function renderCheckoutPage() {
    const subEl = document.getElementById("checkout-subtotal");
    const totalEl = document.getElementById("checkout-total");
    if (!subEl && !totalEl) return; // not on checkout
    const t = totals();
    if (subEl) subEl.textContent = fmt(t.subtotal);
    if (totalEl) totalEl.textContent = fmt(t.total);

    const payBtn = document.getElementById("checkout-pay-btn");
    if (payBtn) {
      payBtn.addEventListener("click", () => {
        if (!readCart().length) {
          alert(tt("cart.dynamic.alert_empty_basket", "Your basket is empty — add a product before checking out."));
          window.location.href = "reserve.html";
          return;
        }
        const link = window.JR_CONFIG && window.JR_CONFIG.STRIPE_PAYMENT_LINK;
        if (link && link.indexOf("your_payment_link_id") === -1) {
          window.location.href = link;
        } else {
          alert(
            tt("cart.dynamic.alert_no_payment", "Payments aren't wired up yet.\n\nOpen assets/config.js and set STRIPE_PAYMENT_LINK to your real Stripe Payment Link (or Checkout Session URL) to activate real checkout.")
          );
        }
      });
    }
  }

  function wireContactForm() {
    const form = document.getElementById("lab-contact-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const inputs = form.querySelectorAll("input, select, textarea");
      const name = inputs[0] ? inputs[0].value : "";
      const email = inputs[1] ? inputs[1].value : "";
      const subject = inputs[2] ? inputs[2].value : "";
      const message = inputs[3] ? inputs[3].value : "";
      const to = (window.JR_CONFIG && window.JR_CONFIG.CONTACT_EMAIL) || "hola@jrpurelife.com";
      const body = `Nombre: ${name}\nEmail: ${email}\nAsunto: ${subject}\n\n${message}`;
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(
        "Consulta desde jrpurelifewellness.com — " + subject
      )}&body=${encodeURIComponent(body)}`;
    });
  }

  window.JRCart = { addItem, removeItem, setQty, totals, readCart };

  document.addEventListener("DOMContentLoaded", () => {
    updateBadge();
    attachAddButtons();
    renderCartPage();
    renderCheckoutPage();
    wireContactForm();
  });

  // Al cambiar de idioma, se debe redibujar el contenido dinámico del
  // carrito (filas de producto, estado vacío) porque ese HTML no existe
  // en el DOM cuando i18n.js hace su primer barrido con data-i18n.
  window.addEventListener("jr:langchange", () => {
    renderCartPage();
    renderCheckoutPage();
  });
})();
