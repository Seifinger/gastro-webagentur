import { menuForLead, menuForCuisine, highlightCandidates, detectCuisine } from "./menuCatalog.js";
import { HERO_IMAGES, AMBIENTE_IMAGES, assetFileName } from "./imageLibrary.js";

// Standard-Öffnungszeiten für den Entwurf. Google liefert diese Felder in
// unserer Suchabfrage nicht mit, deshalb sind es bewusst Platzhalter, die auf
// der Seite auch als solche gekennzeichnet werden.
export const DEFAULT_OPENING_HOURS = [
  { tage: "Montag – Donnerstag", zeiten: "11:30 – 14:00 & 17:00 – 22:00" },
  { tage: "Freitag – Samstag", zeiten: "11:30 – 14:00 & 17:00 – 23:00" },
  { tage: "Sonntag & Feiertage", zeiten: "11:30 – 21:00" },
];

const PALETTES = {
  terracotta: { accent: "#b4451f", dark: "#8d3416", gold: "#c1872c", tint: "#2a1a12", tintRgb: "42,26,18", soft: "#faf3ec" },
  wald: { accent: "#4a6741", dark: "#35502e", gold: "#c9a227", tint: "#1b261a", tintRgb: "27,38,26", soft: "#f1f5ef" },
  wein: { accent: "#8c2f39", dark: "#6d222b", gold: "#c9a227", tint: "#251215", tintRgb: "37,18,21", soft: "#faf1f1" },
  azur: { accent: "#1f5f8b", dark: "#164764", gold: "#d8a33a", tint: "#0f2230", tintRgb: "15,34,48", soft: "#eef4f8" },
  kupfer: { accent: "#a35a24", dark: "#80441a", gold: "#d8a33a", tint: "#2b1a0e", tintRgb: "43,26,14", soft: "#fbf3ea" },
  anthrazit: { accent: "#a83232", dark: "#832626", gold: "#c99a3a", tint: "#1b1919", tintRgb: "27,25,25", soft: "#f5f2f2" },
};

// Pro Küche mehrere stimmige Paletten, damit zwei Nachbarlokale nicht gleich aussehen.
const CUISINE_PALETTES = {
  bayerisch: ["wald", "kupfer", "terracotta"],
  italienisch: ["terracotta", "wein", "wald"],
  asiatisch: ["anthrazit", "kupfer", "wein"],
  griechisch: ["azur", "terracotta", "wald"],
  tuerkisch: ["kupfer", "wein", "anthrazit"],
  cafe: ["kupfer", "wald", "terracotta"],
};

const HERO_LAYOUTS = ["vollbild-links", "vollbild-mitte", "geteilt"];

const FONT_STACKS = [
  'Georgia, "Iowan Old Style", "Times New Roman", serif',
  '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  '"Hoefler Text", Baskerville, Garamond, Georgia, serif',
];

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Leitet aus dem Lead ein festes, aber pro Restaurant unterschiedliches
 * Erscheinungsbild ab – gleicher Lead ergibt immer dasselbe Design.
 */
export function themeForLead(lead, cuisineOverride) {
  const cuisine = cuisineOverride ?? detectCuisine(lead?.name);
  const seed = hashText(String(lead?.placeId || lead?.name || "restaurant"));
  const paletteNames = CUISINE_PALETTES[cuisine] ?? CUISINE_PALETTES.bayerisch;

  const heroPool = HERO_IMAGES[cuisine] ?? HERO_IMAGES.bayerisch;
  const ambientePool = AMBIENTE_IMAGES[cuisine] ?? AMBIENTE_IMAGES.bayerisch;
  // Unbedingt >>> statt >>: der Hash nutzt den vollen 32-Bit-Bereich, ein
  // vorzeichenbehafteter Shift ergäbe negative Indizes.
  const ambienteStart = (seed >>> 9) % ambientePool.length;

  return {
    cuisine,
    seed,
    paletteName: paletteNames[seed % paletteNames.length],
    palette: PALETTES[paletteNames[seed % paletteNames.length]],
    heroLayout: HERO_LAYOUTS[(seed >>> 3) % HERO_LAYOUTS.length],
    fontStack: FONT_STACKS[(seed >>> 6) % FONT_STACKS.length],
    heroImage: heroPool[(seed >>> 12) % heroPool.length],
    // Die Collage zeigt drei Motive – welche drei, hängt am Lead.
    ambienteImages: Array.from(
      { length: 3 },
      (_, i) => ambientePool[(ambienteStart + i) % ambientePool.length],
    ),
  };
}

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

