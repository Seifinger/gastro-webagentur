import {
  menuForLead,
  menuForCuisine,
  highlightCandidates,
  detectCuisine,
  gerichtId,
} from "./menuCatalog.js";
import { HERO_IMAGES, INTERIOR_IMAGES, TEAM_IMAGES, assetFileName } from "./imageLibrary.js";
import { resolveStimmung, stimmungenFuer, ARCHETYP_LABEL } from "./stimmungen.js";
import {
  heroSignatur,
  heroDishPhoto,
  heroAmbiencePhoto,
  heroReservationHero,
  SIGNATUR_CSS,
} from "./heroSignature.js";
import { MOTION_CSS, MOTION_SCRIPT } from "./motion.js";
import { resonanzSkript } from "./resonanzBeacon.js";
import { stimmenFuer, PLATZHALTER_ERKLAERUNG } from "./testimonials.js";
import { getPresetVariant, withDesignDefaults, presetFuerArchetyp } from "./designPresets.js";

// Standard-Öffnungszeiten für den Entwurf. Google liefert diese Felder in
// unserer Suchabfrage nicht mit, deshalb sind es bewusst Platzhalter, die auf
// der Seite auch als solche gekennzeichnet werden.
export const DEFAULT_OPENING_HOURS = [
  { tage: "Montag – Donnerstag", zeiten: "11:30 – 14:00 & 17:00 – 22:00" },
  { tage: "Freitag – Samstag", zeiten: "11:30 – 14:00 & 17:00 – 23:00" },
  { tage: "Sonntag & Feiertage", zeiten: "11:30 – 21:00" },
];

// Die drei Bildplätze, die der Wirt später mit eigenen Handyfotos füllt.
export const FOTO_SLOTS = [
  { titel: "Unser Haus", hinweis: "Außenansicht – damit Gäste Sie von der Straße aus erkennen" },
  { titel: "Ihr Team", hinweis: "Ein Gesicht hinter der Theke schafft mehr Vertrauen als jedes Stockfoto" },
  { titel: "Unser Bestseller", hinweis: "Das meistbestellte Gericht, ehrlich fotografiert" },
];

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Leitet aus dem Lead das Erscheinungsbild ab: Die Küche bestimmt das Theme,
 * der Lead die Akzentvariante und die Bildauswahl. Gleicher Lead ergibt
 * immer denselben Entwurf.
 */
export function themeForLead(lead, cuisineOverride, stimmungsId) {
  const cuisine = cuisineOverride ?? detectCuisine(lead?.name);
  const seed = hashText(String(lead?.placeId || lead?.name || "restaurant"));

  // Ohne ausdrückliche Wahl entscheidet der Seed, welche der drei Stimmungen
  // dieser Küche das Lokal bekommt – zwei Nachbarlokale wirken damit von
  // selbst verschieden, ohne dass jemand eingreifen muss.
  const stimmung = resolveStimmung(cuisine, { id: stimmungsId, seed });
  const rang = stimmungenFuer(cuisine).indexOf(stimmung);

  const heroPool = HERO_IMAGES[cuisine] ?? HERO_IMAGES.bayerisch;
  const interiorPool = INTERIOR_IMAGES[cuisine] ?? INTERIOR_IMAGES.bayerisch;
  // Jede Stimmung beansprucht zwei der sechs Hero-Aufnahmen; welche der beiden
  // es wird, entscheidet weiterhin der Seed.
  const heroAuswahl = stimmung.bilder.map((i) => heroPool[i]).filter(Boolean);
  const { id, archetyp, bilder, ...themeWerte } = stimmung;

  return {
    cuisine,
    seed,
    stimmung: id,
    archetyp,
    themeName: id,
    theme: { ...themeWerte, varianteName: ARCHETYP_LABEL[archetyp] },
    // Unbedingt >>> statt >>: der Hash nutzt den vollen 32-Bit-Bereich, ein
    // vorzeichenbehafteter Shift ergäbe negative Indizes.
    heroImage: heroAuswahl[(seed >>> 12) % heroAuswahl.length],
    // Ein Interieurbild je Stimmung, damit auch der Raum mitwechselt.
    hausBild: interiorPool[rang % interiorPool.length],
    teamBild: TEAM_IMAGES[(seed >>> 15) % TEAM_IMAGES.length],
  };
}

/**
 * Löst das Layout einer Seite auf, in dieser Rangfolge:
 *
 * 1. eine eigene Vorgabe (options.preset), mit Standardwerten aufgefüllt
 * 2. eine ausdrücklich benannte Küchenvariante (options.designVariant)
 * 3. der Archetyp der Stimmung – der normale Weg, siehe stimmungen.js
 *
 * Fehlt ein Feld, greift überall der Standardwert aus designPresets.js. Eine
 * Seite ohne Layout kann es damit nicht geben.
 */
function resolveDesignPreset(gestaltung, options) {
  if (options.preset) return withDesignDefaults(options.preset);
  if (options.designVariant) return getPresetVariant(gestaltung.cuisine, options.designVariant);
  return presetFuerArchetyp(gestaltung.archetyp);
}

// Ohne Übersteuerung bleibt jede Gerichtsbeschreibung die aus menuCatalog.js.
function beschreibungUnveraendert(_gerichtId, beschreibung) {
  return beschreibung;
}

/**
 * Wählt das Hero-Element passend zu preset.hero.type. "signature" (Standard)
 * und jeder unbekannte Wert fallen auf die bisherige, küchenspezifische
 * Animation zurück – ein Tippfehler im Preset darf den Hero nie leeren.
 */
function renderHeroFeature(type, ctx) {
  if (type === "dish_photo") return heroDishPhoto(ctx);
  if (type === "ambience_photo") return heroAmbiencePhoto(ctx);
  if (type === "reservation_hero") return heroReservationHero(ctx);
  return heroSignatur(ctx.cuisine, ctx);
}

/**
 * Die beiden Hero-CTAs ("Zur Abholung bestellen" / "Tisch reservieren").
 * Bei primaryAction "order" (Standard) exakt die bisherige Reihenfolge und
 * Optik; bei "reservation" tauschen Reihenfolge und Betonung (nicht Ziel
 * oder Text).
 */
function heroActionButtons(primaryAction) {
  const bestellen = (cls) => `<a class="btn ${cls}" href="#karte">Zur Abholung bestellen</a>`;
  const reservieren = (cls) => `<a class="btn ${cls}" href="#reservierung">Tisch reservieren</a>`;
  if (primaryAction === "reservation") {
    return `${reservieren("btn-light")}${bestellen("btn-outline-light")}`;
  }
  return `${bestellen("btn-light")}${reservieren("btn-outline-light")}`;
}

/**
 * Die beiden Knöpfe der mobilen Aktionsleiste. Die ID "bar-order" bleibt in
 * jedem Fall am Bestell-Knopf – daran hängt das Warenkorb-Skript.
 */
