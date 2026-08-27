import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { loadCart, stubLocation } from "./helpers/load.js";

const STORAGE_KEY = "jr_purelife_cart_v1";
const SHIPPING = 8.5;
const TAX_RATE = 0.087;

function seedCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function storedCart() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

const OIL = { id: "oil", name: "Rosehip Oil", price: 24, currency: "$", image: "oil.png", desc: "Cold pressed" };

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  delete window.JR_CONFIG;
  delete window.JRI18N;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("JRCart storage", () => {
  it("reads an empty basket when nothing is stored", async () => {
    const jr = await loadCart();
    expect(window.JRCart.readCart()).toEqual([]);
  });

  it("reads an empty basket when the stored value is not valid JSON", async () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    const jr = await loadCart();
    expect(window.JRCart.readCart()).toEqual([]);
  });

  it("adds a new item with a default quantity of one", async () => {
    const jr = await loadCart();
    window.JRCart.addItem(OIL);
    expect(storedCart()).toEqual([{ qty: 1, ...OIL }]);
  });

  it("accumulates the quantity of an item already in the basket", async () => {
    seedCart([{ ...OIL, qty: 2 }]);
    const jr = await loadCart();
    window.JRCart.addItem(OIL, 3);
    expect(storedCart()).toHaveLength(1);
    expect(storedCart()[0].qty).toBe(5);
  });

  it("removes an item by id and leaves the rest untouched", async () => {
    seedCart([
      { ...OIL, qty: 1 },
      { id: "soap", name: "Soap", price: 12, qty: 1 },
    ]);
    const jr = await loadCart();
    window.JRCart.removeItem("oil");
    expect(storedCart().map((i) => i.id)).toEqual(["soap"]);
  });

  it("clamps quantities to a minimum of one", async () => {
    seedCart([{ ...OIL, qty: 2 }]);
    const jr = await loadCart();
    window.JRCart.setQty("oil", 0);
    expect(storedCart()[0].qty).toBe(1);
  });

  it("ignores a quantity change for an unknown id", async () => {
    seedCart([{ ...OIL, qty: 2 }]);
    const jr = await loadCart();
    window.JRCart.setQty("missing", 9);
    expect(storedCart()).toEqual([{ ...OIL, qty: 2 }]);
  });
});

describe("JRCart totals", () => {
  it("returns zeroed totals with no shipping for an empty basket", async () => {
    const jr = await loadCart();
    expect(window.JRCart.totals()).toEqual({ subtotal: 0, shipping: 0, tax: 0, total: 0, count: 0 });
  });

  it("sums line totals, adds flat shipping and applies the tax rate", async () => {
    seedCart([
      { ...OIL, qty: 2 },
      { id: "soap", name: "Soap", price: 10, qty: 1 },
    ]);
    const jr = await loadCart();
    const t = window.JRCart.totals();
    const subtotal = 24 * 2 + 10;
    expect(t.subtotal).toBe(subtotal);
    expect(t.shipping).toBe(SHIPPING);
    expect(t.tax).toBeCloseTo(subtotal * TAX_RATE, 10);
    expect(t.total).toBeCloseTo(subtotal + SHIPPING + subtotal * TAX_RATE, 10);
    expect(t.count).toBe(3);
  });
});