/**
 * Sammelt alle Bilder, die eine Seite braucht – die CLI lädt sie damit vorab
 * in den gemeinsamen Asset-Ordner.
 */
export function imageSpecsForLead(lead, cuisineOverride) {
  const theme = themeForLead(lead, cuisineOverride);
  const menu = cuisineOverride ? menuForCuisine(cuisineOverride) : menuForLead(lead);
  const specs = [{ id: theme.heroImage, role: "hero" }];

  for (const bild of theme.ambienteImages) specs.push({ id: bild, role: "ambiente" });
  for (const gericht of highlightCandidates(menu)) specs.push({ id: gericht.bild, role: "gericht" });

  const seen = new Set();
  return specs.filter(({ id, role }) => {
    const key = `${id}-${role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const PAGE_STYLES = `
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 17px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { font-family: var(--display); line-height: 1.14; margin: 0; font-weight: 600; }
p { margin: 0; }
a { color: inherit; }
img { display: block; max-width: 100%; }
.wrap { width: 100%; max-width: 1140px; margin: 0 auto; padding: 0 20px; }
.section { padding: 92px 0; }
.section-head { max-width: 660px; margin-bottom: 46px; }
.section-head.mitte { margin-left: auto; margin-right: auto; text-align: center; }
.eyebrow { text-transform: uppercase; letter-spacing: .18em; font-size: 12px; font-weight: 700; color: var(--accent); margin-bottom: 14px; }
.section-head h2 { font-size: clamp(30px, 4.6vw, 44px); margin-bottom: 16px; }
.section-head p { color: var(--ink-soft); font-size: 18px; }

/* Kopfzeile: liegt transparent über dem Hero und wird beim Scrollen fest */
.topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 40; transition: background .28s ease, box-shadow .28s ease; }
/* Abdunkelung, damit die helle Navigation auch über hellen Fotos lesbar bleibt */
.topbar::before { content: ""; position: absolute; inset: 0; pointer-events: none; transition: opacity .28s ease;
                  background: linear-gradient(180deg, rgba(0,0,0,.5) 0%, rgba(0,0,0,.12) 70%, transparent 100%); }
.topbar.scrolled::before { opacity: 0; }
.topbar-inner { position: relative; }
.topbar-inner { display: flex; align-items: center; gap: 18px; height: 74px; }
.brand { font-family: var(--display); font-size: 20px; font-weight: 600; margin-right: auto; color: #fff;
         white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color .28s ease; }
.topnav { display: none; gap: 26px; font-size: 15px; }
.topnav a { text-decoration: none; color: rgba(255,255,255,.88); transition: color .28s ease; }
.topnav a:hover { color: #fff; }
@media (min-width: 940px) { .topnav { display: flex; } }
.topbar.scrolled { background: rgba(255,253,250,.95); backdrop-filter: blur(12px); box-shadow: 0 1px 0 var(--line); }
.topbar.scrolled .brand { color: var(--ink); }
.topbar.scrolled .topnav a { color: var(--ink-soft); }
.topbar.scrolled .topnav a:hover { color: var(--accent); }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 26px; border-radius: 999px; border: 1px solid transparent;
  font-size: 15px; font-weight: 600; font-family: inherit; text-decoration: none;
  cursor: pointer; transition: transform .12s ease, background .16s ease, box-shadow .16s ease, color .16s ease;
}
.btn:active { transform: translateY(1px); }
.btn-primary { background: var(--accent); color: #fff; box-shadow: 0 12px 26px -14px rgba(0,0,0,.65); }
.btn-primary:hover { background: var(--accent-dark); }
.btn-ghost { background: transparent; color: var(--ink); border-color: var(--line); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.btn-light { background: #fff; color: var(--tint); }
.btn-light:hover { background: #f3ece4; }
.btn-outline-light { background: rgba(255,255,255,.08); color: #fff; border-color: rgba(255,255,255,.55); }
.btn-outline-light:hover { background: rgba(255,255,255,.18); border-color: #fff; }
.btn-block { width: 100%; }
.btn[disabled] { opacity: .5; cursor: not-allowed; }

/* Hero */
.hero { position: relative; color: #fff; background: var(--tint); overflow: hidden; }
.hero-media { position: absolute; inset: 0; }
.hero-media img { width: 100%; height: 100%; object-fit: cover; }
.hero-overlay { position: absolute; inset: 0; }
.hero-inner { position: relative; z-index: 2; width: 100%; max-width: 1140px; margin: 0 auto; padding: 170px 20px 120px; }
.hero h1 { font-size: clamp(40px, 7.2vw, 74px); letter-spacing: -.015em; }
.hero-kicker { text-transform: uppercase; letter-spacing: .22em; font-size: 12px; font-weight: 700; color: var(--gold); margin-bottom: 20px; }
.hero-sub { margin-top: 22px; font-size: clamp(17px, 2.2vw, 20px); color: rgba(255,255,255,.86); }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 36px; }
.rating { display: inline-flex; align-items: center; gap: 10px; margin-top: 32px; font-size: 15px; color: rgba(255,255,255,.86); }
.stars { color: var(--gold); letter-spacing: 2px; font-size: 17px; }

.hero-vollbild-links .hero-overlay {
  background: linear-gradient(95deg, rgba(var(--tint-rgb), .95) 0%, rgba(var(--tint-rgb), .88) 38%, rgba(var(--tint-rgb), .55) 66%, rgba(var(--tint-rgb), .22) 100%);
}
.hero-vollbild-links .hero-inner > * { max-width: 620px; }

.hero-vollbild-mitte .hero-overlay {
  background: linear-gradient(180deg, rgba(var(--tint-rgb), .62) 0%, rgba(var(--tint-rgb), .80) 100%);
}
.hero-vollbild-mitte .hero-inner { text-align: center; }
.hero-vollbild-mitte .hero-inner > * { max-width: 760px; margin-left: auto; margin-right: auto; }
.hero-vollbild-mitte .hero-actions, .hero-vollbild-mitte .rating { justify-content: center; }

.hero-geteilt { display: grid; grid-template-columns: 1fr; }
.hero-geteilt .hero-overlay { display: none; }
.hero-geteilt .hero-media { position: relative; inset: auto; min-height: 340px; }
/* Gestapelt liegt das Bild über dem Text, die Kopfzeile überdeckt es – der
   Textblock braucht dann keinen Platz für die Kopfzeile. */
.hero-geteilt .hero-inner { max-width: none; padding: 56px clamp(20px, 5vw, 66px) 72px; display: flex; flex-direction: column; justify-content: center; }
@media (min-width: 940px) {
  .hero-geteilt { grid-template-columns: 1.05fr 1fr; }
  .hero-geteilt .hero-media { min-height: 620px; order: 2; }
  .hero-geteilt .hero-inner { padding: 150px clamp(28px, 4vw, 64px) 110px; }
}

/* Highlights */
.hl-grid { display: grid; gap: 26px; grid-template-columns: 1fr; }
@media (min-width: 680px) { .hl-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1000px) { .hl-grid.spalten-3 { grid-template-columns: repeat(3, 1fr); } }
.hl-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: 18px; overflow: hidden;
  display: flex; flex-direction: column; transition: transform .18s ease, box-shadow .18s ease;
}
.hl-card:hover { transform: translateY(-4px); box-shadow: 0 24px 46px -26px rgba(40,24,12,.5); }
.hl-media { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: var(--soft); }
.hl-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.hl-card:hover .hl-media img { transform: scale(1.05); }
.hl-kat { position: absolute; left: 14px; top: 14px; background: rgba(var(--tint-rgb), .86); color: #fff;
          font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: 5px 11px; border-radius: 999px; }
.hl-body { padding: 22px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.hl-name { font-family: var(--display); font-size: 21px; font-weight: 600; }
.hl-desc { color: var(--ink-soft); font-size: 15px; flex: 1; }
.hl-foot { display: flex; align-items: center; gap: 14px; margin-top: 10px; }
.hl-preis { font-size: 19px; font-weight: 600; font-family: var(--display); margin-right: auto; }
.veg { display: inline-block; font-size: 11px; font-weight: 700; color: var(--success); border: 1px solid currentColor; border-radius: 999px; padding: 1px 8px; }
.add-btn {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 999px;
  border: 1px solid var(--accent); background: transparent; color: var(--accent);
  font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .16s ease, color .16s ease;
}
.add-btn:hover { background: var(--accent); color: #fff; }
.karte-hinweis { margin-top: 40px; text-align: center; color: var(--ink-soft); font-size: 15px; }

/* Ablauf der Abholung */
.steps { display: grid; gap: 22px; grid-template-columns: 1fr; margin-top: 56px; }
@media (min-width: 780px) { .steps { grid-template-columns: repeat(3, 1fr); } }
.step { display: flex; gap: 16px; align-items: flex-start; }
.step-n { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; background: var(--accent); color: #fff;
          display: grid; place-items: center; font-weight: 700; font-size: 16px; }
.step h3 { font-size: 18px; margin-bottom: 4px; }
.step p { color: var(--ink-soft); font-size: 15px; }

/* Ambiente */
.amb-section { background: var(--soft); }
.amb-grid { display: grid; gap: 34px; grid-template-columns: 1fr; align-items: center; }
@media (min-width: 900px) { .amb-grid { grid-template-columns: 1fr 1.1fr; gap: 56px; } }
.amb-collage { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.amb-collage img { width: 100%; height: 100%; object-fit: cover; border-radius: 16px; }
.amb-collage .gross { grid-column: 1 / -1; aspect-ratio: 16 / 9; }
.amb-collage .klein { aspect-ratio: 1 / 1; }
.amb-quote { margin-top: 28px; padding-left: 20px; border-left: 3px solid var(--accent); font-family: var(--display); font-size: 19px; line-height: 1.5; }
.amb-quote span { display: block; margin-top: 8px; font-family: inherit; font-size: 14px; color: var(--ink-soft); font-style: normal; }

/* Formulare */
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 34px; box-shadow: 0 22px 50px -32px rgba(40,24,12,.45); }
.field-grid { display: grid; gap: 18px; grid-template-columns: 1fr; }
@media (min-width: 680px) { .field-grid { grid-template-columns: 1fr 1fr; } }
.field { display: flex; flex-direction: column; gap: 7px; }
.field-wide { grid-column: 1 / -1; }
label { font-size: 14px; font-weight: 600; }
input, select, textarea {
  font-family: inherit; font-size: 16px; color: var(--ink);
  padding: 13px 15px; border: 1px solid var(--line); border-radius: 11px; background: #fff; width: 100%;
}
input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: transparent; }
textarea { resize: vertical; min-height: 92px; }
.hint { font-size: 13px; color: var(--ink-soft); font-weight: 400; }
.error { font-size: 13px; color: var(--accent); display: none; }
.field.invalid .error { display: block; }
.field.invalid input, .field.invalid select { border-color: var(--accent); }
.reserve-section { background: var(--tint); color: #fff; }
.reserve-section .section-head p { color: rgba(255,255,255,.75); }
.reserve-section .eyebrow { color: var(--gold); }
.reserve-grid { display: grid; gap: 40px; grid-template-columns: 1fr; align-items: start; }
@media (min-width: 960px) { .reserve-grid { grid-template-columns: .85fr 1.15fr; gap: 56px; } }
.reserve-pluspunkte { list-style: none; margin: 26px 0 0; padding: 0; }
.reserve-pluspunkte li { display: flex; gap: 12px; padding: 11px 0; color: rgba(255,255,255,.85); font-size: 15px; }
.reserve-pluspunkte .k { color: var(--gold); font-weight: 700; }
.panel label { color: var(--ink); }

/* Warenkorb */
.cart-fab {
  position: fixed; right: 20px; bottom: 20px; z-index: 50;
  display: none; align-items: center; gap: 12px;
  padding: 15px 24px; border: none; border-radius: 999px;
  background: var(--accent); color: #fff; font-family: inherit; font-size: 15px; font-weight: 600;
  cursor: pointer; box-shadow: 0 18px 36px -14px rgba(0,0,0,.7);
}
.cart-fab.visible { display: inline-flex; }
.cart-count { background: rgba(255,255,255,.25); border-radius: 999px; padding: 1px 9px; font-size: 13px; }
.overlay { position: fixed; inset: 0; background: rgba(20, 13, 8, .6); z-index: 60; opacity: 0; pointer-events: none; transition: opacity .22s ease; }
.overlay.open { opacity: 1; pointer-events: auto; }
.drawer {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 70;
  width: min(440px, 100%); background: var(--bg);
  display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform .28s ease;
  box-shadow: -20px 0 50px -30px rgba(0,0,0,.6);
}
.drawer.open { transform: translateX(0); }
.drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 22px; border-bottom: 1px solid var(--line); }
.drawer-head h3 { font-size: 21px; }
.icon-btn { border: none; background: transparent; font-size: 27px; line-height: 1; cursor: pointer; color: var(--ink-soft); padding: 4px 8px; }
.drawer-body { flex: 1; overflow-y: auto; padding: 22px; }
.drawer-foot { padding: 22px; border-top: 1px solid var(--line); background: var(--surface); }
.cart-line { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.cart-line-body { flex: 1; min-width: 0; }
.cart-line-name { font-size: 15px; font-weight: 600; }
.cart-line-price { font-size: 14px; color: var(--ink-soft); }
.qty { display: flex; align-items: center; gap: 4px; }
.qty button { width: 31px; height: 31px; border-radius: 9px; border: 1px solid var(--line); background: #fff; cursor: pointer; font-size: 17px; line-height: 1; color: var(--accent); }
.qty span { min-width: 26px; text-align: center; font-weight: 600; font-size: 15px; }
.cart-empty { text-align: center; color: var(--ink-soft); padding: 40px 10px; }
.totals { display: flex; justify-content: space-between; font-size: 21px; font-weight: 600; margin-bottom: 16px; font-family: var(--display); }
.drawer .field-grid { grid-template-columns: 1fr; }

/* Bestätigung */
.confirm-box {
  position: fixed; z-index: 80; left: 50%; top: 50%; transform: translate(-50%, -46%);
  width: min(490px, calc(100% - 32px)); max-height: 86vh; overflow-y: auto;
  background: var(--surface); border-radius: 20px; padding: 36px 32px;
  box-shadow: 0 30px 70px -30px rgba(0,0,0,.6); text-align: center;
  opacity: 0; pointer-events: none; transition: opacity .2s ease, transform .2s ease;
}
.confirm-box.open { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%); }
.confirm-icon { width: 64px; height: 64px; border-radius: 50%; background: #e7f4ec; color: var(--success); display: grid; place-items: center; font-size: 33px; margin: 0 auto 18px; }
.confirm-box h3 { font-size: 25px; margin-bottom: 12px; }
.confirm-summary { text-align: left; background: var(--soft); border-radius: 13px; padding: 17px 19px; margin: 22px 0; font-size: 15px; }
.confirm-summary div { display: flex; justify-content: space-between; gap: 16px; padding: 3px 0; }
.confirm-summary .label { color: var(--ink-soft); }
.demo-note { font-size: 13px; color: var(--ink-soft); margin-top: 16px; }

/* Kontakt */
.contact-grid { display: grid; gap: 34px; grid-template-columns: 1fr; }
@media (min-width: 860px) { .contact-grid { grid-template-columns: 1fr 1fr; gap: 56px; } }
.contact-list { list-style: none; margin: 0; padding: 0; }
.contact-list li { display: flex; gap: 15px; padding: 16px 0; border-bottom: 1px solid var(--line); }
.contact-list .k { font-size: 21px; }
.contact-list a { color: var(--accent); }
.hours-row { display: flex; justify-content: space-between; gap: 20px; padding: 12px 0; border-bottom: 1px solid var(--line); font-size: 15px; }
.hours-row span:first-child { color: var(--ink-soft); }
.placeholder-badge { display: inline-block; font-size: 11px; font-weight: 700; color: var(--gold); border: 1px solid currentColor; border-radius: 999px; padding: 2px 10px; margin-left: 10px; vertical-align: middle; }

footer { background: var(--tint); color: rgba(255,255,255,.72); padding: 52px 0; font-size: 14px; }
footer strong { color: #fff; font-family: var(--display); font-size: 17px; }
.footer-note { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.16); font-size: 13px; line-height: 1.6; }
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
      empty.textContent = "Noch nichts ausgew\\u00E4hlt. St\\u00F6bern Sie in unseren Highlights.";
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
      if (field) {
        var wide = field.classList.contains("field-wide") ? " field-wide" : "";
        field.className = (valid ? "field" : "field invalid") + wide;
      }
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

    var topbar = byId("topbar");
    function onScroll() {
      if (window.scrollY > 40) topbar.classList.add("scrolled");
      else topbar.classList.remove("scrolled");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

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

function renderHighlights(highlights, assets) {
  return highlights
    .map((gericht, index) => {
      const veg = gericht.vegetarisch ? '<span class="veg">vegetarisch</span>' : "";
      return `
      <article class="hl-card">
        <div class="hl-media">
          <img src="${assets}/${assetFileName(gericht.bild, "gericht")}" alt="${escapeHtml(gericht.name)}" loading="lazy">
          <span class="hl-kat">${escapeHtml(gericht.kategorie)}</span>
        </div>
        <div class="hl-body">
          <h3 class="hl-name">${escapeHtml(gericht.name)}</h3>
          <p class="hl-desc">${escapeHtml(gericht.beschreibung)}</p>
          <div class="hl-foot">
            <span class="hl-preis">${formatPrice(gericht.preis)}</span>
            ${veg}
            <button class="add-btn" type="button" data-add="hl-${index}" data-name="${escapeHtml(gericht.name)}" data-preis="${gericht.preis}">
              <span aria-hidden="true">+</span> Vorbestellen
            </button>
          </div>
        </div>
      </article>`;
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
 * Baut eine eigenständige HTML-Landingpage für einen Lead: Bild-Hero,
 * Highlights aus der Karte mit Abholbestellung und Tischreservierung.
 * Farben, Schrift, Hero-Layout und Motive ergeben sich fest aus dem Lead,
 * damit nicht alle Entwürfe gleich aussehen.
 */
export function buildLandingPage(lead, options = {}) {
  const menu = options.menu ?? menuForLead(lead);
  const theme = options.theme ?? themeForLead(lead);
  const openingHours = options.öffnungszeiten ?? DEFAULT_OPENING_HOURS;
  const kontaktEmail = options.kontaktEmail ?? "";
  const assets = options.assetsPath ?? "../assets";

  const name = lead.name || "Ihr Restaurant";
  const ort = lead.ort || "";
  const adresse = lead.adresse || "";
  const telefon = lead.telefon || "";
  const telHref = telefon.replace(/[^\d+]/g, "");
  const mapsUrl = adresse
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`
    : "";

  // Aus der vollen Karte wird bewusst nur ein Auszug gezeigt.
  const kandidaten = highlightCandidates(menu);
  const start = theme.seed % Math.max(1, kandidaten.length);
  // 6, 4 oder 3 Kacheln füllen das Raster restlos – eine einzelne Kachel in
  // der letzten Reihe sieht nach Fehler aus.
  const anzahlHighlights =
    [6, 4, 3].find((n) => n <= kandidaten.length) ?? kandidaten.length;
  const highlights = Array.from(
    { length: anzahlHighlights },
    (_, i) => kandidaten[(start + i) % kandidaten.length],
  );
  const spalten = anzahlHighlights % 3 === 0 ? "spalten-3" : "";

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

  const heroContent = `
    <div class="hero-kicker">${escapeHtml(menu.label)}${ort ? ` · ${escapeHtml(ort)}` : ""}</div>
    <h1>${escapeHtml(name)}</h1>
    <p class="hero-sub">${escapeHtml(menu.tagline)}. Reservieren Sie Ihren Tisch in unter einer Minute – oder bestellen Sie Ihr Essen bequem zur Abholung vor.</p>
    <div class="hero-actions">
      <a class="btn btn-light" href="#reservierung">Tisch reservieren</a>
      <a class="btn btn-outline-light" href="#highlights">Zur Abholung bestellen</a>
    </div>
    ${renderRatingBadge(lead)}`;

  const ratingQuote = lead.rating
    ? `<blockquote class="amb-quote">„Wir kommen immer wieder gern hierher.“
         <span>Gäste bewerten uns mit ${String(lead.rating).replace(".", ",")} von 5 Sternen auf Google.</span>
       </blockquote>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)}${ort ? ` – ${escapeHtml(ort)}` : ""}</title>
<meta name="description" content="${escapeHtml(`${name}${ort ? ` in ${ort}` : ""} – ${menu.tagline}. Jetzt Tisch reservieren oder Essen zur Abholung vorbestellen.`)}">
<style>
:root {
  --ink: #1d1613;
  --ink-soft: #625349;
  --bg: #fffdfa;
  --surface: #ffffff;
  --line: #ebe1d6;
  --success: #2f7d55;
  --accent: ${theme.palette.accent};
  --accent-dark: ${theme.palette.dark};
  --gold: ${theme.palette.gold};
  --tint: ${theme.palette.tint};
  --tint-rgb: ${theme.palette.tintRgb};
  --soft: ${theme.palette.soft};
  --display: ${theme.fontStack};
}
${PAGE_STYLES}
</style>
</head>
<body>

<header class="topbar" id="topbar">
  <div class="wrap topbar-inner">
    <div class="brand">${escapeHtml(name)}</div>
    <nav class="topnav">
      <a href="#highlights">Highlights</a>
      <a href="#ambiente">Bei uns</a>
      <a href="#reservierung">Reservierung</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a class="btn btn-primary" href="#reservierung">Tisch reservieren</a>
  </div>
</header>

<section class="hero hero-${theme.heroLayout}">
  <div class="hero-media">
    <img src="${assets}/${assetFileName(theme.heroImage, "hero")}" alt="${escapeHtml(name)}">
  </div>
  <div class="hero-overlay"></div>
  <div class="hero-inner">${heroContent}</div>
</section>

<section class="section" id="highlights">
  <div class="wrap">
    <div class="section-head mitte">
      <div class="eyebrow">Unsere Highlights</div>
      <h2>Das essen unsere Gäste am liebsten</h2>
      <p>Ein Auszug aus unserer Karte – alles frisch zubereitet. Zum Abholen einfach vorbestellen und zur Wunschzeit mitnehmen.</p>
    </div>

    <div class="hl-grid ${spalten}">${renderHighlights(highlights, assets)}</div>

    <p class="karte-hinweis">Das ist nur ein Auszug. Die vollständige Karte finden Sie bei uns im Haus.</p>

    <div class="steps">
      <div class="step">
        <div class="step-n">1</div>
        <div><h3>Aussuchen</h3><p>Gerichte antippen und in den Warenkorb legen.</p></div>
      </div>
      <div class="step">
        <div class="step-n">2</div>
        <div><h3>Abholzeit wählen</h3><p>Sie bestimmen, wann Ihr Essen fertig sein soll.</p></div>
      </div>
      <div class="step">
        <div class="step-n">3</div>
        <div><h3>Abholen &amp; zahlen</h3><p>Kein Warten, keine Vorkasse – bezahlt wird bei uns.</p></div>
      </div>
    </div>
  </div>
</section>

<section class="section amb-section" id="ambiente">
  <div class="wrap">
    <div class="amb-grid">
      <div>
        <div class="eyebrow">Bei uns</div>
        <h2 style="font-size:clamp(28px,4.2vw,40px);margin-bottom:18px">${escapeHtml(menu.label)}, wie sie sein soll</h2>
        <p style="color:var(--ink-soft);font-size:17px">${escapeHtml(menu.geschichte)}</p>
        ${ratingQuote}
      </div>
      <div class="amb-collage">
        <img class="gross" src="${assets}/${assetFileName(theme.ambienteImages[0], "ambiente")}" alt="Bei ${escapeHtml(name)}" loading="lazy">
        <img class="klein" src="${assets}/${assetFileName(theme.ambienteImages[1], "ambiente")}" alt="" loading="lazy">
        <img class="klein" src="${assets}/${assetFileName(theme.ambienteImages[2], "ambiente")}" alt="" loading="lazy">
      </div>
    </div>
  </div>
</section>

<section class="section reserve-section" id="reservierung">
  <div class="wrap">
    <div class="reserve-grid">
      <div>
        <div class="eyebrow">Reservierung</div>
        <h2 style="font-size:clamp(30px,4.6vw,44px);margin-bottom:16px">Tisch reservieren</h2>
        <p style="color:rgba(255,255,255,.78);font-size:18px">Wählen Sie Datum, Uhrzeit und Personenzahl – wir halten Ihren Tisch bereit.</p>
        <ul class="reserve-pluspunkte">
          <li><span class="k">✓</span><span>Rund um die Uhr buchbar, auch außerhalb der Öffnungszeiten</span></li>
          <li><span class="k">✓</span><span>Sofortige Bestätigung, ganz ohne Anruf</span></li>
          <li><span class="k">✓</span><span>Sonderwünsche wie Kinderstuhl oder Allergien direkt mitteilen</span></li>
        </ul>
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
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:24px">Reservierung anfragen</button>
      </form>
    </div>
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
        <h3 style="font-size:21px;margin-bottom:12px">Öffnungszeiten<span class="placeholder-badge">Platzhalter</span></h3>
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
      <div class="drawer-foot" style="margin:24px -22px -22px">
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
      Unverbindlicher Gestaltungsentwurf. Gerichte, Preise und Öffnungszeiten sind Platzhalter,
      die Fotos stammen aus einer Stockbild-Datenbank (Unsplash). Vor einer Veröffentlichung werden
      beide durch die echten Angaben und Aufnahmen des Hauses ersetzt.
    </div>
  </div>
</footer>

<script>window.PAGE_DATA = ${pageData};</script>
<script>${PAGE_SCRIPT}</script>
</body>
</html>
`;
}