function mobilebarButtons(primaryAction) {
  const bestellen = (cls) => `<button class="btn ${cls}" id="bar-order" type="button">Bestellen</button>`;
  const reservieren = (cls) => `<a class="btn ${cls}" href="#reservierung">Reservieren</a>`;
  if (primaryAction === "reservation") {
    return `${reservieren("btn-primary")}${bestellen("btn-ghost")}`;
  }
  return `${bestellen("btn-primary")}${reservieren("btn-ghost")}`;
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

/**
 * Holt die Straße aus der Google-Adresse und schreibt die üblichen
 * Abkürzungen aus: "Stadtpl. 15, 84453 Mühldorf, Germany" -> "Stadtplatz".
 */
export function strasseAusAdresse(adresse) {
  const ersterTeil = String(adresse ?? "").split(",")[0].trim();
  if (!ersterTeil) return "";

  // "Münchener Str." ist ein eigenes Wort und wird großgeschrieben,
  // "Bahnhofstr." hängt am Namen und bleibt klein.
  return ersterTeil
    .replace(/\s+\d+\s*[a-zA-Z]?$/, "")
    .replace(/(\s)str\.$/i, "$1Straße")
    .replace(/str\.$/i, "straße")
    .replace(/(\s)pl\.$/i, "$1Platz")
    .replace(/pl\.$/i, "platz")
    .trim();
}

/**
 * Baut den Ortsbezug für die Schlagzeile. Ohne brauchbare Straße bleibt es
 * beim Ort – lieber allgemein als grammatisch falsch.
 */
export function ortsbezug(adresse, ort) {
  const strasse = strasseAusAdresse(adresse);
  const inOrt = ort ? ` in ${ort}` : "";

  if (strasse) {
    if (/platz$/i.test(strasse)) return `direkt am ${strasse}${inOrt}`;
    if (/(straße|strasse|gasse|allee)$/i.test(strasse)) return `in der ${strasse}${inOrt}`;
    if (/(weg|ring|damm|markt|berg|feld)$/i.test(strasse)) return `am ${strasse}${inOrt}`;
  }

  return ort ? `mitten in ${ort}` : "";
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
  const gestaltung = themeForLead(lead, cuisineOverride);
  const menu = cuisineOverride ? menuForCuisine(cuisineOverride) : menuForLead(lead);
  const specs = [
    { id: gestaltung.heroImage, role: "hero" },
    { id: gestaltung.hausBild, role: "ambiente" },
    { id: gestaltung.teamBild, role: "ambiente" },
  ];

  for (const gericht of highlightCandidates(menu)) specs.push({ id: gericht.bild, role: "gericht" });

  const seen = new Set();
  return specs.filter(({ id, role }) => {
    const key = `${id}-${role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Die vier Stock-Motive, die eine Seite ohne eigene Bilder zeigt: das
 * Titelbild und die drei Plätze aus renderFotoSlots(). Die Bearbeitungsansicht
 * im Dashboard zeigt damit genau das an, was gerade auf der Seite steht.
 */
export function platzhalterBilder(lead, cuisineOverride) {
  const gestaltung = themeForLead(lead, cuisineOverride);
  const menu = cuisineOverride ? menuForCuisine(cuisineOverride) : menuForLead(lead);

  // Dieselbe Auswahl wie in buildLandingPage: der Bestseller ist das erste
  // Highlight, und ohne bebildertes Gericht bleibt es beim Haus-Bild.
  const kandidaten = highlightCandidates(menu);
  const bestseller = kandidaten[gestaltung.seed % Math.max(1, kandidaten.length)];

  return {
    hero: { id: gestaltung.heroImage, role: "hero" },
    haus: { id: gestaltung.hausBild, role: "ambiente" },
    team: { id: gestaltung.teamBild, role: "ambiente" },
    bestseller: bestseller?.bild
      ? { id: bestseller.bild, role: "gericht" }
      : { id: gestaltung.hausBild, role: "ambiente" },
  };
}

const PAGE_STYLES = `
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--body);
  font-size: 17px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 {
  font-family: var(--display);
  text-transform: var(--display-transform);
  letter-spacing: var(--display-tracking);
  line-height: 1.14; margin: 0; font-weight: 700;
}
p { margin: 0; }
a { color: inherit; }
img { display: block; max-width: 100%; }
.wrap { width: 100%; max-width: 1140px; margin: 0 auto; padding: 0 20px; }
.section { padding: 84px 0; }
/* Die Kopfzeile liegt fest über der Seite – ohne diesen Abstand verdeckt sie
   die Überschrift des angesprungenen Abschnitts. */
section[id] { scroll-margin-top: 80px; }
.section-head { max-width: 680px; margin-bottom: 44px; }
.section-head.mitte { margin-left: auto; margin-right: auto; text-align: center; }
.eyebrow { text-transform: uppercase; letter-spacing: .18em; font-size: 12px; font-weight: 700; color: var(--accent); margin-bottom: 14px; }
.section-head h2 { font-size: clamp(28px, 4.4vw, 42px); margin-bottom: 16px; }
.section-head p { color: var(--ink-soft); font-size: 18px; }

/* Hinweisleiste der veröffentlichten Fassung: Die Seite trägt Namen und
   Adresse eines fremden Lokals, also muss sofort erkennbar sein, dass sie
   nicht dessen offizieller Auftritt ist. */
.entwurf-hinweis { position: fixed; top: 0; left: 0; right: 0; z-index: 65; height: 38px;
  display: flex; align-items: center; justify-content: center;
  background: #16151a; color: #fff; font-size: 13px; line-height: 1.25; padding: 0 14px;
  text-align: center; font-family: var(--body); }
/* Der Text steht in einem eigenen Element: sonst würde das <strong> im
   Flex-Container zu einem eigenen Kasten und der Satz bekäme Lücken. */
.entwurf-hinweis span { display: block; }
.entwurf-hinweis strong { font-weight: 700; }
body.veroeffentlicht .topbar { top: 38px; }
@media (max-width: 620px) {
  .entwurf-hinweis { height: 48px; font-size: 12px; }
  body.veroeffentlicht .topbar { top: 48px; }
}

/* Kopfzeile: liegt transparent über dem Hero und wird beim Scrollen fest */
.topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 40; transition: background .28s ease, box-shadow .28s ease; }
.topbar::before { content: ""; position: absolute; inset: 0; pointer-events: none; transition: opacity .28s ease;
                  background: linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.14) 70%, transparent 100%); }
.topbar.scrolled::before { opacity: 0; }
.topbar-inner { position: relative; display: flex; align-items: center; gap: 18px; height: 70px; }
.brand { font-family: var(--display); text-transform: var(--display-transform); font-size: 19px; font-weight: 700; margin-right: auto;
         color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color .28s ease; }
