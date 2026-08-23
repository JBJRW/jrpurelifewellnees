/* JR PureLife Wellness — Navigation repair.
   The original Stitch export left every nav link pointing at
   "{{DATA:SCREEN:...}}" placeholders or "#". This maps visible link
   text to the real pages we assembled, without touching any visual
   styling. It only ever changes the href attribute. */
(function () {
  const MAP = {
    "home": "home.html",
    "sanctuary": "home.html",
    "jr purelife wellness": "home.html",
    "enter": "home.html",
    "enter the sanctuary": "home.html",
    "our story": "home.html",
    "shop": "reserve.html",
    "explore collection": "reserve.html",
    "the archive": "reserve.html",
    "rare extractions": "reserve.html",
    "collection": "reserve.html",
    "collections": "reserve.html",
    "boutique": "reserve.html",
    "artisanal soaps": "reserve.html",
    "elixirs": "reserve.html",
    "the trinity": "product.html",
    "heritage": "product.html",
    "ancestral heritage": "product.html",
    "select extraction": "product.html",
    "alchemy": "alchemy.html",
    "our alchemy": "alchemy.html",
    "science": "alchemy.html",
    "the science": "alchemy.html",
    "botanical science": "alchemy.html",
    "sourcing ethics": "alchemy.html",
    "ethical sourcing": "alchemy.html",
    "sustainability": "alchemy.html",
    "sustainability report": "alchemy.html",
    "purity standards": "alchemy.html",
    "laboratory standards": "alchemy.html",
    "lab certification": "alchemy.html",
    "certifications": "alchemy.html",
    "wellness journal": "journal.html",
    "the journal": "journal.html",
    "journal": "journal.html",
    "lab notes": "journal.html",
    "lab reports": "journal.html",
    "rituals": "journal.html",
    "explore article": "journal.html",
    "concierge": "concierge.html",
    "oracle": "vault.html",
    "points": "points.html",
    "sanctuary points & rewards": "points.html",
    "rewards": "points.html",
    "redeem": "points.html",
    "achievements": "achievements.html",
    "botanical achievements": "achievements.html",
    "seals": "achievements.html",
    "levels": "achievements.html",
    "circle": "circle.html",
    "alchemist's circle": "circle.html",
    "alchemist circle": "circle.html",
    "personal alchemist": "circle.html",
    "protocol history": "history.html",
    "scientific history": "history.html",
    "extraction history": "history.html",
    "maturation window": "calendar.html",
    "maturation": "calendar.html",
    "calendar": "calendar.html",
    "ritual sanctuary": "calendar.html",
    "bio-synergy": "synergy.html",
    "bio synergy": "synergy.html",
    "synergy": "synergy.html",
    "biological intelligence": "synergy.html",
    "ph analysis": "ph.html",
    "post-session analysis": "ph.html",
    "lab reports": "ph.html",
    "protocol alpha": "ph.html",
    "ritual assistant": "assistant.html",
    "smart assistant": "assistant.html",
    "actionable intelligence": "assistant.html",
    "certificate": "certificate.html",
    "certificate of authenticity": "certificate.html",
    "digital certificate": "certificate.html",
    "ancestral rituals": "rituals.html",
    "hair ritual": "rituals.html",
    "skin ritual": "rituals.html",
    "sanctuary accessories": "accessories.html",
    "instruments of calm": "accessories.html",
    "accessories": "accessories.html",
    "write a review": "review.html",
    "share the wisdom": "review.html",
    "post review": "review.html",
    "sustainable packaging": "packaging.html",
    "crafted for the soil": "packaging.html",
    "packaging": "packaging.html",
    "super pack": "checkout-superpack.html",
    "exclusive super pack": "checkout-superpack.html",
    "finalize your alchemy": "checkout-superpack.html",
    "cart": "cart.html",
    "your ritual basket": "cart.html",
    "checkout": "checkout.html",
    "contact": "contact.html",
    "contact us": "contact.html",
    "wholesale": "contact.html",
    "shipping": "contact.html",
    "shipping policy": "contact.html",
    "returns": "contact.html",
    "privacy policy": "contact.html",
    "privacy": "contact.html",
    "terms of service": "contact.html",
    "sanctuary terms & conditions": "contact.html",
  };

  function fixLinks() {
    document.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const text = a.textContent.trim().toLowerCase().replace(/\s+/g, " ");
      if (a.hasAttribute("data-jr-fixed")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (href && !href.startsWith("{{DATA") && href !== "#") return; // already a real link
      if (MAP[text]) {
        a.setAttribute("href", MAP[text]);
        a.setAttribute("data-jr-fixed", "1");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", fixLinks);
})();
