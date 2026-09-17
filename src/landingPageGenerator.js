import { menuForLead } from "./menuCatalog.js";

// Standard-Öffnungszeiten für den Entwurf. Google liefert diese Felder in
// unserer Suchabfrage nicht mit, deshalb sind es bewusst Platzhalter, die im
// Footer der Seite auch als solche gekennzeichnet werden.
export const DEFAULT_OPENING_HOURS = [
  { tage: "Montag – Donnerstag", zeiten: "11:30 – 14:00 & 17:00 – 22:00" },
  { tage: "Freitag – Samstag", zeiten: "11:30 – 14:00 & 17:00 – 23:00" },
  { tage: "Sonntag & Feiertage", zeiten: "11:30 – 21:00" },
];

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    // Restliche Akzente (Café, Trattoria à la ...) auf den Grundbuchstaben reduzieren.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "restaurant";
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Verhindert, dass ein "</script>" in den Daten das Skript-Tag vorzeitig schließt.
function jsonForScript(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function formatPrice(value) {
  return `${Number(value).toFixed(2).replace(".", ",")} €`;
}

function formatCount(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function timeSlots(startMinutes, endMinutes, stepMinutes) {
  const slots = [];
  for (let m = startMinutes; m <= endMinutes; m += stepMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

const RESERVATION_SLOTS = [
  ...timeSlots(11 * 60 + 30, 14 * 60, 30),
  ...timeSlots(17 * 60, 21 * 60 + 30, 30),
];

const PICKUP_SLOTS = [
  ...timeSlots(11 * 60 + 30, 14 * 60, 15),
  ...timeSlots(17 * 60, 21 * 60 + 30, 15),
];

const PAGE_STYLES = `
*, *::before, *::after { box-sizing: border-box; }
:root {
  --ink: #1d1613;
  --ink-soft: #5f5148;
  --bg: #fffdfa;
  --surface: #ffffff;
  --line: #ece2d7;
  --accent: #b4451f;
  --accent-dark: #8d3416;
  --gold: #c1872c;
  --success: #2f7d55;
  --shadow: 0 18px 40px -22px rgba(45, 26, 14, .45);
  --radius: 16px;
}
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 17px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { font-family: Georgia, "Iowan Old Style", "Times New Roman", serif; line-height: 1.15; margin: 0; font-weight: 600; }
p { margin: 0; }
a { color: inherit; }
img { max-width: 100%; }
.wrap { width: 100%; max-width: 1080px; margin: 0 auto; padding: 0 20px; }
.section { padding: 72px 0; }
.section-head { max-width: 640px; margin-bottom: 40px; }
.eyebrow { text-transform: uppercase; letter-spacing: .16em; font-size: 12px; font-weight: 700; color: var(--accent); margin-bottom: 12px; }
.section-head h2 { font-size: clamp(28px, 4.5vw, 40px); margin-bottom: 14px; }
.section-head p { color: var(--ink-soft); }

/* Kopfzeile */
.topbar {
  position: sticky; top: 0; z-index: 40;
  background: rgba(255, 253, 250, .92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.topbar-inner { display: flex; align-items: center; gap: 18px; height: 66px; }
.brand { font-family: Georgia, serif; font-size: 19px; font-weight: 600; margin-right: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.topnav { display: none; gap: 24px; font-size: 15px; }
.topnav a { text-decoration: none; color: var(--ink-soft); }
.topnav a:hover { color: var(--accent); }
@media (min-width: 900px) { .topnav { display: flex; } }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 13px 22px; border-radius: 999px; border: 1px solid transparent;
  font-size: 15px; font-weight: 600; font-family: inherit; text-decoration: none;
  cursor: pointer; transition: transform .12s ease, background .12s ease, box-shadow .12s ease;
}
.btn:active { transform: translateY(1px); }
.btn-primary { background: var(--accent); color: #fff; box-shadow: 0 10px 24px -12px rgba(180, 69, 31, .8); }
.btn-primary:hover { background: var(--accent-dark); }
.btn-ghost { background: transparent; color: var(--ink); border-color: var(--line); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.btn-light { background: #fff; color: var(--ink); }
.btn-outline-light { background: transparent; color: #fff; border-color: rgba(255,255,255,.5); }
.btn-outline-light:hover { border-color: #fff; }
.btn-block { width: 100%; }
.btn[disabled] { opacity: .5; cursor: not-allowed; }

/* Hero */
.hero { position: relative; color: #fff; overflow: hidden; background: #2a1a12; }
.hero::before {
  content: ""; position: absolute; inset: 0;
  background:
    radial-gradient(900px 420px at 15% 0%, rgba(193, 135, 44, .38), transparent 62%),
    radial-gradient(760px 480px at 88% 22%, rgba(180, 69, 31, .5), transparent 60%),
    linear-gradient(165deg, #3a2317 0%, #23150e 100%);
}
.hero-inner { position: relative; padding: 92px 20px 100px; }
.hero-inner > * { max-width: 700px; }
.hero h1 { font-size: clamp(38px, 7vw, 66px); letter-spacing: -.01em; }
.hero-kicker { text-transform: uppercase; letter-spacing: .2em; font-size: 12px; font-weight: 700; color: var(--gold); margin-bottom: 18px; }
.hero-sub { margin-top: 20px; font-size: clamp(17px, 2.4vw, 20px); color: rgba(255,255,255,.82); max-width: 520px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
.rating { display: inline-flex; align-items: center; gap: 10px; margin-top: 30px; font-size: 15px; color: rgba(255,255,255,.85); }
.stars { color: var(--gold); letter-spacing: 2px; }

/* Vorteile */
.usp-grid { display: grid; gap: 20px; grid-template-columns: 1fr; }
@media (min-width: 780px) { .usp-grid { grid-template-columns: repeat(3, 1fr); } }
.usp-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 28px; box-shadow: var(--shadow); }
.usp-card h3 { font-size: 20px; margin-bottom: 10px; }
.usp-card p { color: var(--ink-soft); font-size: 15px; }
.usp-icon { font-size: 26px; margin-bottom: 14px; display: block; }

/* Speisekarte */
.menu-cat { margin-bottom: 48px; }
.menu-cat h3 { font-size: 24px; padding-bottom: 12px; border-bottom: 2px solid var(--line); margin-bottom: 8px; }
.dish { display: flex; align-items: flex-start; gap: 18px; padding: 20px 0; border-bottom: 1px solid var(--line); }
.dish-body { flex: 1; min-width: 0; }
.dish-name { font-weight: 600; font-size: 17px; }
.dish-desc { color: var(--ink-soft); font-size: 15px; margin-top: 3px; }
.veg { display: inline-block; margin-left: 8px; font-size: 11px; font-weight: 700; color: var(--success); border: 1px solid currentColor; border-radius: 999px; padding: 1px 8px; vertical-align: middle; }
.dish-side { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.dish-price { font-weight: 600; white-space: nowrap; }
.add-btn {
  width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line);
  background: var(--surface); color: var(--accent); font-size: 22px; line-height: 1;
  cursor: pointer; transition: background .12s ease, color .12s ease, border-color .12s ease;
}
.add-btn:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

/* Formulare */
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 30px; box-shadow: var(--shadow); }
.field-grid { display: grid; gap: 18px; grid-template-columns: 1fr; }
@media (min-width: 680px) { .field-grid { grid-template-columns: 1fr 1fr; } }
.field { display: flex; flex-direction: column; gap: 7px; }
.field-wide { grid-column: 1 / -1; }
label { font-size: 14px; font-weight: 600; }
input, select, textarea {
  font-family: inherit; font-size: 16px; color: var(--ink);
  padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px;
  background: #fff; width: 100%;
}
input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: transparent; }
textarea { resize: vertical; min-height: 90px; }
.hint { font-size: 13px; color: var(--ink-soft); }
.error { font-size: 13px; color: var(--accent); display: none; }
.field.invalid .error { display: block; }
.field.invalid input, .field.invalid select { border-color: var(--accent); }
.reserve-section { background: #f9f2ea; }

/* Warenkorb */
.cart-fab {
  position: fixed; right: 20px; bottom: 20px; z-index: 50;
  display: none; align-items: center; gap: 12px;
  padding: 14px 22px; border: none; border-radius: 999px;
  background: var(--accent); color: #fff; font-family: inherit; font-size: 15px; font-weight: 600;
  cursor: pointer; box-shadow: 0 16px 34px -14px rgba(180, 69, 31, .9);
}
.cart-fab.visible { display: inline-flex; }
.cart-count { background: rgba(255,255,255,.25); border-radius: 999px; padding: 1px 9px; font-size: 13px; }
.overlay { position: fixed; inset: 0; background: rgba(28, 18, 12, .55); z-index: 60; opacity: 0; pointer-events: none; transition: opacity .2s ease; }
.overlay.open { opacity: 1; pointer-events: auto; }
.drawer {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 70;
  width: min(430px, 100%); background: var(--bg);
  display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform .26s ease;
  box-shadow: -20px 0 50px -30px rgba(0,0,0,.6);
}
.drawer.open { transform: translateX(0); }
.drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 20px; border-bottom: 1px solid var(--line); }
.drawer-head h3 { font-size: 20px; }
.icon-btn { border: none; background: transparent; font-size: 26px; line-height: 1; cursor: pointer; color: var(--ink-soft); padding: 4px 8px; }
.drawer-body { flex: 1; overflow-y: auto; padding: 20px; }
.drawer-foot { padding: 20px; border-top: 1px solid var(--line); background: var(--surface); }
.cart-line { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.cart-line-body { flex: 1; min-width: 0; }
.cart-line-name { font-size: 15px; font-weight: 600; }
.cart-line-price { font-size: 14px; color: var(--ink-soft); }
.qty { display: flex; align-items: center; gap: 4px; }
.qty button { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--line); background: #fff; cursor: pointer; font-size: 17px; line-height: 1; color: var(--accent); }
.qty span { min-width: 26px; text-align: center; font-weight: 600; font-size: 15px; }
.cart-empty { text-align: center; color: var(--ink-soft); padding: 40px 10px; }
.totals { display: flex; justify-content: space-between; font-size: 20px; font-weight: 600; margin-bottom: 16px; font-family: Georgia, serif; }
.drawer .field-grid { grid-template-columns: 1fr; }

/* Bestätigung */
.confirm-box {
  position: fixed; z-index: 80; left: 50%; top: 50%; transform: translate(-50%, -46%);
  width: min(480px, calc(100% - 32px)); max-height: 84vh; overflow-y: auto;
  background: var(--surface); border-radius: var(--radius); padding: 34px 30px;
  box-shadow: 0 30px 70px -30px rgba(0,0,0,.6); text-align: center;
  opacity: 0; pointer-events: none; transition: opacity .2s ease, transform .2s ease;
}
.confirm-box.open { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%); }
.confirm-icon { width: 62px; height: 62px; border-radius: 50%; background: #e7f4ec; color: var(--success); display: grid; place-items: center; font-size: 32px; margin: 0 auto 18px; }
.confirm-box h3 { font-size: 24px; margin-bottom: 12px; }
.confirm-summary { text-align: left; background: #faf6f1; border-radius: 12px; padding: 16px 18px; margin: 20px 0; font-size: 15px; }
.confirm-summary div { display: flex; justify-content: space-between; gap: 16px; padding: 3px 0; }
.confirm-summary .label { color: var(--ink-soft); }
.demo-note { font-size: 13px; color: var(--ink-soft); margin-top: 16px; }

/* Kontakt */
.contact-grid { display: grid; gap: 30px; grid-template-columns: 1fr; }
@media (min-width: 820px) { .contact-grid { grid-template-columns: 1fr 1fr; } }
.contact-list { list-style: none; margin: 0; padding: 0; }
.contact-list li { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.contact-list .k { font-size: 22px; }
.contact-list a { color: var(--accent); }
.hours-row { display: flex; justify-content: space-between; gap: 20px; padding: 11px 0; border-bottom: 1px solid var(--line); font-size: 15px; }
.hours-row span:first-child { color: var(--ink-soft); }
.placeholder-badge { display: inline-block; font-size: 12px; font-weight: 700; color: var(--gold); border: 1px solid currentColor; border-radius: 999px; padding: 2px 10px; margin-left: 8px; vertical-align: middle; }

footer { background: #23150e; color: rgba(255,255,255,.7); padding: 46px 0; font-size: 14px; }
footer strong { color: #fff; }
.footer-note { margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.15); font-size: 13px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
`;

const PAGE_SCRIPT = `
(function () {
  var data = window.PAGE_DATA;
  var cart = {};

  function euro(value) { return value.toFixed(2).replace(".", ",") + " \\u20AC"; }
  function byId(id) { return document.getElementById(id); }
  function lines() {
    return Object.keys(cart).map(function (id) { return cart[id]; })
      .filter(function (line) { return line.menge > 0; });
  }
  function total() {
    return lines().reduce(function (sum, line) { return sum + line.preis * line.menge; }, 0);
  }
  function anzahl() {
    return lines().reduce(function (sum, line) { return sum + line.menge; }, 0);
  }

  function renderCart() {
    var list = byId("cart-lines");
    var current = lines();
    list.innerHTML = "";

    if (current.length === 0) {
      var empty = document.createElement("p");
      empty.className = "cart-empty";
      empty.textContent = "Noch nichts ausgew\\u00E4hlt. St\\u00F6bern Sie in der Speisekarte.";
      list.appendChild(empty);
    } else {
      current.forEach(function (line) {
        var row = document.createElement("div");
        row.className = "cart-line";

        var body = document.createElement("div");
        body.className = "cart-line-body";
        var nameEl = document.createElement("div");
        nameEl.className = "cart-line-name";
        nameEl.textContent = line.name;
        var priceEl = document.createElement("div");
        priceEl.className = "cart-line-price";
        priceEl.textContent = line.menge + " \\u00D7 " + euro(line.preis);
        body.appendChild(nameEl);
        body.appendChild(priceEl);

        var qty = document.createElement("div");
        qty.className = "qty";
        var minus = document.createElement("button");
        minus.type = "button";
        minus.textContent = "\\u2212";
        minus.setAttribute("aria-label", "Weniger " + line.name);
        minus.onclick = function () { changeQty(line.id, -1); };
        var count = document.createElement("span");
        count.textContent = String(line.menge);
        var plus = document.createElement("button");
        plus.type = "button";
        plus.textContent = "+";
        plus.setAttribute("aria-label", "Mehr " + line.name);
        plus.onclick = function () { changeQty(line.id, 1); };
        qty.appendChild(minus);
        qty.appendChild(count);
        qty.appendChild(plus);

        row.appendChild(body);
        row.appendChild(qty);
        list.appendChild(row);
      });
    }

    byId("cart-total").textContent = euro(total());
    byId("fab-total").textContent = euro(total());
    byId("fab-count").textContent = String(anzahl());
    byId("order-submit").disabled = current.length === 0;
    byId("cart-fab").className = current.length === 0 ? "cart-fab" : "cart-fab visible";
  }

  function changeQty(id, delta) {
    var line = cart[id];
    if (!line) return;
    line.menge += delta;
    if (line.menge <= 0) delete cart[id];
    renderCart();
  }

  function addToCart(id, name, preis) {
    if (!cart[id]) cart[id] = { id: id, name: name, preis: preis, menge: 0 };
    cart[id].menge += 1;
    renderCart();
    openDrawer();
  }

  function openDrawer() {
    byId("drawer").classList.add("open");
    byId("overlay").classList.add("open");
  }
  function closeDrawer() {
    byId("drawer").classList.remove("open");
    if (!byId("confirm").classList.contains("open")) byId("overlay").classList.remove("open");
  }

  function showConfirm(title, text, rows, mailto) {
    byId("confirm-title").textContent = title;
    byId("confirm-text").textContent = text;

    var box = byId("confirm-summary");
    box.innerHTML = "";
    rows.forEach(function (row) {
      var line = document.createElement("div");
      var label = document.createElement("span");
      label.className = "label";
      label.textContent = row[0];
      var value = document.createElement("span");
      value.textContent = row[1];
      line.appendChild(label);
      line.appendChild(value);
      box.appendChild(line);
    });

    var link = byId("confirm-mail");
    if (mailto) {
      link.href = mailto;
      link.style.display = "inline-flex";
    } else {
      link.style.display = "none";
    }

    byId("confirm").classList.add("open");
    byId("overlay").classList.add("open");
  }

  function closeConfirm() {
    byId("confirm").classList.remove("open");
    byId("overlay").classList.remove("open");
  }

  function validate(form, names) {
    var ok = true;
    names.forEach(function (name) {
      var input = form.elements[name];
      var field = input.closest(".field");
      var valid = String(input.value).trim().length > 0;
      if (field) field.className = valid ? "field" + (field.classList.contains("field-wide") ? " field-wide" : "")
                                         : "field invalid" + (field.classList.contains("field-wide") ? " field-wide" : "");
      if (!valid && ok) { input.focus(); ok = false; }
    });
    return ok;
  }

  function mailtoLink(subject, body) {
    if (!data.kontaktEmail) return "";
    return "mailto:" + data.kontaktEmail +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  }

  function referenz(prefix) {
    return prefix + "-" + String(Math.floor(1000 + Math.random() * 9000));
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-add]"), function (button) {
      button.addEventListener("click", function () {
        addToCart(button.getAttribute("data-add"), button.getAttribute("data-name"), Number(button.getAttribute("data-preis")));
      });
    });

    byId("cart-fab").addEventListener("click", openDrawer);
    byId("drawer-close").addEventListener("click", closeDrawer);
    byId("overlay").addEventListener("click", function () { closeDrawer(); closeConfirm(); });
    byId("confirm-close").addEventListener("click", closeConfirm);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { closeDrawer(); closeConfirm(); }
    });

    var dateInput = byId("res-datum");
    var today = new Date();
    var iso = today.getFullYear() + "-" +
      String(today.getMonth() + 1).padStart(2, "0") + "-" +
      String(today.getDate()).padStart(2, "0");
    dateInput.min = iso;
    dateInput.value = iso;

    byId("order-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      if (lines().length === 0) return;
      if (!validate(form, ["name", "telefon", "abholzeit"])) return;

      var nummer = referenz("AB");
      var zeit = form.elements.abholzeit.value;
      var summary = lines().map(function (line) {
        return line.menge + " \\u00D7 " + line.name + " (" + euro(line.preis * line.menge) + ")";
      }).join("\\n");

      var body = "Abholbestellung " + nummer + "\\n\\n" + summary +
        "\\n\\nGesamt: " + euro(total()) +
        "\\nAbholung: " + zeit +
        "\\nName: " + form.elements.name.value +
        "\\nTelefon: " + form.elements.telefon.value +
        (form.elements.hinweis.value ? "\\nHinweis: " + form.elements.hinweis.value : "");

      showConfirm(
        "Bestellung aufgenommen",
        "Wir bereiten Ihr Essen frisch zu. Bitte holen Sie es zur gew\\u00E4hlten Zeit bei uns ab.",
        [
          ["Bestellnummer", nummer],
          ["Abholung", zeit],
          ["Positionen", String(anzahl())],
          ["Gesamt", euro(total())],
        ],
        mailtoLink("Abholbestellung " + nummer + " \\u2013 " + data.name, body)
      );

      cart = {};
      renderCart();
      form.reset();
      closeDrawer();
    });

    byId("reservation-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      if (!validate(form, ["datum", "uhrzeit", "personen", "name", "telefon"])) return;

      var nummer = referenz("RES");
      var datum = form.elements.datum.value.split("-").reverse().join(".");
      var body = "Tischreservierung " + nummer + "\\n\\n" +
        "Datum: " + datum +
        "\\nUhrzeit: " + form.elements.uhrzeit.value +
        "\\nPersonen: " + form.elements.personen.value +
        "\\nName: " + form.elements.name.value +
        "\\nTelefon: " + form.elements.telefon.value +
        (form.elements.email.value ? "\\nE-Mail: " + form.elements.email.value : "") +
        (form.elements.wunsch.value ? "\\nWunsch: " + form.elements.wunsch.value : "");

      showConfirm(
        "Tisch reserviert",
        "Vielen Dank! Ihre Reservierung liegt uns vor \\u2013 wir freuen uns auf Ihren Besuch.",
        [
          ["Reservierungsnr.", nummer],
          ["Datum", datum],
          ["Uhrzeit", form.elements.uhrzeit.value],
          ["Personen", form.elements.personen.value],
        ],
        mailtoLink("Tischreservierung " + nummer + " \\u2013 " + data.name, body)
      );

      form.reset();
      dateInput.value = iso;
    });

    renderCart();
  });
})();
`;

function renderMenu(menu) {
  return menu.kategorien
    .map((kategorie, katIndex) => {
      const dishes = kategorie.gerichte
        .map((gericht, dishIndex) => {
          const id = `${katIndex}-${dishIndex}`;
          const veg = gericht.vegetarisch
            ? '<span class="veg">vegetarisch</span>'
            : "";
          return `
          <div class="dish">
            <div class="dish-body">
              <div class="dish-name">${escapeHtml(gericht.name)}${veg}</div>
              <div class="dish-desc">${escapeHtml(gericht.beschreibung)}</div>
            </div>
            <div class="dish-side">
              <span class="dish-price">${formatPrice(gericht.preis)}</span>
              <button class="add-btn" type="button" data-add="${id}" data-name="${escapeHtml(gericht.name)}" data-preis="${gericht.preis}" aria-label="${escapeHtml(gericht.name)} zur Abholbestellung hinzufügen">+</button>
            </div>
          </div>`;
        })
        .join("");

      return `
      <div class="menu-cat">
        <h3>${escapeHtml(kategorie.name)}</h3>
        ${dishes}
      </div>`;
    })
    .join("");
}

function renderRatingBadge(lead) {
  if (!lead.rating) return "";
  const rounded = Math.round(Number(lead.rating));
  const stars = "★".repeat(rounded) + "☆".repeat(Math.max(0, 5 - rounded));
  const count = lead.anzahlBewertungen
    ? ` · ${formatCount(lead.anzahlBewertungen)} Google-Bewertungen`
    : "";
  return `
    <div class="rating">
      <span class="stars" aria-hidden="true">${stars}</span>
      <span>${String(lead.rating).replace(".", ",")} von 5${count}</span>
    </div>`;
}

function optionList(values) {
  return values.map((value) => `<option>${escapeHtml(value)}</option>`).join("");
}

/**
 * Baut eine eigenständige HTML-Landingpage für einen Lead: Speisekarte,
 * Abholbestellung mit Warenkorb und Tischreservierung – alles in einer Datei,
 * ohne externe Abhängigkeiten.
 */
export function buildLandingPage(lead, options = {}) {
  const menu = options.menu ?? menuForLead(lead);
  const openingHours = options.öffnungszeiten ?? DEFAULT_OPENING_HOURS;
  const kontaktEmail = options.kontaktEmail ?? "";

  const name = lead.name || "Ihr Restaurant";
  const ort = lead.ort || "";
  const adresse = lead.adresse || "";
  const telefon = lead.telefon || "";
  const telHref = telefon.replace(/[^\d+]/g, "");
  const mapsUrl = adresse
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`
    : "";

  const pageData = jsonForScript({ name, kontaktEmail });

  const kontaktZeilen = [
    adresse
      ? `<li><span class="k">📍</span><span>${escapeHtml(adresse)}${
          mapsUrl
            ? `<br><a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener">Route planen</a>`
            : ""
        }</span></li>`
      : "",
    telefon
      ? `<li><span class="k">📞</span><span><a href="tel:${escapeHtml(telHref)}">${escapeHtml(telefon)}</a><br><span class="hint">Telefonisch erreichbar während der Öffnungszeiten</span></span></li>`
      : "",
    `<li><span class="k">🥡</span><span>Abholung vorbestellen – Ihr Essen steht pünktlich bereit</span></li>`,
  ]
    .filter(Boolean)
    .join("");

  const hoursRows = openingHours
    .map(
      (row) =>
        `<div class="hours-row"><span>${escapeHtml(row.tage)}</span><span>${escapeHtml(row.zeiten)}</span></div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)}${ort ? ` – ${escapeHtml(ort)}` : ""}</title>
<meta name="description" content="${escapeHtml(`${name}${ort ? ` in ${ort}` : ""} – ${menu.tagline}. Jetzt Tisch reservieren oder Essen zur Abholung vorbestellen.`)}">
<style>${PAGE_STYLES}</style>
</head>
<body>

<header class="topbar">
  <div class="wrap topbar-inner">
    <div class="brand">${escapeHtml(name)}</div>
    <nav class="topnav">
      <a href="#karte">Speisekarte</a>
      <a href="#reservierung">Reservierung</a>
      <a href="#kontakt">Kontakt &amp; Anfahrt</a>
    </nav>
    <a class="btn btn-primary" href="#reservierung">Tisch reservieren</a>
  </div>
</header>

<section class="hero">
  <div class="wrap hero-inner">
    <div class="hero-kicker">${escapeHtml(menu.label)}${ort ? ` · ${escapeHtml(ort)}` : ""}</div>
    <h1>${escapeHtml(name)}</h1>
    <p class="hero-sub">${escapeHtml(menu.tagline)}. Reservieren Sie Ihren Tisch in unter einer Minute – oder bestellen Sie Ihr Essen bequem zur Abholung vor.</p>
    <div class="hero-actions">
      <a class="btn btn-light" href="#reservierung">Tisch reservieren</a>
      <a class="btn btn-outline-light" href="#karte">Zur Abholung bestellen</a>
    </div>
    ${renderRatingBadge(lead)}
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="usp-grid">
      <div class="usp-card">
        <span class="usp-icon" aria-hidden="true">🍽️</span>
        <h3>Tisch online reservieren</h3>
        <p>Rund um die Uhr buchbar – auch dann, wenn bei uns gerade niemand ans Telefon gehen kann.</p>
      </div>
      <div class="usp-card">
        <span class="usp-icon" aria-hidden="true">🥡</span>
        <h3>Vorbestellen &amp; abholen</h3>
        <p>Stellen Sie Ihre Bestellung zusammen, wählen Sie eine Abholzeit – ohne Warten vor Ort.</p>
      </div>
      <div class="usp-card">
        <span class="usp-icon" aria-hidden="true">📱</span>
        <h3>Auf jedem Gerät</h3>
        <p>Am Handy genauso schnell wie am Rechner. Keine App, kein Konto, keine Umwege.</p>
      </div>
    </div>
  </div>
</section>

<section class="section" id="karte">
  <div class="wrap">
    <div class="section-head">
      <div class="eyebrow">Speisekarte</div>
      <h2>Unsere Gerichte</h2>
      <p>Alles frisch zubereitet. Tippen Sie auf das Plus, um ein Gericht zur Abholbestellung hinzuzufügen.</p>
    </div>
    ${renderMenu(menu)}
  </div>
</section>

<section class="section reserve-section" id="reservierung">
  <div class="wrap">
    <div class="section-head">
      <div class="eyebrow">Reservierung</div>
      <h2>Tisch reservieren</h2>
      <p>Wählen Sie Datum, Uhrzeit und Personenzahl – wir halten Ihren Tisch bereit.</p>
    </div>
    <form class="panel" id="reservation-form" novalidate>
      <div class="field-grid">
        <div class="field">
          <label for="res-datum">Datum</label>
          <input type="date" id="res-datum" name="datum" required>
          <span class="error">Bitte wählen Sie ein Datum.</span>
        </div>
        <div class="field">
          <label for="res-uhrzeit">Uhrzeit</label>
          <select id="res-uhrzeit" name="uhrzeit" required>
            <option value="">Bitte wählen</option>
            ${optionList(RESERVATION_SLOTS)}
          </select>
          <span class="error">Bitte wählen Sie eine Uhrzeit.</span>
        </div>
        <div class="field">
          <label for="res-personen">Personen</label>
          <select id="res-personen" name="personen" required>
            <option value="">Bitte wählen</option>
            ${optionList(["1 Person", "2 Personen", "3 Personen", "4 Personen", "5 Personen", "6 Personen", "7 Personen", "8 Personen", "Mehr als 8 Personen"])}
          </select>
          <span class="error">Bitte wählen Sie die Personenzahl.</span>
        </div>
        <div class="field">
          <label for="res-name">Name</label>
          <input type="text" id="res-name" name="name" autocomplete="name" required>
          <span class="error">Bitte geben Sie Ihren Namen an.</span>
        </div>
        <div class="field">
          <label for="res-telefon">Telefon</label>
          <input type="tel" id="res-telefon" name="telefon" autocomplete="tel" required>
          <span class="error">Bitte geben Sie eine Telefonnummer an.</span>
        </div>
        <div class="field">
          <label for="res-email">E-Mail <span class="hint">(optional)</span></label>
          <input type="email" id="res-email" name="email" autocomplete="email">
        </div>
        <div class="field field-wide">
          <label for="res-wunsch">Anmerkungen <span class="hint">(optional)</span></label>
          <textarea id="res-wunsch" name="wunsch" placeholder="Kinderstuhl, Allergien, Tisch am Fenster ..."></textarea>
        </div>
      </div>
      <button class="btn btn-primary btn-block" type="submit" style="margin-top:22px">Reservierung anfragen</button>
    </form>
  </div>
</section>

<section class="section" id="kontakt">
  <div class="wrap">
    <div class="section-head">
      <div class="eyebrow">Kontakt</div>
      <h2>So finden Sie uns</h2>
    </div>
    <div class="contact-grid">
      <ul class="contact-list">${kontaktZeilen}</ul>
      <div>
        <h3 style="font-size:20px;margin-bottom:10px">Öffnungszeiten<span class="placeholder-badge">Platzhalter</span></h3>
        ${hoursRows}
      </div>
    </div>
  </div>
</section>

<button class="cart-fab" id="cart-fab" type="button">
  <span>Warenkorb</span>
  <span class="cart-count" id="fab-count">0</span>
  <span id="fab-total">0,00 €</span>
</button>

<div class="overlay" id="overlay"></div>

<aside class="drawer" id="drawer" aria-label="Abholbestellung">
  <div class="drawer-head">
    <h3>Ihre Abholbestellung</h3>
    <button class="icon-btn" id="drawer-close" type="button" aria-label="Schließen">×</button>
  </div>
  <div class="drawer-body">
    <div id="cart-lines"></div>
    <form id="order-form" novalidate style="margin-top:24px">
      <div class="field-grid">
        <div class="field">
          <label for="ord-abholzeit">Abholzeit</label>
          <select id="ord-abholzeit" name="abholzeit" required>
            <option value="">Bitte wählen</option>
            <option>So schnell wie möglich (ca. 30 Min.)</option>
            ${optionList(PICKUP_SLOTS)}
          </select>
          <span class="error">Bitte wählen Sie eine Abholzeit.</span>
        </div>
        <div class="field">
          <label for="ord-name">Name</label>
          <input type="text" id="ord-name" name="name" autocomplete="name" required>
          <span class="error">Bitte geben Sie Ihren Namen an.</span>
        </div>
        <div class="field">
          <label for="ord-telefon">Telefon</label>
          <input type="tel" id="ord-telefon" name="telefon" autocomplete="tel" required>
          <span class="error">Bitte geben Sie eine Telefonnummer an.</span>
        </div>
        <div class="field">
          <label for="ord-hinweis">Hinweis <span class="hint">(optional)</span></label>
          <textarea id="ord-hinweis" name="hinweis" placeholder="Allergien, Sonderwünsche ..."></textarea>
        </div>
      </div>
      <div class="drawer-foot" style="margin:22px -20px -20px">
        <div class="totals"><span>Gesamt</span><span id="cart-total">0,00 €</span></div>
        <button class="btn btn-primary btn-block" id="order-submit" type="submit">Abholung verbindlich bestellen</button>
        <p class="hint" style="margin-top:10px;text-align:center">Bezahlung bei Abholung, bar oder mit Karte.</p>
      </div>
    </form>
  </div>
</aside>

<div class="confirm-box" id="confirm" role="dialog" aria-modal="true">
  <div class="confirm-icon" aria-hidden="true">✓</div>
  <h3 id="confirm-title"></h3>
  <p id="confirm-text"></p>
  <div class="confirm-summary" id="confirm-summary"></div>
  <a class="btn btn-ghost" id="confirm-mail" style="display:none" href="#">Bestätigung per E-Mail senden</a>
  <button class="btn btn-primary btn-block" id="confirm-close" type="button" style="margin-top:10px">Schließen</button>
  <p class="demo-note">Entwurfsansicht: In der fertigen Version geht diese Anfrage direkt an das Restaurant.</p>
</div>

<footer>
  <div class="wrap">
    <strong>${escapeHtml(name)}</strong>${adresse ? ` · ${escapeHtml(adresse)}` : ""}${telefon ? ` · ${escapeHtml(telefon)}` : ""}
    <div class="footer-note">
      Unverbindlicher Gestaltungsentwurf. Speisekarte, Preise und Öffnungszeiten sind Platzhalter und werden vor der Veröffentlichung durch die echten Angaben des Hauses ersetzt.
    </div>
  </div>
</footer>

<script>window.PAGE_DATA = ${pageData};</script>
<script>${PAGE_SCRIPT}</script>
</body>
</html>
`;
}