.topnav { display: none; gap: 26px; font-size: 15px; }
.topnav a { text-decoration: none; color: rgba(255,255,255,.9); }
.topnav a:hover { color: #fff; }
@media (min-width: 940px) { .topnav { display: flex; } }
/* header.sticky: false im Design-Preset – Kopfzeile scrollt mit statt fest zu bleiben. */
.topbar-static { position: absolute; }
.topbar.scrolled { background: var(--surface); box-shadow: 0 1px 0 var(--line); }
.topbar.scrolled .brand { color: var(--ink); }
.topbar.scrolled .topnav a { color: var(--ink-soft); }
.topbar.scrolled .topnav a:hover { color: var(--accent); }
.topbar .btn { display: none; }
@media (min-width: 700px) { .topbar .btn { display: inline-flex; } }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 26px; border-radius: 999px; border: 1px solid transparent;
  font-size: 15px; font-weight: 600; font-family: inherit; text-decoration: none;
  cursor: pointer; transition: transform .12s ease, background .16s ease, color .16s ease;
}
.btn:active { transform: translateY(1px); }
.btn-primary { background: var(--accent); color: var(--on-accent); }
.btn-primary:hover { background: var(--accent-dark); }
.btn-ghost { background: transparent; color: var(--ink); border-color: var(--line); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.btn-light { background: #fff; color: #1a1a1a; }
.btn-light:hover { background: #ece5db; }
.btn-outline-light { background: rgba(255,255,255,.1); color: #fff; border-color: rgba(255,255,255,.6); }
.btn-outline-light:hover { background: rgba(255,255,255,.2); border-color: #fff; }
.btn-block { width: 100%; }
.btn[disabled] { opacity: .5; cursor: not-allowed; }

/* Hero: auf dem Handy muss alles Wichtige ohne Scrollen sichtbar sein */
.hero { position: relative; color: #fff; background: var(--tint); overflow: hidden;
        min-height: 100vh; min-height: 100svh; display: flex; align-items: flex-end; }
@media (min-width: 900px) { .hero { min-height: 88vh; align-items: center; } }
.hero-media { position: absolute; inset: 0; }
.hero-media img { width: 100%; height: 100%; object-fit: cover; }
.hero-overlay { position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(var(--tint-rgb), .55) 0%, rgba(var(--tint-rgb), .40) 34%, rgba(var(--tint-rgb), .92) 100%); }
@media (min-width: 900px) {
  .hero-overlay { background: linear-gradient(95deg, rgba(var(--tint-rgb), .93) 0%, rgba(var(--tint-rgb), .84) 40%, rgba(var(--tint-rgb), .45) 72%, rgba(var(--tint-rgb), .2) 100%); }
}
.hero-inner { position: relative; z-index: 2; width: 100%; max-width: 1140px; margin: 0 auto; padding: 100px 20px 116px; }
@media (min-width: 900px) { .hero-inner { padding: 140px 20px 120px; } .hero-inner > * { max-width: 640px; } }
.hero-kicker { text-transform: uppercase; letter-spacing: .2em; font-size: 12px; font-weight: 700; color: var(--gold); margin-bottom: 16px; }
.hero h1 { font-size: clamp(34px, 8.4vw, 70px); }
.hero-sub { margin-top: 16px; font-size: clamp(16px, 2.2vw, 20px); color: rgba(255,255,255,.88); }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
@media (max-width: 899px) { .hero-actions { display: none; } }
.rating { display: inline-flex; align-items: center; gap: 9px; margin-top: 14px; font-size: 15px; color: rgba(255,255,255,.92); flex-wrap: wrap; }
.stars { color: var(--gold); letter-spacing: 2px; font-size: 16px; }

/* USP-Leiste */
.usp-strip { background: var(--accent); color: var(--on-accent); }
.usp-list { display: flex; flex-wrap: wrap; gap: 10px 30px; justify-content: center; padding: 18px 0; font-size: 15px; font-weight: 600; }
.usp-list span { display: inline-flex; align-items: center; gap: 9px; }

/* Highlights */
.hl-grid { display: grid; gap: 24px; grid-template-columns: 1fr; }
@media (min-width: 680px) { .hl-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1000px) { .hl-grid.spalten-3 { grid-template-columns: repeat(3, 1fr); } }
.hl-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden;
           display: flex; flex-direction: column; transition: transform .18s ease; }
.hl-card:hover { transform: translateY(-4px); }
.hl-media { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: var(--soft); }
.hl-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.hl-card:hover .hl-media img { transform: scale(1.05); }
.hl-kat { position: absolute; left: 13px; top: 13px; background: rgba(var(--tint-rgb), .88); color: #fff;
          font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: 5px 11px; border-radius: 999px; }
.hl-body { padding: 21px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.hl-name { font-size: 20px; }
.hl-desc { color: var(--ink-soft); font-size: 15px; flex: 1; }
.hl-foot { display: flex; align-items: center; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
.hl-preis { font-size: 19px; font-weight: 700; font-family: var(--display); margin-right: auto; }
.veg { display: inline-block; font-size: 11px; font-weight: 700; color: var(--accent); border: 1px solid currentColor; border-radius: 999px; padding: 1px 8px; }
.add-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 999px;
           border: 1px solid var(--accent); background: transparent; color: var(--accent);
           font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .16s ease, color .16s ease; }
.add-btn:hover { background: var(--accent); color: var(--on-accent); }

/* Ablauf der Abholung */
.steps { display: grid; gap: 22px; grid-template-columns: 1fr; margin-top: 52px; }
@media (min-width: 780px) { .steps { grid-template-columns: repeat(3, 1fr); } }
.step { display: flex; gap: 15px; align-items: flex-start; }
.step-n { flex-shrink: 0; width: 38px; height: 38px; border-radius: 50%; background: var(--accent); color: var(--on-accent);
          display: grid; place-items: center; font-weight: 700; font-size: 15px; }
.step h3 { font-size: 17px; margin-bottom: 4px; }
.step p { color: var(--ink-soft); font-size: 15px; }

/* Speisekarte als Akkordeon */
.karte-section { background: var(--soft); }
.kat { border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); margin-bottom: 14px; overflow: hidden; }
.kat > summary { list-style: none; cursor: pointer; padding: 20px 22px; display: flex; align-items: center; gap: 14px;
                 font-family: var(--display); text-transform: var(--display-transform); font-size: 20px; font-weight: 700; }
.kat > summary::-webkit-details-marker { display: none; }
.kat > summary::after { content: "+"; margin-left: auto; font-family: var(--body); font-size: 24px; line-height: 1; color: var(--accent); font-weight: 400; }
.kat[open] > summary::after { content: "–"; }
.kat > summary:hover { color: var(--accent); }
.kat-anzahl { font-family: var(--body); text-transform: none; letter-spacing: 0; font-size: 13px; font-weight: 500; color: var(--ink-soft); }
.kat-body { padding: 0 22px 8px; }
.gericht { display: flex; align-items: flex-start; gap: 16px; padding: 15px 0; border-top: 1px solid var(--line); }
.gericht-body { flex: 1; min-width: 0; }
.gericht-name { font-weight: 600; }
.gericht-desc { color: var(--ink-soft); font-size: 15px; margin-top: 2px; }
.gericht-seite { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.gericht-preis { font-weight: 600; white-space: nowrap; }
.mini-add { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--accent); background: transparent;
            color: var(--accent); font-size: 20px; line-height: 1; cursor: pointer; transition: background .16s ease, color .16s ease; }
.mini-add:hover { background: var(--accent); color: var(--on-accent); }

/* Bildplätze für die eigenen Fotos */
.foto-grid { display: grid; gap: 20px; grid-template-columns: 1fr; }
@media (min-width: 760px) { .foto-grid { grid-template-columns: repeat(3, 1fr); } }
.foto-slot { position: relative; border-radius: var(--radius); overflow: hidden; background: var(--soft); }
.foto-slot img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
.foto-text { position: absolute; left: 0; right: 0; bottom: 0; padding: 40px 18px 18px; color: #fff;
             background: linear-gradient(180deg, transparent, rgba(0,0,0,.82)); }
.foto-text strong { font-family: var(--display); text-transform: var(--display-transform); font-size: 19px; display: block; }
.foto-text span { font-size: 13px; color: rgba(255,255,255,.82); display: block; margin-top: 4px; }
.foto-badge { position: absolute; right: 12px; top: 12px; font-size: 11px; font-weight: 700; color: #fff;
              background: rgba(0,0,0,.55); border: 1px solid rgba(255,255,255,.45); border-radius: 999px; padding: 3px 10px; }

/* Gästestimmen */
.stimmen-section { background: var(--soft); }
.stimmen-note { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;
                margin-bottom: 40px; font-size: 17px; }
.stimmen-note .note { font-family: var(--display); font-size: 34px; font-weight: 700; color: var(--accent); }
.stimmen-note .sterne { color: var(--gold); letter-spacing: 2px; font-size: 19px; }
.stimmen-grid { display: grid; gap: 20px; grid-template-columns: 1fr; }
@media (min-width: 820px) { .stimmen-grid { grid-template-columns: repeat(3, 1fr); } }
/* social.layout: "list" im Design-Preset – eine gestapelte Spalte statt drei. */
.stimmen-grid--list { max-width: 640px; margin-left: auto; margin-right: auto; }
@media (min-width: 820px) { .stimmen-grid--list { grid-template-columns: 1fr; } }
.stimme { position: relative; background: var(--surface); border: 1px solid var(--line);
          border-radius: var(--radius); padding: 26px 24px 22px; display: flex; flex-direction: column; gap: 14px; }
.stimme .sterne { color: var(--gold); letter-spacing: 2px; font-size: 15px; }
.stimme p { font-size: 16px; line-height: 1.6; flex: 1; }
.stimme footer { font-size: 14px; color: var(--ink-soft); display: flex; gap: 8px; flex-wrap: wrap; background: none; padding: 0; }
.stimme footer strong { color: var(--ink); font-family: var(--body); font-size: 14px; }
.stimme.ist-platzhalter { border-style: dashed; background: transparent; min-height: 172px; justify-content: center; }
.stimme .sterne.leer { color: var(--line); }
.stimme .slot-titel { flex: none; color: var(--ink-soft); font-family: var(--display); font-size: 18px; }
.stimmen-erklaerung { margin-top: 26px; text-align: center; color: var(--ink-soft); font-size: 15px;
                      max-width: 620px; margin-left: auto; margin-right: auto; }

/* Formulare */
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 32px; }
.field-grid { display: grid; gap: 18px; grid-template-columns: 1fr; }
@media (min-width: 680px) { .field-grid { grid-template-columns: 1fr 1fr; } }
.field { display: flex; flex-direction: column; gap: 7px; }
.field-wide { grid-column: 1 / -1; }
label { font-size: 14px; font-weight: 600; color: var(--ink); }
input, select, textarea {
  font-family: inherit; font-size: 16px; color: var(--ink);
  padding: 13px 15px; border: 1px solid var(--line); border-radius: calc(var(--radius) / 2); background: var(--bg); width: 100%;
}
input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: transparent; }
textarea { resize: vertical; min-height: 90px; }
.hint { font-size: 13px; color: var(--ink-soft); font-weight: 400; }
.error { font-size: 13px; color: var(--accent); display: none; }
.field.invalid .error { display: block; }
.field.invalid input, .field.invalid select { border-color: var(--accent); }
.reserve-section { background: var(--soft); }
.reserve-grid { display: grid; gap: 36px; grid-template-columns: 1fr; align-items: start; }
@media (min-width: 960px) { .reserve-grid { grid-template-columns: .85fr 1.15fr; gap: 54px; } }
.reserve-pluspunkte { list-style: none; margin: 24px 0 0; padding: 0; }
.reserve-pluspunkte li { display: flex; gap: 12px; padding: 10px 0; color: var(--ink-soft); font-size: 15px; }
.reserve-pluspunkte .k { color: var(--accent); font-weight: 700; }

/* Warenkorb */
.cart-fab { position: fixed; right: 20px; bottom: 20px; z-index: 50; display: none; align-items: center; gap: 12px;
            padding: 15px 24px; border: none; border-radius: 999px; background: var(--accent); color: var(--on-accent);
            font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: 0 18px 36px -14px rgba(0,0,0,.7); }
.cart-fab.visible { display: inline-flex; }
@media (max-width: 899px) { .cart-fab, .cart-fab.visible { display: none; } }
.cart-count { background: rgba(255,255,255,.28); border-radius: 999px; padding: 1px 9px; font-size: 13px; }

/* Feste Aktionsleiste auf dem Handy */
.mobilebar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 55;
             display: grid; grid-template-columns: 1.25fr 1fr; gap: 10px;
             padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
             background: var(--surface); border-top: 1px solid var(--line); }