describe("cart badge", () => {
  it("adds a hidden badge next to the cart icon when the basket is empty", async () => {
    document.body.innerHTML = `<div><button class="material-symbols-outlined">shopping_cart</button></div>`;
    const jr = await loadCart();
    jr.ready();
    const badge = document.querySelector(".jr-cart-badge");
    expect(badge.textContent).toBe("0");
    expect(badge.style.display).toBe("none");
  });

  it("shows the item count on the badge and only decorates the icon once", async () => {
    seedCart([{ ...OIL, qty: 2 }]);
    document.body.innerHTML = `<div><button class="material-symbols-outlined">shopping_bag</button></div>`;
    const jr = await loadCart();
    jr.ready();
    window.JRCart.addItem({ id: "soap", name: "Soap", price: 5 });
    const badges = document.querySelectorAll(".jr-cart-badge");
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toBe("3");
    expect(badges[0].style.display).toBe("flex");
  });

  it("leaves unrelated icon buttons alone", async () => {
    document.body.innerHTML = `<div><button class="material-symbols-outlined">search</button></div>`;
    const jr = await loadCart();
    jr.ready();
    expect(document.querySelector(".jr-cart-badge")).toBeNull();
  });

  it("sends the visitor to the cart page when the icon is clicked", async () => {
    const location = stubLocation();
    document.body.innerHTML = `<div><button class="material-symbols-outlined">shopping_cart</button></div>`;
    const jr = await loadCart();
    jr.ready();
    document.querySelector("button").click();
    expect(location.href).toBe("cart.html");
  });
});

describe("add-to-basket toast", () => {
  it("names the added product and fades itself out", async () => {
    const jr = await loadCart();
    window.JRCart.addItem(OIL);
    const toast = document.getElementById("jr-toast");
    expect(toast.textContent).toBe("Rosehip Oil added to your ritual basket");
    expect(toast.style.opacity).toBe("1");
    vi.advanceTimersByTime(2300);
    expect(toast.style.opacity).toBe("0");
  });

  it("prefers a translated template when i18n is available", async () => {
    window.JRI18N = { t: (key) => (key === "cart.dynamic.added_toast" ? "{name} añadido" : key) };
    const jr = await loadCart();
    window.JRCart.addItem(OIL);
    expect(document.getElementById("jr-toast").textContent).toBe("Rosehip Oil añadido");
  });

  it("falls back to English when i18n returns the key unchanged", async () => {
    window.JRI18N = { t: (key) => key };
    const jr = await loadCart();
    window.JRCart.addItem(OIL);
    expect(document.getElementById("jr-toast").textContent).toContain("added to your ritual basket");
  });

  it("reuses a single toast element across additions", async () => {
    const jr = await loadCart();
    window.JRCart.addItem(OIL);
    window.JRCart.addItem({ id: "soap", name: "Soap", price: 5 });
    expect(document.querySelectorAll("#jr-toast")).toHaveLength(1);
    expect(document.getElementById("jr-toast").textContent).toBe("Soap added to your ritual basket");
  });
});

