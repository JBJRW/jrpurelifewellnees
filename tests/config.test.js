import { beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "./helpers/load.js";

beforeEach(() => {
  delete window.JR_CONFIG;
});

describe("site configuration", () => {
  it("exposes the settings the storefront reads", async () => {
    await loadConfig();
    expect(Object.keys(window.JR_CONFIG).sort()).toEqual(["CONTACT_EMAIL", "STRIPE_PAYMENT_LINK"]);
  });

  it("ships a usable Stripe payment link rather than the placeholder", async () => {
    await loadConfig();
    expect(window.JR_CONFIG.STRIPE_PAYMENT_LINK).toMatch(/^https:\/\/buy\.stripe\.com\//);
    expect(window.JR_CONFIG.STRIPE_PAYMENT_LINK).not.toContain("your_payment_link_id");
  });

  it("ships a contact address the form can mail to", async () => {
    await loadConfig();
    expect(window.JR_CONFIG.CONTACT_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
  });
});