.mobilebar .btn { padding: 14px 10px; font-size: 15px; }
@media (min-width: 900px) { .mobilebar { display: none; } }
@media (max-width: 899px) { body { padding-bottom: 78px; } }

.overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .62); z-index: 60; opacity: 0; pointer-events: none; transition: opacity .22s ease; }
.overlay.open { opacity: 1; pointer-events: auto; }
.drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 70; width: min(440px, 100%); background: var(--bg);
          display: flex; flex-direction: column; transform: translateX(100%); transition: transform .28s ease; }
.drawer.open { transform: translateX(0); }
.drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 22px; border-bottom: 1px solid var(--line); }
.drawer-head h3 { font-size: 20px; }
.icon-btn { border: none; background: transparent; font-size: 27px; line-height: 1; cursor: pointer; color: var(--ink-soft); padding: 4px 8px; }
.drawer-body { flex: 1; overflow-y: auto; padding: 22px; }
.drawer-foot { padding: 22px; border-top: 1px solid var(--line); background: var(--surface); }
.cart-line { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.cart-line-body { flex: 1; min-width: 0; }
.cart-line-name { font-size: 15px; font-weight: 600; }
.cart-line-price { font-size: 14px; color: var(--ink-soft); }
.qty { display: flex; align-items: center; gap: 4px; }
.qty button { width: 31px; height: 31px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; font-size: 17px; line-height: 1; color: var(--accent); }
.qty span { min-width: 26px; text-align: center; font-weight: 600; font-size: 15px; }
.cart-empty { text-align: center; color: var(--ink-soft); padding: 40px 10px; }
.totals { display: flex; justify-content: space-between; font-size: 20px; font-weight: 700; margin-bottom: 16px; font-family: var(--display); }
.drawer .field-grid { grid-template-columns: 1fr; }

/* Bestätigung */
.confirm-box { position: fixed; z-index: 80; left: 50%; top: 50%; transform: translate(-50%, -46%);
               width: min(490px, calc(100% - 32px)); max-height: 86vh; overflow-y: auto;
               background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 34px 30px;
               text-align: center; opacity: 0; pointer-events: none; transition: opacity .2s ease, transform .2s ease; }
.confirm-box.open { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%); }
.confirm-icon { width: 62px; height: 62px; border-radius: 50%; background: var(--accent); color: var(--on-accent);
                display: grid; place-items: center; font-size: 32px; margin: 0 auto 18px; }
