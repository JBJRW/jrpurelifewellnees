import { beforeEach, describe, expect, it } from "vitest";
import { loadNavFix } from "./helpers/load.js";

function link(html) {
  document.body.innerHTML = html;
  return document.querySelector("a");
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("nav link repair", () => {
  it("replaces a Stitch placeholder href with the real page", async () => {
    const a = link(`<a href="{{DATA:SCREEN:SHOP}}">Shop</a>`);
    const jr = await loadNavFix();
    jr.ready();
    expect(a.getAttribute("href")).toBe("reserve.html");
    expect(a.getAttribute("data-jr-fixed")).toBe("1");
  });

  it("replaces a bare hash href", async () => {
    const a = link(`<a href="#">Contact Us</a>`);
    const jr = await loadNavFix();
    jr.ready();
    expect(a.getAttribute("href")).toBe("contact.html");
  });

  it("fixes a link with no href at all", async () => {
    const a = link(`<a>Membership</a>`);
    const jr = await loadNavFix();
    jr.ready();
    expect(a.getAttribute("href")).toBe("membership.html");
  });

  it("matches link text case-insensitively and collapses whitespace", async () => {
    const a = link(`<a href="#">  Alchemist's\n  Circle  </a>`);
    const jr = await loadNavFix();
    jr.ready();
    expect(a.getAttribute("href")).toBe("circle.html");
  });

  it("leaves an href that already points at a real page", async () => {
    const a = link(`<a href="journal.html">Shop</a>`);
    const jr = await loadNavFix();
    jr.ready();
    expect(a.getAttribute("href")).toBe("journal.html");
    expect(a.hasAttribute("data-jr-fixed")).toBe(false);
  });

  it("leaves mailto and tel links alone", async () => {
    document.body.innerHTML = `<a href="mailto:hola@jrpurelife.com">Contact</a><a href="tel:+15551234">Contact</a>`;
    const jr = await loadNavFix();
    jr.ready();
    const [mail, tel] = document.querySelectorAll("a");
    expect(mail.getAttribute("href")).toBe("mailto:hola@jrpurelife.com");
    expect(tel.getAttribute("href")).toBe("tel:+15551234");
  });

  it("leaves unknown link text untouched", async () => {
    const a = link(`<a href="#">Some marketing slogan</a>`);
    const jr = await loadNavFix();
    jr.ready();
    expect(a.getAttribute("href")).toBe("#");
  });

  it("skips a link it has already fixed", async () => {
    const a = link(`<a href="cart.html" data-jr-fixed="1">Shop</a>`);
    const jr = await loadNavFix();
    jr.ready();
    expect(a.getAttribute("href")).toBe("cart.html");
  });

  it("maps every group of nav labels to its page", async () => {
    document.body.innerHTML = [
      "Home",
      "Explore Collection",
      "The Trinity",
      "Our Alchemy",
      "Wellness Journal",
      "Concierge",
      "Oracle",
      "Rewards",
      "Achievements",
      "Protocol History",
      "Calendar",
      "Bio-Synergy",
      "Ritual Assistant",
      "Certificate of Authenticity",
      "Hair Ritual",
      "Sanctuary Accessories",
      "Write a Review",
      "Sustainable Packaging",
      "Exclusive Super Pack",
      "Your Ritual Basket",
      "Checkout",
      "Privacy Policy",
    ]
      .map((text) => `<a href="#">${text}</a>`)
      .join("");
    const jr = await loadNavFix();
    jr.ready();
    const hrefs = [...document.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "home.html",
      "reserve.html",
      "product.html",
      "alchemy.html",
      "journal.html",
      "concierge.html",
      "vault.html",
      "points.html",
      "achievements.html",
      "history.html",
      "calendar.html",
      "synergy.html",
      "assistant.html",
      "certificate.html",
      "rituals.html",
      "accessories.html",
      "review.html",
      "packaging.html",
      "checkout-superpack.html",
      "cart.html",
      "checkout.html",
      "contact.html",
    ]);
  });
});