describe("add-to-basket buttons", () => {
  it("reads the product out of the explicit button's data attributes", async () => {
    document.body.innerHTML = `
      <button id="add-to-cart-btn" data-product-id="oil" data-product-name="Rosehip Oil"
        data-product-price="24.00" data-product-image="oil.png" data-product-desc="Cold pressed">Add</button>`;
    const jr = await loadCart();
    jr.ready();
    document.getElementById("add-to-cart-btn").click();
    expect(storedCart()).toEqual([
      { qty: 1, id: "oil", name: "Rosehip Oil", price: 24, currency: "$", image: "oil.png", desc: "Cold pressed" },
    ]);
  });

  it("defaults currency and description for a sparse explicit button", async () => {
    document.body.innerHTML = `<button id="add-to-cart-btn" data-product-id="x" data-product-name="X" data-product-price="9.50">Add</button>`;
    const jr = await loadCart();
    jr.ready();
    document.getElementById("add-to-cart-btn").click();
    expect(storedCart()[0]).toMatchObject({ currency: "$", desc: "" });
  });

  it("infers name and price from the surrounding card for catalog buttons", async () => {
    document.body.innerHTML = `
      <article>
        <h3>Sacred Clay Mask</h3>
        <p>$42.00</p>
        <button>Add to cart</button>
      </article>`;
    const jr = await loadCart();
    jr.ready();
    document.querySelector("article button").click();
    expect(storedCart()).toEqual([
      { qty: 1, id: "sacred-clay-mask", name: "Sacred Clay Mask", price: 42, currency: "$" },
    ]);
  });

  it("recognises the Spanish and reservation phrasings", async () => {
    document.body.innerHTML = `
      <article><h3>Elixir</h3><p>€18,00</p><a href="#">Añadir al ritual</a></article>`;
    const jr = await loadCart();
    jr.ready();
    document.querySelector("a").click();
    expect(storedCart()[0]).toMatchObject({ name: "Elixir", price: 18 });
  });

  it("falls back to a generic product when the card has no heading or price", async () => {
    document.body.innerHTML = `<div class="group"><button>Add to bag</button></div>`;
    const jr = await loadCart();
    jr.ready();
    document.querySelector("button").click();
    expect(storedCart()[0]).toMatchObject({ name: "JR PureLife Wellness Product", price: 0 });
  });

  it("ignores buttons whose text is not an add-to-basket phrase", async () => {
    document.body.innerHTML = `<article><h3>Elixir</h3><button>Read more</button></article>`;
    const jr = await loadCart();
    jr.ready();
    document.querySelector("button").click();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("cart page rendering", () => {
  const CART_PAGE = `
    <div id="cart-items-list"></div>
    <span id="cart-subtotal"></span>
    <span id="cart-total"></span>
    <button id="cart-checkout-btn">Checkout</button>`;

  it("renders the empty state with a link to the reserve", async () => {
    document.body.innerHTML = CART_PAGE;
    const jr = await loadCart();
    jr.ready();
    const list = document.getElementById("cart-items-list");
    expect(list.textContent).toContain("Your basket is empty");
    expect(list.querySelector("a").getAttribute("href")).toBe("reserve.html");
    expect(document.getElementById("cart-subtotal").textContent).toBe("$0.00");
  });

  it("renders one row per item with formatted unit and line prices", async () => {
    seedCart([{ ...OIL, qty: 2 }]);
    document.body.innerHTML = CART_PAGE;
    const jr = await loadCart();
    jr.ready();
    const row = document.querySelector("[data-cart-row='oil']");
    expect(row).not.toBeNull();
    expect(row.textContent).toContain("UNIT PRICE: $24.00");
    expect(row.textContent).toContain("$48.00");
    expect(document.getElementById("cart-subtotal").textContent).toBe("$48.00");
    expect(document.getElementById("cart-total").textContent).toBe("$60.68");
  });

  it("increments, decrements and removes rows from the row controls", async () => {
    seedCart([{ ...OIL, qty: 1 }]);
    document.body.innerHTML = CART_PAGE;
    const jr = await loadCart();
    jr.ready();

    document.querySelector("[data-incr='oil']").click();
    expect(storedCart()[0].qty).toBe(2);

    document.querySelector("[data-decr='oil']").click();
    expect(storedCart()[0].qty).toBe(1);

    document.querySelector("[data-remove='oil']").click();
    expect(storedCart()).toEqual([]);
    expect(document.getElementById("cart-items-list").textContent).toContain("Your basket is empty");
  });

  it("blocks checkout with an alert while the basket is empty", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const location = stubLocation();
    document.body.innerHTML = CART_PAGE;
    const jr = await loadCart();
    jr.ready();
    document.getElementById("cart-checkout-btn").click();
    expect(alertSpy).toHaveBeenCalledOnce();
    expect(location.href).not.toBe("checkout.html");
  });

  it("opens checkout once the basket has items", async () => {
    seedCart([{ ...OIL, qty: 1 }]);
    const location = stubLocation();
    document.body.innerHTML = CART_PAGE;
    const jr = await loadCart();
    jr.ready();
    document.getElementById("cart-checkout-btn").click();
    expect(location.href).toBe("checkout.html");
  });

  it("redraws the rows when the language changes", async () => {
    seedCart([{ ...OIL, qty: 1 }]);
    document.body.innerHTML = CART_PAGE;
    const jr = await loadCart();
    jr.ready();
    window.JRI18N = { t: (key) => (key === "cart.dynamic.unit_price" ? "PRECIO UNITARIO" : key) };
    jr.emit("jr:langchange", { lang: "es" });
    expect(document.querySelector("[data-cart-row='oil']").textContent).toContain("PRECIO UNITARIO");
  });

  it("does nothing when the page has no cart list", async () => {
    document.body.innerHTML = `<div id="something-else"></div>`;
    const jr = await loadCart();
    expect(() => jr.ready()).not.toThrow();
  });
});

describe("checkout page", () => {
  const CHECKOUT_PAGE = `
    <span id="checkout-subtotal"></span>
    <span id="checkout-total"></span>
    <button id="checkout-pay-btn">Pay</button>`;

  it("fills in the order summary from the basket", async () => {
    seedCart([{ ...OIL, qty: 1 }]);
    document.body.innerHTML = CHECKOUT_PAGE;
    const jr = await loadCart();
    jr.ready();
    expect(document.getElementById("checkout-subtotal").textContent).toBe("$24.00");
    expect(document.getElementById("checkout-total").textContent).toBe("$34.59");
  });

  it("redirects to the configured Stripe payment link", async () => {
    seedCart([{ ...OIL, qty: 1 }]);
    window.JR_CONFIG = { STRIPE_PAYMENT_LINK: "https://buy.stripe.com/test_abc" };
    const location = stubLocation();
    document.body.innerHTML = CHECKOUT_PAGE;
    const jr = await loadCart();
    jr.ready();
    document.getElementById("checkout-pay-btn").click();
    expect(location.href).toBe("https://buy.stripe.com/test_abc");
  });

  it("warns instead of redirecting while the payment link is still a placeholder", async () => {
    seedCart([{ ...OIL, qty: 1 }]);
    window.JR_CONFIG = { STRIPE_PAYMENT_LINK: "https://buy.stripe.com/your_payment_link_id" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const location = stubLocation();
    document.body.innerHTML = CHECKOUT_PAGE;
    const jr = await loadCart();
    jr.ready();
    document.getElementById("checkout-pay-btn").click();
    expect(alertSpy).toHaveBeenCalledOnce();
    expect(location.href).toBe("http://localhost/");
  });

  it("sends an empty basket back to the reserve", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const location = stubLocation();
    document.body.innerHTML = CHECKOUT_PAGE;
    const jr = await loadCart();
    jr.ready();
    document.getElementById("checkout-pay-btn").click();
    expect(alertSpy).toHaveBeenCalledOnce();
    expect(location.href).toBe("reserve.html");
  });

  it("does nothing when the page has no checkout summary", async () => {
    document.body.innerHTML = `<div></div>`;
    const jr = await loadCart();
    expect(() => jr.ready()).not.toThrow();
  });
});

describe("contact form", () => {
  const FORM = `
    <form id="lab-contact-form">
      <input value="Jorge"/>
      <input value="jorge@example.com"/>
      <input value="Wholesale"/>
      <textarea>Hola</textarea>
    </form>`;

  it("builds a mailto link to the configured address", async () => {
    window.JR_CONFIG = { CONTACT_EMAIL: "hola@jrpurelife.com" };
    const location = stubLocation();
    document.body.innerHTML = FORM;
    const jr = await loadCart();
    jr.ready();
    document.getElementById("lab-contact-form").dispatchEvent(new Event("submit", { cancelable: true }));
    expect(location.href).toContain("mailto:hola@jrpurelife.com");
    expect(location.href).toContain(encodeURIComponent("Jorge"));
    expect(location.href).toContain(encodeURIComponent("Wholesale"));
  });

  it("falls back to the default address when no config is present", async () => {
    const location = stubLocation();
    document.body.innerHTML = FORM;
    const jr = await loadCart();
    jr.ready();
    document.getElementById("lab-contact-form").dispatchEvent(new Event("submit", { cancelable: true }));
    expect(location.href).toContain("mailto:hola@jrpurelife.com");
  });

  it("does nothing when the page has no contact form", async () => {
    document.body.innerHTML = `<form id="other"></form>`;
    const jr = await loadCart();
    expect(() => jr.ready()).not.toThrow();
  });
});