/* Abgelehnte Anfragen dürfen nicht wie Erfolg aussehen. */
.confirm-box.hat-fehler .confirm-icon { background: #a33131; color: #fff; }
.confirm-box.hat-fehler .confirm-summary { display: none; }
.confirm-box h3 { font-size: 24px; margin-bottom: 12px; }
.confirm-summary { text-align: left; background: var(--soft); border-radius: calc(var(--radius) / 1.5); padding: 17px 19px; margin: 22px 0; font-size: 15px; }
.confirm-summary div { display: flex; justify-content: space-between; gap: 16px; padding: 3px 0; }
.confirm-summary .label { color: var(--ink-soft); }
.demo-note { font-size: 13px; color: var(--ink-soft); margin-top: 16px; }

/* Kontakt */
.contact-grid { display: grid; gap: 32px; grid-template-columns: 1fr; }
@media (min-width: 860px) { .contact-grid { grid-template-columns: 1fr 1fr; gap: 54px; } }
.contact-list { list-style: none; margin: 0; padding: 0; }
.contact-list li { display: flex; gap: 15px; padding: 16px 0; border-bottom: 1px solid var(--line); }
.contact-list .k { font-size: 20px; }
.contact-list a { color: var(--accent); }
.hours-row { display: flex; justify-content: space-between; gap: 20px; padding: 12px 0; border-bottom: 1px solid var(--line); font-size: 15px; }
.hours-row span:first-child { color: var(--ink-soft); }
.placeholder-badge { display: inline-block; font-size: 11px; font-weight: 700; color: var(--gold); border: 1px solid currentColor; border-radius: 999px; padding: 2px 10px; margin-left: 10px; vertical-align: middle; }

footer { background: var(--tint); color: rgba(255,255,255,.72); padding: 48px 0; font-size: 14px; }
footer strong { color: #fff; font-family: var(--display); text-transform: var(--display-transform); font-size: 17px; }
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
      empty.textContent = "Noch nichts ausgew\\u00E4hlt. St\\u00F6bern Sie in unserer Karte.";
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
    byId("bar-order").textContent = current.length === 0 ? "Bestellen" : "Bestellen \\u00B7 " + euro(total());
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

  function showConfirm(title, text, rows, mailto, fehler) {
    byId("confirm-title").textContent = title;
    byId("confirm-text").textContent = text;
    byId("confirm-icon").textContent = fehler ? "!" : "\\u2713";
    byId("confirm").className = fehler ? "confirm-box hat-fehler" : "confirm-box";

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

  /**
   * Schickt die Anfrage an das Lokal. Ohne hinterlegte Adresse bleibt es beim
   * Entwurf – dann wird nichts übertragen und die Bestätigung ist nur Ansicht.
   */
  function sende(pfad, nutzlast, knopf) {
    if (!data.apiUrl) return Promise.resolve({ demo: true });

    knopf.disabled = true;
    var alterText = knopf.textContent;
    knopf.textContent = "Wird gesendet \\u2026";

    return fetch(data.apiUrl + pfad, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nutzlast)
    })
      .then(function (antwort) {
        return antwort.json().then(function (ergebnis) {
          if (!antwort.ok || ergebnis.ok === false) {
            throw new Error(ergebnis.fehler || "Die Anfrage konnte nicht angenommen werden.");
          }
          return ergebnis;
        });
      })
      .catch(function (fehler) {
        // Auch ein Netzwerkabbruch darf nicht als Erfolg durchgehen.
        throw new Error(fehler.message === "Failed to fetch"
          ? "Wir konnten das Lokal gerade nicht erreichen. Bitte rufen Sie kurz an."
          : fehler.message);
      })
      .then(function (ergebnis) {
        knopf.disabled = false;
        knopf.textContent = alterText;
        return ergebnis;
      }, function (fehler) {
        knopf.disabled = false;
        knopf.textContent = alterText;
        throw fehler;
      });
  }

  function zeigeFehler(text) {
    showConfirm("Das hat nicht geklappt", text, [], "", true);
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
    // "bar-order" fehlt, wenn das Design-Preset die mobile Aktionsleiste
    // abschaltet (mobile.stickyActionBar: false) - dann bleibt es beim
    // Warenkorb-Symbol als Bestellweg auf dem Handy.
    var barOrder = byId("bar-order");
    if (barOrder) {
      barOrder.addEventListener("click", function () {
        if (lines().length === 0) byId("karte").scrollIntoView({ behavior: "smooth" });
        else openDrawer();
      });
    }
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

      var positionen = lines().map(function (line) {
        return { name: line.name, menge: line.menge, preis: line.preis };
      });
      var summe = euro(total());
      var stueck = String(anzahl());

      sende("/oeffentlich/bestellung", {
        positionen: positionen,
        abholzeit: zeit,
        name: form.elements.name.value,
        telefon: form.elements.telefon.value,
        hinweis: form.elements.hinweis.value
      }, byId("order-submit")).then(function (ergebnis) {
        // Die Abholzeit ist zun\\u00E4chst nur ein Wunsch: ob sie machbar ist,
        // best\\u00E4tigt die K\\u00FCche.
        var echteNummer = ergebnis.demo ? nummer : ergebnis.bestellung.nummer;
        var text = ergebnis.demo
          ? "Wir bereiten Ihr Essen frisch zu. Bitte holen Sie es zur gew\\u00E4hlten Zeit bei uns ab."
          : "Ihre Bestellung liegt in der K\\u00FCche. Die Abholzeit best\\u00E4tigen wir Ihnen gleich \\u2013 falls es knapp wird, melden wir uns telefonisch.";

        showConfirm(
          ergebnis.demo ? "Bestellung aufgenommen" : "Bestellung eingegangen",
          text,
          [
            ["Bestellnummer", echteNummer],
            [ergebnis.demo ? "Abholung" : "Abholung (gew\\u00FCnscht)", zeit],
            ["Positionen", stueck],
            ["Gesamt", summe],
          ],
          mailtoLink("Abholbestellung " + echteNummer + " \\u2013 " + data.name, body)
        );

        cart = {};
        renderCart();
        form.reset();
        closeDrawer();
      }).catch(function (fehler) {
        zeigeFehler(fehler.message);
      });
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

      var uhrzeit = form.elements.uhrzeit.value;
      var personenText = form.elements.personen.value;
      // "4 Personen" -> 4, damit das Lokal eine Zahl bekommt.
      var personenZahl = parseInt(personenText, 10) || 1;

      sende("/oeffentlich/reservierung", {
        datum: form.elements.datum.value,
        uhrzeit: uhrzeit,
        personen: personenZahl,
        name: form.elements.name.value,
        telefon: form.elements.telefon.value,
        email: form.elements.email.value,
        wunsch: form.elements.wunsch.value
      }, form.querySelector("button[type=submit]")).then(function (ergebnis) {
        showConfirm(
          ergebnis.demo ? "Tisch reserviert" : "Anfrage eingegangen",
          ergebnis.demo
            ? "Vielen Dank! Ihre Reservierung liegt uns vor \\u2013 wir freuen uns auf Ihren Besuch."
            : "Vielen Dank! Wir haben Ihren Tisch vorgemerkt und best\\u00E4tigen Ihnen die Reservierung in K\\u00FCrze.",
          [
            ["Reservierungsnr.", nummer],
            ["Datum", datum],
            ["Uhrzeit", uhrzeit],
            ["Personen", personenText],
          ],
          mailtoLink("Tischreservierung " + nummer + " \\u2013 " + data.name, body)
        );

        form.reset();
        dateInput.value = iso;
      }).catch(function (fehler) {
        zeigeFehler(fehler.message);
      });
    });

    renderCart();
  });
})();
`;

function renderHighlights(highlights, bildUrl, showBadges = true, beschreibungFuer = beschreibungUnveraendert) {
  return highlights
    .map((gericht) => {
      const veg = showBadges && gericht.vegetarisch ? '<span class="veg">vegetarisch</span>' : "";
      return `
      <article class="hl-card">
        <div class="hl-media">
          <img src="${escapeHtml(bildUrl(gericht.bild, "gericht"))}" alt="${escapeHtml(gericht.name)}" loading="lazy">
          <span class="hl-kat">${escapeHtml(gericht.kategorie)}</span>
        </div>
        <div class="hl-body">
          <h3 class="hl-name">${escapeHtml(gericht.name)}</h3>
          <p class="hl-desc">${escapeHtml(beschreibungFuer(gericht.id, gericht.beschreibung))}</p>
          <div class="hl-foot">
            <span class="hl-preis">${formatPrice(gericht.preis)}</span>
            ${veg}
            <button class="add-btn" type="button" data-add="${gericht.id}" data-name="${escapeHtml(gericht.name)}" data-preis="${gericht.preis}">
              <span aria-hidden="true">+</span> Vorbestellen
            </button>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

/**
 * Die vollständige Karte als aufklappbare Liste – direkt im HTML statt als
 * PDF, damit sie auf dem Handy lesbar ist und Google sie indexieren kann.
 */
function renderMenuAccordion(menu, showBadges = true, beschreibungFuer = beschreibungUnveraendert) {
  return menu.kategorien
    .map((kategorie, katIndex) => {
      const gerichte = kategorie.gerichte
        .map((gericht, gerichtIndex) => {
          const veg = showBadges && gericht.vegetarisch ? ' <span class="veg">vegetarisch</span>' : "";
          const id = gerichtId(katIndex, gerichtIndex);
          return `
          <div class="gericht">
            <div class="gericht-body">
              <div class="gericht-name">${escapeHtml(gericht.name)}${veg}</div>
              <div class="gericht-desc">${escapeHtml(beschreibungFuer(id, gericht.beschreibung))}</div>
            </div>
            <div class="gericht-seite">
              <span class="gericht-preis">${formatPrice(gericht.preis)}</span>
              <button class="mini-add" type="button" data-add="${id}" data-name="${escapeHtml(gericht.name)}" data-preis="${gericht.preis}" aria-label="${escapeHtml(gericht.name)} vorbestellen">+</button>
            </div>
          </div>`;
        })
        .join("");

      return `
      <details class="kat"${katIndex === 0 ? " open" : ""}>
        <summary>${escapeHtml(kategorie.name)} <span class="kat-anzahl">${kategorie.gerichte.length} Gerichte</span></summary>
        <div class="kat-body">${gerichte}</div>
      </details>`;
    })
    .join("");
}

/**
 * Die drei Bildplätze: Haus, Team und Bestseller. Jeder zeigt ein Motiv, das
 * zur Beschriftung passt, damit der Wirt sofort sieht, welches eigene Foto
 * dort hingehört.
 */
function renderFotoSlots({ hausBild, teamBild, bestsellerBild }, bildUrl, eigeneBilder = {}) {
  const quellen = [
    eigeneBilder.haus ?? bildUrl(hausBild, "ambiente"),
    eigeneBilder.team ?? bildUrl(teamBild, "ambiente"),
    eigeneBilder.bestseller ??
      (bestsellerBild ? bildUrl(bestsellerBild, "gericht") : bildUrl(hausBild, "ambiente")),
  ];

  return FOTO_SLOTS.map(
    ({ titel, hinweis }, index) => `
      <figure class="foto-slot" style="margin:0">
        <img src="${escapeHtml(quellen[index])}" alt="" loading="lazy">
        <span class="foto-badge">Platzhalter</span>
        <figcaption class="foto-text">
          <strong>${escapeHtml(titel)}</strong>
          <span>${escapeHtml(hinweis)}</span>
        </figcaption>
      </figure>`,
  ).join("");
}

/**
 * Gästestimmen. Bei echten Häusern bewusst Platzhalter: Google-Rezensionen
 * dürfen nicht gespeichert werden, und fremde Bewertungen auf einer
 * unbeauftragten Seite wären ohnehin nicht in Ordnung.
 */
function renderStimmen(cuisine, lead, fiktiv, socialLayout = "grid-3") {
  const { stimmen, slots, platzhalter } = stimmenFuer(cuisine, { fiktiv });

  // Leere Plätze statt erfundener Zitate: ohne Sterne und ohne Namen ist
  // nichts behauptet, der Aufbau ist trotzdem zu sehen.
  const karten = platzhalter
    ? slots
        .map(
          (titel) => `
      <div class="stimme ist-platzhalter">
        <span class="sterne leer" aria-hidden="true">★★★★★</span>
        <p class="slot-titel">${escapeHtml(titel)}</p>
        <footer><span>wird aus Ihren Google-Bewertungen übernommen</span></footer>
      </div>`,
        )
        .join("")
    : stimmen
        .map(
          ({ text, autor, wann }) => `
      <blockquote class="stimme">
        <span class="sterne" aria-hidden="true">★★★★★</span>
        <p>${escapeHtml(text)}</p>
        <footer><strong>${escapeHtml(autor)}</strong><span>${escapeHtml(wann)}</span></footer>
      </blockquote>`,
        )
        .join("");

  const note = lead.rating
    ? `<div class="stimmen-note">
         <span class="note">${String(lead.rating).replace(".", ",")}</span>
         <span class="sterne" aria-hidden="true">${"★".repeat(Math.round(Number(lead.rating)))}</span>
         <span>von 5 auf Google${
           lead.anzahlBewertungen ? `, aus ${formatCount(lead.anzahlBewertungen)} Bewertungen` : ""
         }</span>
       </div>`
    : "";

  // "grid-3" ist das bisherige Verhalten und bekommt keine Zusatzklasse –
  // nur abweichende Layouts (bisher: "list") erhalten einen Modifier.
  const gridClass = socialLayout && socialLayout !== "grid-3" ? ` stimmen-grid--${socialLayout}` : "";

  return `
  <section class="section stimmen-section" id="stimmen">
    <div class="wrap">
      <div class="section-head mitte">
        <div class="eyebrow">Gästestimmen</div>
        <h2>Was unsere Gäste sagen</h2>
      </div>
      ${note}
      <div class="stimmen-grid${gridClass}">${karten}</div>
      ${platzhalter ? `<p class="stimmen-erklaerung">${escapeHtml(PLATZHALTER_ERKLAERUNG)}</p>` : ""}
    </div>
  </section>`;
}

function renderRating(lead) {
  if (!lead.rating) return "";
  const rounded = Math.round(Number(lead.rating));
  const stars = "★".repeat(rounded) + "☆".repeat(Math.max(0, 5 - rounded));
  const count = lead.anzahlBewertungen
    ? ` (${formatCount(lead.anzahlBewertungen)} Bewertungen)`
    : "";
  return `
    <div class="rating">
      <span class="stars" aria-hidden="true">${stars}</span>
      <span><strong>${String(lead.rating).replace(".", ",")}/5</strong> auf Google${count}</span>
    </div>`;
}

function optionList(values) {
  return values.map((value) => `<option>${escapeHtml(value)}</option>`).join("");
}

/**
 * Baut eine eigenständige HTML-Landingpage für einen Lead. Aufbau folgt dem
 * Bestellweg: Hero mit Konzept, Ort und Bewertung ohne Scrollen, feste
 * Aktionsleiste auf dem Handy, bebilderte Highlights, vollständige Karte zum
 * Aufklappen, dann Reservierung und Kontakt.
 */
export function buildLandingPage(lead, options = {}) {
  const menu = options.menu ?? menuForLead(lead);
  const gestaltung = options.gestaltung ?? themeForLead(lead);
  const t = gestaltung.theme;
  const preset = resolveDesignPreset(gestaltung, options);
  const openingHours = options.öffnungszeiten ?? DEFAULT_OPENING_HOURS;
  const kontaktEmail = options.kontaktEmail ?? "";
  const assets = options.assetsPath ?? "../assets";
  const fontCss = options.fontCss ?? "";
  // Lokal zeigen die Seiten auf heruntergeladene Dateien, veröffentlicht
  // direkt auf Unsplash – sonst läge das Bildmaterial im Repository.
  const bildUrl = options.bildUrl ?? ((id, role) => `${assets}/${assetFileName(id, role)}`);
  const veroeffentlicht = options.veroeffentlicht ?? false;
  const fiktiv = options.fiktiv ?? false;

  // Was der Kunde selbst eingepflegt hat (siehe leadEdits.js). Jedes Feld darf
  // fehlen; wo nichts gesetzt ist, bleibt es beim generischen Entwurf mitsamt
  // seinen Stockfotos aus imageLibrary.js.
  const eigeneBilder = options.editUebersteuerung?.bilder ?? {};
  const eigeneTexte = options.editUebersteuerung?.texte ?? {};
  const eigeneBeschreibungen = eigeneTexte.highlightBeschreibungen ?? {};
  const beschreibungFuer = (id, beschreibung) => eigeneBeschreibungen[id] ?? beschreibung;

  const name = lead.name || "Ihr Restaurant";
  const ort = lead.ort || "";
  const adresse = lead.adresse || "";
  const telefon = lead.telefon || "";
  const telHref = telefon.replace(/[^\d+]/g, "");
  const mapsUrl = adresse
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`
    : "";

  const lage = ortsbezug(adresse, ort);
  const schlagzeile = lage ? `${menu.tagline} – ${lage}.` : `${menu.tagline}.`;

  // Nur der Hero zeigt die eigenen Formulierungen: Titel, Kopfzeile und Fußzeile
  // tragen weiter den Namen aus Google, damit die Seite zuordenbar bleibt.
  const heroHeadline = eigeneTexte.headline ?? name;
  const heroSchlagzeile = eigeneTexte.schlagzeile ?? schlagzeile;

  // Aus der vollen Karte wird für die Highlights nur ein Auszug bebildert.
  const kandidaten = highlightCandidates(menu);
  const start = gestaltung.seed % Math.max(1, kandidaten.length);
  const anzahlHighlights =
    [6, 4, 3].find((n) => n <= kandidaten.length) ?? kandidaten.length;
  const highlights = Array.from(
    { length: anzahlHighlights },
    (_, i) => kandidaten[(start + i) % kandidaten.length],
  );
  const spalten = anzahlHighlights % 3 === 0 ? "spalten-3" : "";

  // Ohne Betriebsserver bleibt es bei der Entwurfs-Bestätigung; mit Adresse
  // gehen Reservierung und Bestellung wirklich an das Lokal.
  const apiUrl = String(options.apiUrl ?? "").replace(/\/+$/, "");
  const pageData = jsonForScript({ name, kontaktEmail, apiUrl });

  // Getrennt von apiUrl: Das ist der Betriebsserver des Wirts, dies hier die
  // Agentur, die wissen will, ob ihr Entwurf angesehen wurde. Ohne Adresse
  // entsteht kein Skript und die Seite bleibt exakt wie vorher.
  const resonanzBeacon = resonanzSkript(options.resonanzUrl, options.slug);

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

  const uspBadges = (menu.usps ?? [])
    .map((usp) => `<span><span aria-hidden="true">✓</span> ${escapeHtml(usp)}</span>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)}${ort ? ` – ${escapeHtml(menu.konzept ?? "Restaurant")} in ${escapeHtml(ort)}` : ""}</title>
<meta name="description" content="${escapeHtml(`${name}${ort ? ` in ${ort}` : ""}: ${menu.konzept ?? menu.label}. ${schlagzeile} Jetzt Tisch reservieren oder zur Abholung vorbestellen.`)}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🍽️%3C/text%3E%3C/svg%3E">
${veroeffentlicht ? '<meta name="robots" content="noindex, nofollow">\n' : ""}<style>
${fontCss}
:root {
  --bg: ${t.bg};
  --surface: ${t.surface};
  --soft: ${t.soft};
  --ink: ${t.ink};
  --ink-soft: ${t.inkSoft};
  --line: ${t.line};
  --accent: ${t.accent};
  --accent-dark: ${t.accentDark};
  --on-accent: ${t.onAccent};
  --gold: ${t.gold};
  --tint: ${t.tint};
  --tint-rgb: ${t.tintRgb};
  --display: ${t.display};
  --body: ${t.body};
  --display-transform: ${t.displayTransform};
  --display-tracking: ${t.displayTracking};
  --radius: ${t.radius};
}
${PAGE_STYLES}
${SIGNATUR_CSS}
${MOTION_CSS}
</style>
</head>
<body${veroeffentlicht ? ' class="veroeffentlicht"' : ""}>

${
  veroeffentlicht
    ? `<div class="entwurf-hinweis"><span>${
        fiktiv
          ? "Beispielseite – dieses Lokal ist <strong>frei erfunden</strong>."
          : `Unverbindlicher Gestaltungsentwurf – <strong>nicht</strong> die offizielle Website von ${escapeHtml(name)}.`
      }</span></div>`
    : ""
}
<header class="${preset.header.sticky === false ? "topbar topbar-static" : "topbar"}" id="topbar">
  <div class="wrap topbar-inner">
    <div class="brand">${escapeHtml(name)}</div>
    <nav class="topnav">
      <a href="#highlights">Highlights</a>
      <a href="#karte">Speisekarte</a>
      <a href="#reservierung">Reservierung</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a class="btn btn-primary" href="#reservierung">Tisch reservieren</a>
  </div>
</header>

<section class="hero">
  <div class="hero-media">
    <img src="${escapeHtml(eigeneBilder.hero ?? bildUrl(gestaltung.heroImage, "hero"))}" alt="${escapeHtml(name)}">
  </div>
  <div class="hero-overlay"></div>
  ${renderHeroFeature(preset.hero.type, {
    cuisine: gestaltung.cuisine,
    highlights,
    hausBild: gestaltung.hausBild,
    bildUrl,
    escape: escapeHtml,
  })}
  <div class="hero-inner">
    <div class="hero-kicker">${escapeHtml(menu.konzept ?? menu.label)}${ort ? ` · in ${escapeHtml(ort)}` : ""}</div>
    <h1>${escapeHtml(heroHeadline)}</h1>
    ${renderRating(lead)}
    <p class="hero-sub">${escapeHtml(heroSchlagzeile)}</p>
    <div class="hero-actions">${heroActionButtons(preset.hero.primaryAction)}</div>
  </div>
</section>

<section class="usp-strip">
  <div class="wrap"><div class="usp-list">${uspBadges}</div></div>
</section>

${(() => {
  // Reihenfolge der Hauptsektionen kommt aus preset.layout.sectionOrder.
  // Eine unbekannte oder unvollständige Vorgabe verliert nie eine Sektion:
  // alles, was in der Vorgabe fehlt, wird in der bisherigen Reihenfolge
  // angehängt (das bisherige, feste Verhalten als Fallback).
  const sectionsById = {
    highlights: `
<section class="section" id="highlights">
  <div class="wrap">
    <div class="section-head mitte">
      <div class="eyebrow">Unsere Highlights</div>
      <h2>Das bestellen unsere Gäste am liebsten</h2>
      <p>Alles frisch zubereitet. Zum Abholen einfach vorbestellen und zur Wunschzeit mitnehmen.</p>
    </div>

    <div class="hl-grid ${spalten}">${renderHighlights(highlights, bildUrl, preset.menu.showBadges, beschreibungFuer)}</div>

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
</section>`,

    karte: `
<section class="section karte-section" id="karte" data-menu-layout="${escapeHtml(preset.menu.layout)}">
  <div class="wrap">
    <div class="section-head mitte">
      <div class="eyebrow">Speisekarte</div>
      <h2>Unsere ganze Karte</h2>
      <p>Kategorie antippen zum Aufklappen. Jedes Gericht lässt sich direkt zur Abholung vorbestellen.</p>
    </div>
    ${renderMenuAccordion(menu, preset.menu.showBadges, beschreibungFuer)}
  </div>
</section>`,

    ambiente: `
<section class="section" id="ambiente">
  <div class="wrap">
    <div class="section-head mitte">
      <div class="eyebrow">Bei uns</div>
      <h2>${escapeHtml(menu.konzept ?? menu.label)}${ort ? ` in ${escapeHtml(ort)}` : ""}</h2>
      <p>${escapeHtml(menu.geschichte)}</p>
    </div>
    <div class="foto-grid">${renderFotoSlots(
      {
        hausBild: gestaltung.hausBild,
        teamBild: gestaltung.teamBild,
        bestsellerBild: highlights[0]?.bild,
      },
      bildUrl,
      eigeneBilder,
    )}</div>
  </div>
</section>`,

    stimmen: renderStimmen(gestaltung.cuisine, lead, fiktiv, preset.social.layout),

    reservierung: `
<section class="section reserve-section" id="reservierung" data-reservation-variant="${escapeHtml(preset.reservation.widgetVariant)}">
  <div class="wrap">
    <div class="reserve-grid">
      <div>
        <div class="eyebrow">Reservierung</div>
        <h2 style="font-size:clamp(28px,4.4vw,42px);margin-bottom:16px">Tisch reservieren</h2>
        <p style="color:var(--ink-soft);font-size:18px">Wählen Sie Datum, Uhrzeit und Personenzahl – wir halten Ihren Tisch bereit.</p>
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
</section>`,

    kontakt: `
<section class="section" id="kontakt">
  <div class="wrap">
    <div class="section-head">
      <div class="eyebrow">Kontakt</div>
      <h2>So finden Sie uns</h2>
    </div>
    <div class="contact-grid">
      <ul class="contact-list">${kontaktZeilen}</ul>
      <div>
        <h3 style="font-size:20px;margin-bottom:12px">Öffnungszeiten<span class="placeholder-badge">Platzhalter</span></h3>
        ${hoursRows}
      </div>
    </div>
  </div>
</section>`,
  };

  const konfigurierteReihenfolge = (preset.layout.sectionOrder ?? []).filter((id) => sectionsById[id]);
  const restlicheIds = Object.keys(sectionsById).filter((id) => !konfigurierteReihenfolge.includes(id));
  return [...konfigurierteReihenfolge, ...restlicheIds].map((id) => sectionsById[id]).join("\n\n");
})()}

<button class="cart-fab" id="cart-fab" type="button">
  <span>Warenkorb</span>
  <span class="cart-count" id="fab-count">0</span>
  <span id="fab-total">0,00 €</span>
</button>

${
  preset.mobile.stickyActionBar === false
    ? ""
    : `<div class="mobilebar" id="mobilebar">${mobilebarButtons(preset.hero.primaryAction)}</div>`
}

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
            <option>So schnell wie möglich (ca. 20 Min.)</option>
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
  <div class="confirm-icon" id="confirm-icon" aria-hidden="true">✓</div>
  <h3 id="confirm-title"></h3>
  <p id="confirm-text"></p>
  <div class="confirm-summary" id="confirm-summary"></div>
  <a class="btn btn-ghost" id="confirm-mail" style="display:none" href="#">Bestätigung per E-Mail senden</a>
  <button class="btn btn-primary btn-block" id="confirm-close" type="button" style="margin-top:10px">Schließen</button>
  ${
    apiUrl
      ? ""
      : '<p class="demo-note">Entwurfsansicht: In der fertigen Version geht diese Anfrage direkt an das Restaurant.</p>'
  }
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
<script>${MOTION_SCRIPT}</script>
${resonanzBeacon ? `<script>${resonanzBeacon}</script>` : ""}
</body>
</html>
`;
}
