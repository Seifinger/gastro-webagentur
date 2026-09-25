import {
  menuForLead,
  menuForCuisine,
  highlightCandidates,
  detectCuisine,
} from "./menuCatalog.js";
import { HERO_IMAGES, INTERIOR_IMAGES, TEAM_IMAGES, assetFileName } from "./imageLibrary.js";
import { resolveStimmung, stimmungenFuer, ARCHETYP_LABEL } from "./stimmungen.js";
import { SIGNATUR_CSS, signaturCssFuer } from "./heroSignature.js";
import { MOTION_CSS, MOTION_SCRIPT, MOTION_EXTRA_CSS, MOTION_EXTRA_SKRIPT } from "./motion.js";
import { EDITORIAL_CSS, TYPOGRAFIE_CSS } from "./styles/editorial.css.js";
import { handschriftCss, handschriftKlasse } from "./styles/handschrift.css.js";
import { checkCircle, warnung, hatKuechenMarke } from "./signaturIcons.js";
import { resonanzSkript } from "./resonanzBeacon.js";
import { engineMarkerMeta } from "./engineVersion.js";
import { getPresetVariant, withDesignDefaults, presetFuerArchetyp } from "./designPresets.js";
import { escapeHtml, jsonForScript } from "./htmlHelpers.js";
import { renderHeader } from "./sections/header.js";
import { renderHero, renderUspStrip } from "./sections/hero.js";
import { renderHighlights } from "./sections/highlights.js";
import { renderMenu } from "./sections/menu.js";
import { renderAmbiente, renderContact, renderKontaktZeilen, renderOeffnungszeiten, FOTO_SLOTS } from "./sections/contact.js";
import { renderStimmen } from "./sections/testimonials.js";
import { renderReservation, STATUS_LINK_HINWEIS, EMAIL_ZWECK } from "./sections/reservation.js";
import { rechtlichesHtml, rechtsLinks, RECHTLICHES_CSS, ZAHLUNGSPFLICHTIG_BESTELLEN, PROBEBESTELLUNG_ABSENDEN } from "./sections/rechtliches.js";
import { abholzeitSkript, abholzeitAttribute, STANDARD_OEFFNUNGSZEITEN } from "./abholzeiten.js";
import { renderFooter } from "./sections/footer.js";

export { escapeHtml, FOTO_SLOTS };

// Standard-Öffnungszeiten für den Entwurf. Google liefert diese Felder in
// unserer Suchabfrage nicht mit, deshalb sind es bewusst Platzhalter, die auf
// der Seite auch als solche gekennzeichnet werden.
// Mit denselben Zeilen rechnen die Abholzeiten (src/abholzeiten.js).
export const DEFAULT_OPENING_HOURS = STANDARD_OEFFNUNGSZEITEN;

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Leitet aus dem Lead das Erscheinungsbild ab: Die Küche bestimmt die Stimmung,
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
.section { padding: var(--space-xl) 0; }

/* Gezeichnete Zeichen (signaturIcons.js) statt Emoji/Unicode – auf jeder
   Seite, nicht nur mit Handschrift. Wo ein Archetyp seine eigene Handschrift
   mitbringt, überschreibt deren spezifischere Regel (styles/handschrift.css.js)
   diese Basiswerte für dieselben Klassen – siehe DESIGN.md Abschnitt 4. */
.ikon { width: 1.35em; height: 1.35em; flex: none; vertical-align: -.26em; }
.ikon-haken { width: 1.05em; height: 1.05em; opacity: .9; }
.ikon-stern { width: 1em; height: 1em; vertical-align: -.15em; margin-right: 2px; }
.ikon-plus { width: .85em; height: .85em; vertical-align: -.08em; }
.ikon-chevron { width: 1.1em; height: 1.1em; }
.marke { width: 1.9em; height: 1.9em; flex: none; vertical-align: -.48em; }
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
                  background: linear-gradient(180deg, rgba(var(--tint-rgb), .55) 0%, rgba(var(--tint-rgb), .14) 70%, transparent 100%); }
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
  padding: 14px 26px; border-radius: var(--radius-pill); border: 1px solid transparent;
  font-size: 15px; font-weight: 600; font-family: inherit; text-decoration: none;
  cursor: pointer; transition: transform var(--transition-fast), background var(--transition-base), color var(--transition-base);
}
.btn:active { transform: translateY(1px); }
.btn-primary { background: var(--accent); color: var(--on-accent); }
.btn-primary:hover { background: var(--accent-dark); }
.btn-ghost { background: transparent; color: var(--ink); border-color: var(--line); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.btn-light { background: #fff; color: #1a1a1a; }
.btn-light:hover { background: #ece5db; }
/* Zweistufiger Hero-CTA: die zweite Aktion liegt als Glas auf dem Foto statt
   als deckende Fläche – dezenter als der gefüllte Hauptknopf daneben. */
.btn-outline-light { background: rgba(255,255,255,.12); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); color: #fff; border-color: rgba(255,255,255,.6); }
.btn-outline-light:hover { background: rgba(255,255,255,.22); border-color: #fff; }
.btn-block { width: 100%; }
.btn[disabled] { opacity: .5; cursor: not-allowed; }

/* Hero: auf dem Handy muss alles Wichtige ohne Scrollen sichtbar sein */
.hero { position: relative; color: #fff; background: var(--tint); overflow: hidden;
        min-height: 96vh; min-height: 96svh; display: flex; align-items: flex-end; }
@media (min-width: 900px) { .hero { min-height: 88vh; align-items: center; } }
.hero-media { position: absolute; inset: 0; }
.hero-media img { width: 100%; height: 100%; object-fit: cover; }
.hero-overlay { position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(var(--tint-rgb), .55) 0%, rgba(var(--tint-rgb), .40) 34%, rgba(var(--tint-rgb), .92) 100%); }
@media (min-width: 900px) {
  .hero-overlay { background: linear-gradient(95deg, rgba(var(--tint-rgb), .93) 0%, rgba(var(--tint-rgb), .84) 40%, rgba(var(--tint-rgb), .45) 72%, rgba(var(--tint-rgb), .2) 100%); }
}
/* Zweite, eigenständige Ebene nur für den unteren Rand: sorgt unabhängig vom
   Atmosphären-Gradienten darüber dafür, dass Kicker/Titel auf jedem Foto
   lesbar bleiben, ohne dass der Grundton in der Bildmitte dunkler werden muss. */
.hero-vignette { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, transparent 55%, rgba(var(--tint-rgb), .5) 100%); }
.hero-inner { position: relative; z-index: 2; width: 100%; max-width: 1140px; margin: 0 auto; padding: 100px 20px 116px; }
@media (min-width: 900px) { .hero-inner { padding: 140px 20px 120px; } .hero-inner > * { max-width: 640px; } }
/* Der linke Strich gibt dem Kicker die Anmutung eines Zitats – derselbe Ton
   wie das Gold der Sterne, nur schmal und nicht als Fläche. */
.hero-kicker { text-transform: uppercase; letter-spacing: .2em; font-size: 12px; font-weight: 700; color: var(--gold);
               margin-bottom: 16px; border-left: 3px solid var(--gold); padding-left: 12px; }
.hero h1 { font-size: clamp(34px, 8.4vw, 70px); }
.hero-sub { margin-top: 16px; font-size: clamp(16px, 2.2vw, 20px); color: rgba(255,255,255,.88); }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
@media (max-width: 899px) { .hero-actions { display: none; } }
.rating { display: inline-flex; align-items: center; gap: 9px; margin-top: 14px; font-size: 15px; color: rgba(255,255,255,.92); flex-wrap: wrap; }
.stars { color: var(--gold); letter-spacing: 2px; font-size: 16px; }

/* USP-Leiste */
.usp-strip { background: var(--accent); color: var(--on-accent); }
.usp-list { display: flex; flex-wrap: wrap; gap: 10px var(--space-md); justify-content: center; padding: 18px 0; font-size: 15px; font-weight: 600; }
.usp-list span { display: inline-flex; align-items: center; gap: 9px; }
/* Schmale Trennlinie zwischen den Punkten statt reinem Abstand – macht aus
   der Reihe eine Leiste mit klaren Feldern, nicht nur aneinandergereihten Sätzen. */
.usp-list span:not(:first-child) { border-left: 1px solid rgba(255,255,255,.35); padding-left: var(--space-md); }

/* Highlights */
.hl-grid { display: grid; gap: 24px; grid-template-columns: 1fr; }
@media (min-width: 680px) { .hl-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1000px) { .hl-grid.spalten-3 { grid-template-columns: repeat(3, 1fr); } }
/* Schatten statt Kontur: die Karte hebt sich vom Grund ab, ohne dass eine
   Linie sie einrahmt – beim Hover verstärkt sich derselbe Schatten, statt
   dass eine zweite, andersartige Wirkung dazukäme. */
.hl-card { background: var(--surface); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-card);
           display: flex; flex-direction: column; transition: transform var(--transition-slow), box-shadow var(--transition-slow); }
.hl-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-strong); }
.hl-media { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: var(--soft); }
.hl-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.hl-card:hover .hl-media img { transform: scale(1.05); }
/* Weichgezeichneter Grund statt voller Fläche: das Abzeichen bleibt lesbar,
   ohne das Foto darunter mit einem harten Farbblock zu verdecken. */
.hl-kat { position: absolute; left: 13px; top: 13px; background: rgba(var(--tint-rgb), .55); backdrop-filter: blur(6px) saturate(160%); -webkit-backdrop-filter: blur(6px) saturate(160%); color: #fff;
          font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: 5px 11px; border-radius: var(--radius-pill); }
.hl-body { padding: 21px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.hl-name { font-size: 20px; }
.hl-desc { color: var(--ink-soft); font-size: 15px; flex: 1; }
.hl-foot { display: flex; align-items: center; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
.hl-preis { font-size: var(--text-xl); font-weight: 700; font-family: var(--display); margin-right: auto; }
.veg { display: inline-block; font-size: 11px; font-weight: 700; color: var(--accent); border: 1px solid currentColor; border-radius: var(--radius-pill); padding: 1px 8px; }
.add-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: var(--radius-pill);
           border: 1px solid var(--accent); background: transparent; color: var(--accent);
           font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: background var(--transition-base), color var(--transition-base); }
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
/* Der linke Streifen macht aus jeder Kategorie eine eigene Karte mit
   Anfang – dieselbe Geste wie bei den Gästestimmen weiter unten. */
.kat { border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: var(--radius); background: var(--surface); margin-bottom: 14px; overflow: hidden; }
.kat > summary { list-style: none; cursor: pointer; padding: 20px 22px; display: flex; align-items: center; gap: 14px;
                 font-family: var(--display); text-transform: var(--display-transform); font-size: 20px; font-weight: 700; }
.kat > summary::-webkit-details-marker { display: none; }
.kat > summary:hover { color: var(--accent); }
.kat-anzahl { font-family: var(--body); text-transform: none; letter-spacing: 0; font-size: 13px; font-weight: 500; color: var(--ink-soft); }
/* Gezeichneter Pfeil statt "+"/"–": dreht sich beim Öffnen, statt das Zeichen
   auszutauschen – eine Bewegung statt eines Sprungs. */
.kat-chevron { margin-left: auto; display: inline-flex; color: var(--accent); transition: transform var(--transition-base); }
.kat[open] .kat-chevron { transform: rotate(180deg); }
.kat-body { padding: 0 22px 8px; }
.gericht { display: flex; align-items: flex-start; gap: 16px; padding: 15px 0; border-top: 1px solid var(--line); }
.gericht-body { flex: 1; min-width: 0; }
.gericht-name { font-weight: 600; }
.gericht-desc { color: var(--ink-soft); font-size: 15px; margin-top: 2px; }
.gericht-seite { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.gericht-preis { font-family: var(--display); font-weight: 600; white-space: nowrap; }
.mini-add { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--accent); background: transparent;
            display: inline-flex; align-items: center; justify-content: center;
            color: var(--accent); cursor: pointer; transition: background var(--transition-base), color var(--transition-base); }
.mini-add .ikon-plus { width: 16px; height: 16px; vertical-align: 0; }
.mini-add:hover { background: var(--accent); color: var(--on-accent); }

/* Bildplätze für die eigenen Fotos */
.foto-grid { display: grid; gap: 20px; grid-template-columns: 1fr; }
@media (min-width: 760px) { .foto-grid { grid-template-columns: repeat(3, 1fr); } }
.foto-slot { position: relative; border-radius: var(--radius); overflow: hidden; background: var(--soft); }
.foto-slot img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
.foto-text { position: absolute; left: 0; right: 0; bottom: 0; padding: 40px 18px 18px; color: #fff;
             background: linear-gradient(180deg, transparent, rgba(var(--tint-rgb), .82)); }
.foto-text strong { font-family: var(--display); text-transform: var(--display-transform); font-size: 19px; display: block; }
.foto-text span { font-size: 13px; color: rgba(255,255,255,.82); display: block; margin-top: 4px; }
.foto-badge { position: absolute; right: 12px; top: 12px; font-size: 11px; font-weight: 700; color: #fff;
              background: rgba(0,0,0,.55); border: 1px solid rgba(255,255,255,.45); border-radius: var(--radius-pill); padding: 3px 10px; }

/* Gästestimmen */
.stimmen-section { background: var(--soft); }
.stimmen-note { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;
                margin-bottom: 40px; font-size: 17px; }
.stimmen-note .note { font-family: var(--display); font-size: 34px; font-weight: 700; color: var(--accent); }
.stimmen-note .sterne { color: var(--gold); font-size: 19px; }
.stimmen-grid { display: grid; gap: 20px; grid-template-columns: 1fr; }
@media (min-width: 820px) { .stimmen-grid { grid-template-columns: repeat(3, 1fr); } }
/* social.layout: "list" im Design-Preset – eine gestapelte Spalte statt drei. */
.stimmen-grid--list { max-width: 640px; margin-left: auto; margin-right: auto; }
@media (min-width: 820px) { .stimmen-grid--list { grid-template-columns: 1fr; } }
/* Vier Punkt Akzentlinie statt Umrandung + eigener Schatten: dieselbe Geste
   wie bei den Speisekarten-Kategorien, hier als Zitat-Anfang gelesen. */
.stimme { position: relative; background: var(--surface); border-left: 4px solid var(--accent);
          border-radius: var(--radius); padding: 26px 24px 22px; display: flex; flex-direction: column; gap: 14px;
          box-shadow: var(--shadow-soft); }
.stimme .sterne { color: var(--gold); font-size: 15px; }
.stimme p { font-size: 16px; line-height: 1.6; flex: 1; }
.stimme footer { font-size: 14px; color: var(--ink-soft); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: none; padding: 0; }
.stimme footer strong { color: var(--ink); font-family: var(--body); font-size: 14px; }
/* Initialen statt Foto: ein echtes Bild vom Gast gibt es nie, ein erfundenes
   wäre irreführend – der Kreis trägt nur, was aus dem Namen folgt. */
.stimme-avatar { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex: none;
                 border-radius: 50%; background: var(--accent); color: var(--on-accent); font-size: 12px; font-weight: 700; }
.stimme.ist-platzhalter { border: 1px dashed var(--line); border-left: 1px dashed var(--line); box-shadow: none; background: transparent; min-height: 172px; justify-content: center; }
.stimme .sterne.leer { color: var(--line); }
.stimme .slot-titel { flex: none; color: var(--ink-soft); font-family: var(--display); font-size: 18px; }
.stimmen-erklaerung { margin-top: 26px; text-align: center; color: var(--ink-soft); font-size: 15px;
                      max-width: 620px; margin-left: auto; margin-right: auto; }

/* Formulare – an den Fokus-/Rahmenregeln bekannter Buchungsstrecken
   orientiert: dünnerer Rahmen, deutlicher Fokusring statt Browser-Outline,
   jeder Zustandswechsel läuft über --transition-fast statt hart zu springen. */
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 32px; }
.field-grid { display: grid; gap: 18px; grid-template-columns: 1fr; }
@media (min-width: 680px) { .field-grid { grid-template-columns: 1fr 1fr; } }
.field { display: flex; flex-direction: column; gap: 7px; }
.field-wide { grid-column: 1 / -1; }
label { font-size: var(--text-sm); font-weight: 600; letter-spacing: .02em; color: var(--ink); }
input, select, textarea {
  font-family: inherit; font-size: 16px; color: var(--ink);
  padding: 13px 15px; border: 1.5px solid var(--line); border-radius: var(--radius-md); background: var(--bg); width: 100%;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
input:focus, select:focus, textarea:focus {
  outline: none; border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}
textarea { resize: vertical; min-height: 90px; }
.hint { font-size: 13px; color: var(--ink-soft); font-weight: 400; }
/* Das Warnzeichen vor dem Fehlertext steht als Maske (currentColor) statt als
   eigenes Bild – so trägt es automatisch die Akzentfarbe der jeweiligen
   Küche und muss nicht gesondert gegen jeden der 48 Grundtöne geprüft werden. */
.error { font-size: 13px; color: var(--accent); display: none; align-items: center; gap: 6px; }
.error::before {
  content: ""; width: 13px; height: 13px; flex: none; background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='9.3'/%3E%3Cpath d='M12 7.6v5.6'/%3E%3Ccircle cx='12' cy='16.6' r='.6' fill='black' stroke='none'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='9.3'/%3E%3Cpath d='M12 7.6v5.6'/%3E%3Ccircle cx='12' cy='16.6' r='.6' fill='black' stroke='none'/%3E%3C/svg%3E") center / contain no-repeat;
}
.field.invalid .error { display: flex; }
.field.invalid input, .field.invalid select { border-color: var(--accent); }
.reserve-section { background: var(--soft); }
.reserve-grid { display: grid; gap: 36px; grid-template-columns: 1fr; align-items: start; }
@media (min-width: 960px) { .reserve-grid { grid-template-columns: .85fr 1.15fr; gap: 54px; } }
.reserve-pluspunkte { list-style: none; margin: 24px 0 0; padding: 0; }
.reserve-pluspunkte li { display: flex; gap: 12px; padding: 10px 0; color: var(--ink-soft); font-size: 15px; }
.reserve-pluspunkte .k { color: var(--accent); font-weight: 700; }

/* Warenkorb */
.cart-fab { position: fixed; right: 20px; bottom: 20px; z-index: 50; display: none; align-items: center; gap: 12px;
            padding: 15px 24px; border: none; border-radius: var(--radius-pill); background: var(--accent); color: var(--on-accent);
            font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: 0 18px 36px -14px rgba(0,0,0,.7); }
.cart-fab.visible { display: inline-flex; }
@media (max-width: 899px) { .cart-fab, .cart-fab.visible { display: none; } }
.cart-count { background: rgba(255,255,255,.28); border-radius: var(--radius-pill); padding: 1px 9px; font-size: 13px; }

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
/* Der Kreis kommt erst mit der Bestätigung selbst herein statt schon vorher
   zu stehen – ein kleiner, eigener Auftritt statt eines reinen Ausblendens. */
.confirm-icon { width: 62px; height: 62px; border-radius: 50%; background: var(--accent); color: var(--on-accent);
                display: grid; place-items: center; margin: 0 auto 18px;
                transform: scale(.9); opacity: 0; transition: transform var(--transition-slow), opacity var(--transition-slow); }
.confirm-box.open .confirm-icon { transform: scale(1); opacity: 1; }
.confirm-icon .ci-ok, .confirm-icon .ci-fehler { display: none; grid-area: 1 / 1; }
.confirm-icon .ci-ok svg, .confirm-icon .ci-fehler svg { width: 30px; height: 30px; }
.confirm-icon .ci-ok { display: grid; }
/* Abgelehnte Anfragen dürfen nicht wie Erfolg aussehen. */
.confirm-box.hat-fehler .confirm-icon { background: #a33131; color: #fff; }
.confirm-box.hat-fehler .confirm-icon .ci-ok { display: none; }
.confirm-box.hat-fehler .confirm-icon .ci-fehler { display: grid; }
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
.placeholder-badge { display: inline-block; font-size: 11px; font-weight: 700; color: var(--gold-dunkel); border: 1px solid currentColor; border-radius: var(--radius-pill); padding: 2px 10px; margin-left: 10px; vertical-align: middle; }
/* Derselbe Hinweis auf der Akzentfläche der USP-Leiste. Dort trägt er
   --on-accent: Das ist der Ton, der gegen --accent geprüft ist. */
.usp-platzhalter { display: inline-block; font-size: 11px; font-weight: 700; color: var(--on-accent); border: 1px solid currentColor; border-radius: var(--radius-pill); padding: 2px 10px; }

/* Drei Spalten (Haus / Navigation / Kontakt) statt einer Zeile Fließtext –
   auf dem Handy fällt das Raster auf eine Spalte zusammen. */
footer { background: var(--tint); color: rgba(255,255,255,.72); padding: var(--space-xl) 0 var(--space-lg); font-size: 14px; }
.footer-grid { display: grid; gap: 28px; grid-template-columns: 1fr; }
@media (min-width: 760px) { .footer-grid { grid-template-columns: 1.3fr 1fr 1fr; gap: 32px; } }
footer strong { color: #fff; font-family: var(--display); text-transform: var(--display-transform); font-size: 17px; }
.footer-col p { margin-top: 8px; }
.footer-nav, .footer-kontakt { display: flex; flex-direction: column; gap: 8px; }
.footer-nav a, .footer-kontakt a { color: rgba(255,255,255,.72); text-decoration: none; transition: color var(--transition-fast); }
.footer-nav a:hover, .footer-kontakt a:hover { color: #fff; }
.footer-note { grid-column: 1 / -1; margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid rgba(255,255,255,.16); font-size: 13px; line-height: 1.6; }
`;

const PAGE_SCRIPT = `
(function () {
  var data = window.PAGE_DATA;
  var cart = {};
  // Warenkorb \u00FCber mehrere Seiten (Startseite \u2194 Speisekarte): nur, wenn
  // die Seite ihre Karte mitliefert (PAGE_DATA.warenkorb). Name und Preis
  // kommen dann immer aus dieser Karte, nie aus einem alten Speicherstand.
  var speicher = data.warenkorb && data.warenkorb.karte ? data.warenkorb : null;
  var warenkorbHinweis = "";

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

    if (warenkorbHinweis && current.length > 0) {
      var notiz = document.createElement("p");
      notiz.className = "cart-hinweis";
      notiz.setAttribute("role", "status");
      notiz.textContent = warenkorbHinweis;
      list.appendChild(notiz);
    }

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
    var barOrder = byId("bar-order");
    if (barOrder) barOrder.textContent = current.length === 0 ? (barOrder.getAttribute("data-leer") || "Bestellen") : "Bestellen \\u00B7 " + euro(total());
    if (current.length === 0) warenkorbHinweis = "";
    speichere();
  }

  function speicherSchluessel() { return "warenkorb:" + speicher.schluessel; }

  function speichere() {
    if (!speicher) return;
    try {
      window.sessionStorage.setItem(speicherSchluessel(), JSON.stringify(lines().map(function (line) {
        return { id: line.id, name: line.name, preis: line.preis, menge: line.menge };
      })));
    } catch (e) { /* ohne Speicher bleibt der Warenkorb auf dieser Seite */ }
  }

  /**
   * Holt einen auf der anderen Seite begonnenen Warenkorb zur\\u00FCck. Was nicht
   * mehr auf der Karte steht (oder ausverkauft ist), f\\u00E4llt heraus; ein
   * ge\\u00E4nderter Preis wird \\u00FCbernommen und im Warenkorb genannt.
   */
  function stelleWarenkorbWiederHer() {
    if (!speicher) return;
    var gespeichert = [];
    try { gespeichert = JSON.parse(window.sessionStorage.getItem(speicherSchluessel()) || "[]"); } catch (e) { gespeichert = []; }
    if (!Array.isArray(gespeichert)) return;
    var hinweise = [];
    gespeichert.forEach(function (eintrag) {
      if (!eintrag || typeof eintrag.id !== "string") return;
      var menge = Math.min(99, Math.floor(Number(eintrag.menge)));
      if (!(menge > 0)) return;
      var aktuell = speicher.karte[eintrag.id];
      if (!aktuell) {
        hinweise.push(String(eintrag.name || "Ein Gericht") + " ist nicht mehr bestellbar und wurde entfernt.");
        return;
      }
      cart[eintrag.id] = { id: eintrag.id, name: aktuell[0], preis: aktuell[1], menge: menge };
      if (Number(eintrag.preis) !== aktuell[1]) hinweise.push("Neuer Preis f\\u00FCr " + aktuell[0] + ": " + euro(aktuell[1]) + ".");
    });
    warenkorbHinweis = hinweise.join(" ");
  }

  /** Auf der Speisekarte: kurz best\\u00E4tigen statt den Warenkorb \\u00FCber die Karte zu legen. */
  function meldeHinzugefuegt(name) {
    var status = byId("cart-status");
    if (status) status.textContent = name + " liegt im Warenkorb (" + anzahl() + " insgesamt).";
    var fab = byId("cart-fab");
    fab.classList.remove("gerade");
    void fab.offsetWidth;
    fab.classList.add("gerade");
  }

  function changeQty(id, delta) {
    var line = cart[id];
    if (!line) return;
    line.menge += delta;
    if (line.menge <= 0) delete cart[id];
    renderCart();
  }

  function addToCart(id, name, preis) {
    if (speicher) {
      // Nur, was die Karte als bestellbar f\\u00FChrt \\u2013 zum Preis der Karte.
      if (!speicher.karte[id]) return;
      name = speicher.karte[id][0];
      preis = speicher.karte[id][1];
    }
    if (!cart[id]) cart[id] = { id: id, name: name, preis: preis, menge: 0 };
    cart[id].menge += 1;
    renderCart();
    if (data.seite === "karte") meldeHinzugefuegt(name);
    else openDrawer();
  }

  function openDrawer() {
    byId("drawer").classList.add("open");
    byId("overlay").classList.add("open");
    ladeAbholKonfig();
    aktualisiereAbholzeiten();
  }
  function closeDrawer() {
    byId("drawer").classList.remove("open");
    if (!byId("confirm").classList.contains("open")) byId("overlay").classList.remove("open");
  }

  /**
   * Der pers\u00F6nliche Status-Link: nur, wenn der Betriebsserver einen
   * Zugriffsschl\u00FCssel zur\u00FCckgegeben hat (nie in der Vorschau). Der
   * Schl\u00FCssel steht im Fragment (#) und geht so an keinen Server-Log.
   */
  function statusUrl(teil) {
    return data.apiUrl && teil && teil.statusToken ? data.apiUrl + "/status#" + teil.statusToken : "";
  }

  function zeigeStatusLink(url) {
    var link = byId("confirm-status");
    if (!link && url) {
      link = document.createElement("a");
      link.id = "confirm-status";
      link.className = "btn btn-ghost btn-block";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Status sp\u00E4ter erneut ansehen";
      link.style.marginTop = "10px";
      byId("confirm-mail").parentNode.insertBefore(link, byId("confirm-mail"));
    }
    if (!link) return;
    link.href = url || "#";
    link.style.display = url ? "inline-flex" : "none";
  }

  /** Was nach dem Absenden \u00FCber E-Mail und Status-Link gesagt wird \u2013 ehrlich. */
  function kanalSatz(email, teil) {
    if (email && teil.emailVersand === "aktiv") {
      return " Best\u00E4tigung und \u00C4nderungen schicken wir an " + email + ".";
    }
    if (email && teil.emailVersand === "fehlgeschlagen") {
      return " Die E-Mail an " + email + " konnte gerade nicht verschickt werden \u2013 den aktuellen Stand sehen Sie \u00FCber Ihren Status-Link.";
    }
    if (email) {
      return " Der E-Mail-Versand ist bei diesem Restaurant noch nicht eingerichtet \u2013 den aktuellen Stand sehen Sie \u00FCber Ihren Status-Link.";
    }
    return " Ohne E-Mail-Adresse sehen Sie \u00C4nderungen nur, wenn Sie Ihren Status-Link erneut \u00F6ffnen. Bei R\u00FCckfragen rufen wir Sie an.";
  }

  function showConfirm(title, text, rows, mailto, fehler, status) {
    zeigeStatusLink(fehler ? "" : status);
    byId("confirm-title").textContent = title;
    byId("confirm-text").textContent = text;
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

  /** Im Vorschau-Modus: der echte Weg zum Lokal, falls eine Nummer bekannt ist. */
  function telefonSatz(zweck) {
    return data.telefon ? " " + zweck + " bitte anrufen: " + data.telefon + "." : "";
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

  /**
   * Rechtstexte des Restaurants (nur mit Betriebsserver). Der Server nennt
   * die aktuell g\\u00FCltigen, freigegebenen Fassungen: Bedingungen und
   * No-Show-Regel bekommen je ein eigenes, nicht vorangekreuztes Feld mit
   * Link zum Volltext. Ohne freigegebene Fassung bleibt das Feld weg \\u2013
   * und der Server verlangt dann auch nichts. Mitgeschickt wird nur die
   * Version, die der Gast gesehen hat; passt sie nicht mehr, lehnt der
   * Server ab und die Felder werden neu geladen.
   */
  function zeigeBestaetigung(feldId, textId, dok, linkText) {
    var feld = byId(feldId);
    if (!feld) return;
    var box = feld.querySelector("input[type=checkbox]");
    if (!dok) {
      feld.hidden = true;
      feld.style.display = "none";
      feld.removeAttribute("data-version");
      if (box) box.checked = false;
      return;
    }
    var text = byId(textId);
    text.textContent = dok.zustimmungstext + " ";
    var link = document.createElement("a");
    link.href = data.apiUrl + dok.pfad;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "(" + linkText + ", Fassung " + dok.version + ")";
    text.appendChild(link);
    // Eine neue Fassung muss neu best\\u00E4tigt werden.
    if (box && feld.getAttribute("data-version") !== dok.version) box.checked = false;
    feld.setAttribute("data-version", dok.version);
    feld.hidden = false;
    feld.style.display = "block";
  }

  function ladeRechtslage() {
    if (!data.apiUrl) return;
    fetch(data.apiUrl + "/oeffentlich/rechtstexte", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    })
      .then(function (antwort) { return antwort.json(); })
      .then(function (lage) {
        if (!lage || !lage.ok) return;
        zeigeBestaetigung("ord-bedingungen-feld", "ord-bedingungen-text", lage.bestellung.bedingungen, "Bestellbedingungen lesen");
        zeigeBestaetigung("ord-noshow-feld", "ord-noshow-text", lage.bestellung.noShow, "No-Show-Regel lesen");
        zeigeBestaetigung("res-bedingungen-feld", "res-bedingungen-text", lage.reservierung.bedingungen, "Reservierungsbedingungen lesen");
        zeigeBestaetigung("res-noshow-feld", "res-noshow-text", lage.reservierung.noShow, "No-Show-Regel lesen");
      })
      .catch(function () {
        // Ohne Antwort bleiben die Felder aus. Verlangt der Server eine
        // Best\\u00E4tigung, lehnt er ab \\u2013 dann wird hier neu geladen.
      });
  }

  /** Gibt die best\\u00E4tigte Version zur\\u00FCck ("" = nicht n\\u00F6tig) oder null, wenn ein Pflichtfeld fehlt. */
  function bestaetigteVersion(feldId) {
    var feld = byId(feldId);
    if (!feld || !feld.getAttribute("data-version")) return "";
    var box = feld.querySelector("input[type=checkbox]");
    var ok = Boolean(box && box.checked);
    feld.classList.toggle("invalid", !ok);
    return ok ? feld.getAttribute("data-version") : null;
  }

  /*
   * Abholzeiten. Gerechnet wird nur in window.Abholzeiten (src/abholzeiten.js,
   * dieselbe Rechnung pr\\u00FCft der Server). Hier: Auswahl bauen, veraltete
   * Zeiten entfernen, Serverzeit und Zusatz-Wartezeit des Wirts \\u00FCbernehmen.
   */
  var abhol = { gelesen: false, versatz: 0, oeffnungszeiten: null, zeitzone: "", zusatzMinuten: 0, geladenUm: 0, verfallen: false, stand: "" };

  function abholGrundlage(feld) {
    if (!abhol.gelesen) {
      abhol.gelesen = true;
      try { abhol.oeffnungszeiten = JSON.parse(feld.getAttribute("data-oeffnungszeiten") || "null"); } catch (e) { abhol.oeffnungszeiten = null; }
      abhol.zeitzone = feld.getAttribute("data-zeitzone") || "";
    }
    return {
      jetzt: Date.now() + abhol.versatz,
      oeffnungszeiten: abhol.oeffnungszeiten || undefined,
      zeitzone: abhol.zeitzone || undefined,
      zusatzMinuten: abhol.zusatzMinuten
    };
  }

  function abholOption(text, eintrag) {
    var option = document.createElement("option");
    option.textContent = text;
    option.value = eintrag ? eintrag.iso : "";
    if (eintrag) {
      option.setAttribute("data-art", eintrag.art);
      option.setAttribute("data-uhrzeit", eintrag.uhrzeit);
    }
    return option;
  }

  function abholHinweis(feld) {
    var hinweis = byId("ord-abholzeit-hinweis");
    if (!hinweis) {
      hinweis = document.createElement("p");
      hinweis.id = "ord-abholzeit-hinweis";
      hinweis.className = "hint abholzeit-hinweis";
      hinweis.setAttribute("aria-live", "polite");
      feld.parentNode.appendChild(hinweis);
    }
    return hinweis;
  }

  /**
   * Baut die Auswahl aus der aktuellen Uhrzeit neu: nur offene, k\\u00FCnftige
   * Zeiten. Eine gew\\u00E4hlte Zeit, die inzwischen nicht mehr geht, wird nicht
   * still ersetzt: Die Auswahl wird geleert, der Gast bekommt einen Hinweis.
   * "So schnell wie m\\u00F6glich" bleibt gew\\u00E4hlt, die Uhrzeit dazu wandert mit.
   * Gibt false zur\\u00FCck, wenn die bisherige Wahl verfallen ist.
   */
  function aktualisiereAbholzeiten() {
    var feld = byId("ord-abholzeit");
    if (!feld || !window.Abholzeiten) return true;
    var gewaehlt = feld.selectedIndex > 0 ? feld.options[feld.selectedIndex] : null;
    var vorherArt = gewaehlt ? gewaehlt.getAttribute("data-art") : "";
    var vorherWert = gewaehlt ? gewaehlt.value : "";
    var grundlage = abholGrundlage(feld);
    var r = window.Abholzeiten.berechne(grundlage);
    var heute = window.Abholzeiten.datum(grundlage.jetzt, r.zeitzone);
    // Unver\u00E4ndert? Dann bleibt das Feld unangetastet (kein Flackern, eine
    // gerade ge\u00F6ffnete Auswahl klappt nicht zu).
    var stand = [r.asap ? r.asap.iso : "", r.geoeffnet, r.ohneOeffnungszeiten, r.slots.map(function (x) { return x.iso; }).join()].join("|");
    if (stand === abhol.stand && feld.options.length > 0) return true;
    abhol.stand = stand;

    feld.innerHTML = "";
    feld.appendChild(abholOption(r.asap ? "Bitte w\\u00E4hlen" : r.ohneOeffnungszeiten ? "Abholzeit bitte telefonisch" : "Heute keine Abholung mehr m\\u00F6glich", null));
    if (r.asap) feld.appendChild(abholOption("So schnell wie m\\u00F6glich \\u2013 ca. " + r.asap.uhrzeit + " Uhr", r.asap));
    var gruppen = {};
    var reihenfolge = [];
    r.slots.forEach(function (slot) {
      var schluessel = slot.intervall.von + " \\u2013 " + slot.intervall.bis + " Uhr";
      if (!gruppen[schluessel]) { gruppen[schluessel] = []; reihenfolge.push(schluessel); }
      gruppen[schluessel].push(slot);
    });
    reihenfolge.forEach(function (schluessel) {
      var ziel = feld;
      if (reihenfolge.length > 1) {
        ziel = document.createElement("optgroup");
        ziel.label = schluessel;
        feld.appendChild(ziel);
      }
      gruppen[schluessel].forEach(function (slot) {
        ziel.appendChild(abholOption(slot.uhrzeit + " Uhr" + (slot.datum !== heute ? " (nach Mitternacht)" : ""), slot));
      });
    });

    var gueltig = true;
    if (vorherArt === "asap" && r.asap) feld.value = r.asap.iso;
    else if (vorherWert) {
      feld.value = vorherWert;
      if (feld.value !== vorherWert) { feld.selectedIndex = 0; gueltig = false; abhol.verfallen = true; }
    }

    var text = "";
    // Der Hinweis bleibt stehen, bis der Gast neu gew\u00E4hlt hat.
    if (abhol.verfallen && !feld.value) text = "Die gew\\u00E4hlte Abholzeit ist nicht mehr m\\u00F6glich \\u2013 bitte w\\u00E4hlen Sie eine neue.";
    else if (r.ohneOeffnungszeiten) text = "Abholzeiten k\\u00F6nnen wir hier noch nicht anbieten \\u2013 bitte rufen Sie uns an.";
    else if (!r.asap) text = "Heute nehmen wir keine Abholbestellungen mehr an." + (r.naechsteOeffnung ? " N\\u00E4chste \\u00D6ffnung: " + r.naechsteOeffnung.text + "." : "");
    else if (!r.geoeffnet) text = "Gerade ist geschlossen \\u2013 Sie k\\u00F6nnen f\\u00FCr heute ab " + r.asap.uhrzeit + " Uhr vorbestellen.";
    var hinweis = abholHinweis(feld);
    hinweis.textContent = text;
    hinweis.hidden = !text;
    if (abhol.verfallen && !feld.value) {
      var feldRahmen = feld.closest(".field");
      if (feldRahmen) feldRahmen.classList.add("invalid");
    }
    return gueltig;
  }

  /** Live: \\u00D6ffnungszeiten, Zeitzone, Zusatz-Wartezeit und Uhr des Betriebs. */
  function ladeAbholKonfig() {
    if (!data.apiUrl || Date.now() - abhol.geladenUm < 60000) return;
    abhol.geladenUm = Date.now();
    var gesendet = Date.now();
    fetch(data.apiUrl + "/oeffentlich/abholzeiten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    })
      .then(function (antwort) { return antwort.json(); })
      .then(function (ergebnis) {
        if (!ergebnis || !ergebnis.ok) return;
        var server = new Date(ergebnis.jetzt).getTime();
        if (isFinite(server)) abhol.versatz = server - (gesendet + Date.now()) / 2;
        var feld = byId("ord-abholzeit");
        if (feld) abholGrundlage(feld);
        if (ergebnis.oeffnungszeiten) abhol.oeffnungszeiten = ergebnis.oeffnungszeiten;
        if (ergebnis.zeitzone) abhol.zeitzone = ergebnis.zeitzone;
        abhol.zusatzMinuten = Number(ergebnis.zusatzMinuten) || 0;
        aktualisiereAbholzeiten();
      })
      .catch(function () {
        // Ohne Antwort rechnet die Seite mit ihren eigenen Angaben weiter;
        // der Server pr\\u00FCft beim Absenden ohnehin noch einmal.
        abhol.geladenUm = 0;
      });
  }

  function beobachteAbholzeiten() {
    var feld = byId("ord-abholzeit");
    if (!feld) return;
    aktualisiereAbholzeiten();
    // Beim \\u00D6ffnen der Auswahl frisch rechnen, dazu alle 30 Sekunden -
    // aber nie w\\u00E4hrend der Gast gerade darin w\\u00E4hlt.
    feld.addEventListener("focus", aktualisiereAbholzeiten);
    feld.addEventListener("pointerdown", aktualisiereAbholzeiten);
    feld.addEventListener("change", function () {
      if (!feld.value || !abhol.verfallen) return;
      abhol.verfallen = false;
      var hinweis = byId("ord-abholzeit-hinweis");
      if (hinweis) { hinweis.textContent = ""; hinweis.hidden = true; }
    });
    setInterval(function () {
      if (document.activeElement !== feld) aktualisiereAbholzeiten();
    }, 30000);
  }

  document.addEventListener("DOMContentLoaded", function () {
    ladeRechtslage();
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
        if (lines().length > 0) openDrawer();
        else if (data.karteUrl) window.location.href = data.karteUrl;
        else byId("karte").scrollIntoView({ behavior: "smooth" });
      });
    }
    byId("drawer-close").addEventListener("click", closeDrawer);
    byId("overlay").addEventListener("click", function () { closeDrawer(); closeConfirm(); });
    byId("confirm-close").addEventListener("click", closeConfirm);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { closeDrawer(); closeConfirm(); }
    });

    // Die Reservierung steht auf der Startseite; die Speisekarten-Seite hat sie nicht.
    var dateInput = byId("res-datum");
    var today = new Date();
    var iso = today.getFullYear() + "-" +
      String(today.getMonth() + 1).padStart(2, "0") + "-" +
      String(today.getDate()).padStart(2, "0");
    if (dateInput) {
      dateInput.min = iso;
      dateInput.value = iso;
    }

    byId("order-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      if (lines().length === 0) return;
      // Unmittelbar vor dem Absenden neu rechnen: Eine inzwischen verfallene
      // Zeit wird geleert (mit Hinweis) und die Pr\u00FCfung unten schl\u00E4gt an.
      aktualisiereAbholzeiten();
      if (!validate(form, ["name", "telefon", "abholzeit"])) return;

      // Bedingungen und No-Show-Regel: getrennt, beide nur, wenn der Betrieb
      // sie freigegeben hat.
      var bedingungenVersion = bestaetigteVersion("ord-bedingungen-feld");
      var noShowVersion = bestaetigteVersion("ord-noshow-feld");
      if (bedingungenVersion === null || noShowVersion === null) return;

      var nummer = referenz("AB");
      var abholWahl = form.elements.abholzeit.options[form.elements.abholzeit.selectedIndex];
      var abholArt = abholWahl.getAttribute("data-art") || "";
      var abholUhrzeit = abholWahl.getAttribute("data-uhrzeit") || form.elements.abholzeit.value;
      var zeit = abholArt === "asap"
        ? "so schnell wie m\u00F6glich (ca. " + abholUhrzeit + " Uhr)"
        : abholUhrzeit + " Uhr";
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
      // \u00C4ltere Seiten haben im Bestellformular kein E-Mail-Feld.
      var bestellEmail = form.elements.email ? String(form.elements.email.value).trim() : "";

      sende("/oeffentlich/bestellung", {
        positionen: positionen,
        abholzeit: abholUhrzeit,
        abholArt: abholArt,
        abholZeitpunkt: abholArt ? form.elements.abholzeit.value : "",
        name: form.elements.name.value,
        telefon: form.elements.telefon.value,
        email: bestellEmail,
        hinweis: form.elements.hinweis.value,
        bestaetigungen: { bedingungen: bedingungenVersion, noShow: noShowVersion },
        noShowZustimmung: noShowVersion ? true : false
      }, byId("order-submit")).then(function (ergebnis) {
        // Die Abholzeit ist zun\\u00E4chst nur ein Wunsch: ob sie machbar ist,
        // best\\u00E4tigt die K\\u00FCche.
        var echteNummer = ergebnis.demo ? nummer : ergebnis.bestellung.nummer;
        // Ohne Betriebsserver (Beispielseite, Entwurf) ist nichts passiert \\u2013
        // die Best\\u00E4tigung sagt das ehrlich, statt Erfolg vorzut\\u00E4uschen.
        var teil = ergebnis.demo ? {} : ergebnis.bestellung;
        var text = ergebnis.demo
          ? "Das ist eine Vorschau: Ihre Bestellung wurde nicht verschickt und wird nicht zubereitet. Auf der fertigen Website landet sie direkt in der K\\u00FCche des Restaurants." + telefonSatz("Zum Bestellen")
          : "Anfrage eingegangen \\u2013 wartet noch auf Best\\u00E4tigung durch das Restaurant. Die Abholzeit gilt erst, wenn das Restaurant sie best\\u00E4tigt." + kanalSatz(bestellEmail, teil);
        var zeilen = [
          [ergebnis.demo ? "Abholung" : "Abholung (gew\\u00FCnscht)", zeit],
          ["Positionen", stueck],
          ["Gesamt", summe],
        ];
        if (!ergebnis.demo) {
          zeilen.unshift(["Status", teil.statusText || "Eingegangen \\u2013 noch nicht best\\u00E4tigt"]);
          zeilen.unshift(["Bestellnummer", echteNummer]);
          if (teil.rueckfrageTelefon || data.telefon) zeilen.push(["R\\u00FCckfragen", teil.rueckfrageTelefon || data.telefon]);
        }

        showConfirm(
          ergebnis.demo ? "Vorschau \\u2013 nichts bestellt" : "Bestellung eingegangen",
          text,
          zeilen,
          mailtoLink("Abholbestellung " + echteNummer + " \\u2013 " + data.name, body),
          false,
          statusUrl(teil)
        );

        cart = {};
        renderCart();
        form.reset();
        closeDrawer();
      }).catch(function (fehler) {
        // Z.B. eine Abholzeit, die der Server nicht mehr annimmt: Zeiten neu holen.
        abhol.geladenUm = 0;
        ladeAbholKonfig();
        aktualisiereAbholzeiten();
        ladeRechtslage();
        zeigeFehler(fehler.message);
      });
    });

    if (byId("reservation-form")) byId("reservation-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      if (!validate(form, ["datum", "uhrzeit", "personen", "name", "telefon"])) return;
      var resBedingungen = bestaetigteVersion("res-bedingungen-feld");
      var resNoShow = bestaetigteVersion("res-noshow-feld");
      if (resBedingungen === null || resNoShow === null) return;

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
      var resEmail = String(form.elements.email.value).trim();
      // "4 Personen" -> 4, damit das Lokal eine Zahl bekommt.
      var personenZahl = parseInt(personenText, 10) || 1;

      sende("/oeffentlich/reservierung", {
        datum: form.elements.datum.value,
        uhrzeit: uhrzeit,
        personen: personenZahl,
        name: form.elements.name.value,
        telefon: form.elements.telefon.value,
        email: resEmail,
        wunsch: form.elements.wunsch.value,
        bestaetigungen: { bedingungen: resBedingungen, noShow: resNoShow }
      }, form.querySelector("button[type=submit]")).then(function (ergebnis) {
        var teil = ergebnis.demo ? {} : ergebnis.reservierung;
        // Die Referenz vergibt der Server \\u2013 dieselbe steht in E-Mail und Statusseite.
        var echteNummer = teil.nummer || nummer;
        var zeilen = [
          ["Datum", datum],
          ["Uhrzeit", uhrzeit],
          ["Personen", personenText],
        ];
        if (!ergebnis.demo) {
          zeilen.unshift(["Status", teil.statusText || "Anfrage eingegangen \\u2013 noch nicht best\\u00E4tigt"]);
          zeilen.unshift(["Reservierungsnr.", echteNummer]);
          if (teil.rueckfrageTelefon || data.telefon) zeilen.push(["R\\u00FCckfragen", teil.rueckfrageTelefon || data.telefon]);
        }
        showConfirm(
          ergebnis.demo ? "Vorschau \\u2013 nichts gesendet" : "Anfrage eingegangen",
          ergebnis.demo
            ? "Das ist eine Vorschau: Ihre Anfrage wurde nicht verschickt, es ist kein Tisch reserviert. Auf der fertigen Website geht sie direkt an das Restaurant." + telefonSatz("Zum Reservieren")
            : "Anfrage eingegangen \\u2013 wartet noch auf Best\\u00E4tigung durch das Restaurant. Ihr Tisch ist erst reserviert, wenn das Restaurant best\\u00E4tigt." + kanalSatz(resEmail, teil),
          zeilen,
          mailtoLink("Tischreservierung " + echteNummer + " \\u2013 " + data.name, body),
          false,
          statusUrl(teil)
        );

        form.reset();
        dateInput.value = iso;
      }).catch(function (fehler) {
        ladeRechtslage();
        zeigeFehler(fehler.message);
      });
    });

    beobachteAbholzeiten();
    ladeAbholKonfig();
    stelleWarenkorbWiederHer();
    renderCart();
  });
})();
`;

// Der Bootstrap für den Remotion-Player: absichtlich als winziges Inline-
// Skript, nicht als weiterer <script src>. Das Bündel selbst
// (docs/assets/motion/signature-player.js, gebaut über
// scripts/buildRemotionPlayer.mjs) wiegt ~168 kB gzip – React, react-dom und
// Remotion für eine einzige gezeichnete Marke. Damit Seiten, bei denen
// niemand bis dorthin scrollt oder liest, dafür nie bezahlen, lädt dieses
// Skript das Bündel erst per IntersectionObserver, kurz bevor die Marke ins
// Bild kommt – dieselbe Zurückhaltung wie bei loading="lazy" auf den Fotos.
function remotionBootstrapScript(assets) {
  return `
<script>
(function () {
  function einrichten() {
    // .remotion-mount steckt im Siegel der Hausempfehlung, weit unten in
    // der Highlights-Sektion – dieses Skript steht aber gleich nach <body>,
    // damit es so früh wie möglich lädt. Ohne DOMContentLoaded fände
    // querySelector hier noch nichts.
    var el = document.querySelector(".remotion-mount");
    if (!el) return;
    var geladen = false;
    function laden() {
      if (geladen) return;
      geladen = true;
      import("${assets}/motion/signature-player.js");
    }
    if (!("IntersectionObserver" in window)) { laden(); return; }
    var beobachter = new IntersectionObserver(function (eintraege) {
      if (eintraege.some(function (e) { return e.isIntersecting; })) { laden(); beobachter.disconnect(); }
    }, { rootMargin: "200px" });
    beobachter.observe(el);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", einrichten);
  else einrichten();
})();
</script>`;
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
  // Die Handschrift des Archetyps (Schritte 3-5 des Design-Auftrags, siehe
  // styles/handschrift.css.js). Ohne sie - also bei jedem Preset, das kein
  // Archetyp ist - entsteht weder eine Körperklasse noch ein CSS-Block, und
  // die Seite bleibt Zeichen für Zeichen die bisherige.
  const handschrift = preset.layout.handschrift ?? null;
  const handschriftStil = handschriftCss(handschrift, gestaltung.cuisine);
  // Ohne Handschrift trägt jede Seite die Signaturregeln aller zwölf Küchen
  // mit sich – rund 17 kB, von denen sie eine braucht. Das bleibt so, weil
  // jede bereits veröffentlichte Seite sonst mit dem nächsten Publish andere
  // Bytes bekäme; wo eine Handschrift im Spiel ist, wird gefiltert.
  const signaturStil = handschrift ? signaturCssFuer(gestaltung.cuisine) : SIGNATUR_CSS;
  // Opt-in, kein Preset-Feld: gilt nur, wenn der Aufruf es ausdrücklich
  // verlangt (options.remotionSignature === true), und nur dort, wo die
  // Küche überhaupt eine gezeichnete Marke hat. Jede bisherige Seite bleibt
  // ohne diese Zeile Zeichen für Zeichen dieselbe.
  const remotionSignature = Boolean(options.remotionSignature) && Boolean(handschrift) && hatKuechenMarke(gestaltung.cuisine);
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

  const kontaktZeilen = renderKontaktZeilen({ adresse, mapsUrl, telefon, telHref, handschrift });
  const hoursRows = renderOeffnungszeiten(openingHours);

  // Das Magazin-Raster und der Video-Hero sind opt-in. Nur wenn ein Preset sie
  // anfordert, kommen der Editorial-Stil, die größere Schriftskala und der
  // zusätzliche Bewegungsblock in die Seite. Für die drei bestehenden
  // Archetypen bleibt die Ausgabe damit Zeichen für Zeichen dieselbe wie zuvor.
  const asymmetrisch = preset.layout.gridStyle === "asymmetric";
  const heroVideoSrc = eigeneBilder.heroVideo ?? lead.heroVideo ?? "";
  const hatVideoHero = preset.hero.type === "video_loop" && Boolean(heroVideoSrc);
  const brauchtExtraBewegung = asymmetrisch || preset.hero.type === "editorial" || hatVideoHero;
  const typografieCss = TYPOGRAFIE_CSS[preset.typography?.scale ?? "standard"] ?? "";
  // Der kräftigere Akzent wird von zwei Gestaltungen gebraucht: vom Magazin
  // (große Flächen und Schrift) und von jeder Handschrift, die accent als
  // Textfarbe einsetzt. Der Wortlaut des Magazin-Zweigs bleibt bewusst Zeichen
  // für Zeichen der bisherige: Sonst änderte sich mit dem nächsten Publish
  // jede bereits veröffentlichte Magazin-Seite, obwohl an ihr nichts
  // gestaltet wurde.
  const accentBoldRegel = `:root { --accent-bold: ${t.accentBold ?? t.accent}; }`;
  // Für die Handschrift der strengere Wert: accentBold erreicht 4.5:1 nur
  // gegen bg, accentLesbar auch gegen surface und soft (siehe stimmungen.js).
  const accentLesbarRegel = `:root { --accent-bold: ${t.accentLesbar ?? t.accentBold ?? t.accent}; }`;
  const accentBoldBlock = asymmetrisch
    ? `
/* Der kräftigere Akzent aus colorMath.boldAccent – mindestens 4.5:1 gegen den
   eigenen Grund. Er steht nur dort, wo er gebraucht wird: Die drei bestehenden
   Archetypen arbeiten unverändert mit --accent. */
${accentBoldRegel}`
    : handschriftStil
      ? `
/* Die beiden abgeleiteten Töne der Handschrift (siehe stimmungen.js):
   --accent-bold trägt jeden Text, der sonst in accent stünde und gegen bg,
   surface oder soft unter 4.5:1 läge. --gold-hell ist dasselbe für Gold im
   Hero, wo es auf einem Foto unter einem Schleier liegt (--gold-dunkel für
   helle Flächen steht ohnehin in jeder Seite). Flächen behalten accent und
   gold – dagegen ist onAccent geprüft. */
${accentLesbarRegel}
:root { --gold-hell: ${t.goldAufTint ?? t.gold}; }`
      : "";

  const bodyKlassen = [
    veroeffentlicht ? "veroeffentlicht" : "",
    asymmetrisch ? "gitter-asymmetrisch" : "",
    handschriftKlasse(handschrift),
  ]
    .filter(Boolean)
    .join(" ");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)}${ort ? ` – ${escapeHtml(menu.konzept ?? "Restaurant")} in ${escapeHtml(ort)}` : ""}</title>
<meta name="description" content="${escapeHtml(`${name}${ort ? ` in ${ort}` : ""}: ${menu.konzept ?? menu.label}. ${schlagzeile} Jetzt Tisch reservieren oder zur Abholung vorbestellen.`)}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🍽️%3C/text%3E%3C/svg%3E">
${veroeffentlicht ? '<meta name="robots" content="noindex, nofollow">\n' : ""}${engineMarkerMeta({ archetyp: gestaltung.archetyp })}
<style>
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
  /* Gold trägt Text (Platzhalter-Abzeichen, Sterne, Kicker) und erreicht
     dort auf hellem Grund 2.0-3.1:1. Der abgeleitete Ton steht jeder Seite
     zur Verfügung, damit ein gekennzeichneter Platzhalter überall lesbar
     ist - siehe stimmungen.js und scripts/colorSwatchCheck.mjs. */
  --gold-dunkel: ${t.goldDunkel ?? t.gold};
  --tint: ${t.tint};
  --tint-rgb: ${t.tintRgb};
  --display: ${t.display};
  --body: ${t.body};
  --display-transform: ${t.displayTransform};
  --display-tracking: ${t.displayTracking};
  --radius: ${t.radius};

  /* Globales Token-Set (DESIGN.md, Abschnitt 4 "Spacing, Radius, Shadow,
     Transition"): gilt für UI-Chrome, die keine eigene Küchen-Note trägt
     (Buttons, Formulare, Karten-Schatten) – anders als --radius oben, das
     je Stimmung variiert. */
  --space-xs: 6px;
  --space-sm: 12px;
  --space-md: 24px;
  --space-lg: 48px;
  --space-xl: 84px;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-pill: 999px;
  --shadow-soft: 0 2px 12px rgba(0,0,0,.07);
  --shadow-card: 0 8px 28px rgba(0,0,0,.10);
  --shadow-strong: 0 18px 48px rgba(0,0,0,.18);
  --transition-fast: .12s ease;
  --transition-base: .22s ease;
  --transition-slow: .38s cubic-bezier(.22,1,.36,1);
  --text-xs: .75rem;
  --text-sm: .875rem;
  --text-base: 1.0625rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: clamp(1.5rem, 3vw, 2rem);
  --text-display: clamp(2.125rem, 7vw, 4.375rem);
}${accentBoldBlock}
${PAGE_STYLES}
${signaturStil}
${MOTION_CSS}${typografieCss}${asymmetrisch ? EDITORIAL_CSS : ""}${brauchtExtraBewegung ? MOTION_EXTRA_CSS : ""}${handschriftStil}${apiUrl ? RECHTLICHES_CSS : ""}
</style>
</head>
<body${bodyKlassen ? ` class="${bodyKlassen}"` : ""}>
${remotionSignature ? `${remotionBootstrapScript(assets)}\n` : ""}
${
  veroeffentlicht
    ? `<div class="entwurf-hinweis"><span>${
        fiktiv
          ? "Beispielseite – dieses Lokal ist <strong>frei erfunden</strong>."
          : `Unverbindlicher Gestaltungsentwurf – <strong>nicht</strong> die offizielle Website von ${escapeHtml(name)}.`
      }</span></div>`
    : ""
}
${renderHeader({ name, sticky: preset.header.sticky })}

${renderHero({
  lead,
  preset,
  name,
  ort,
  heroImageSrc: eigeneBilder.hero ?? bildUrl(gestaltung.heroImage, "hero"),
  heroVideoSrc,
  konzeptLabel: menu.konzept ?? menu.label,
  heroHeadline,
  heroSchlagzeile,
  cuisine: gestaltung.cuisine,
  highlights,
  hausBild: gestaltung.hausBild,
  bildUrl,
  handschrift,
})}

${renderUspStrip(menu.usps, handschrift, lead, fiktiv)}

${(() => {
  // Reihenfolge der Hauptsektionen kommt aus preset.layout.sectionOrder.
  // Eine unbekannte oder unvollständige Vorgabe verliert nie eine Sektion:
  // alles, was in der Vorgabe fehlt, wird in der bisherigen Reihenfolge
  // angehängt (das bisherige, feste Verhalten als Fallback).
  const sectionsById = {
    highlights: renderHighlights({ highlights, bildUrl, showBadges: preset.menu.showBadges, beschreibungFuer, spalten, gridStyle: preset.layout.gridStyle, handschrift, cuisine: gestaltung.cuisine, remotionSignature }),

    karte: renderMenu({ menu, menuLayout: preset.menu.layout, showBadges: preset.menu.showBadges, beschreibungFuer, handschrift }),

    ambiente: renderAmbiente({
      konzeptLabel: menu.konzept ?? menu.label,
      ort,
      geschichte: menu.geschichte,
      hausBild: gestaltung.hausBild,
      teamBild: gestaltung.teamBild,
      bestsellerBild: highlights[0]?.bild,
      bildUrl,
      eigeneBilder,
      handschrift,
      fiktiv,
    }),

    stimmen: renderStimmen(gestaltung.cuisine, lead, fiktiv, preset.social.layout, handschrift),

    reservierung: renderReservation({ widgetVariant: preset.reservation.widgetVariant, handschrift, statusHinweis: apiUrl ? STATUS_LINK_HINWEIS : "", rechtliches: rechtlichesHtml("reservierung", apiUrl) }),

    kontakt: renderContact({ kontaktZeilen, hoursRows, strasse: strasseAusAdresse(adresse), ort, handschrift }),
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
          <select id="ord-abholzeit" name="abholzeit" required${abholzeitAttribute({ oeffnungszeiten: openingHours }, escapeHtml)}>
            <option value="">Bitte wählen</option>
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
          <label for="ord-email">E-Mail-Adresse für Bestätigung und Änderungen <span class="hint">(optional)</span></label>
          <input type="email" id="ord-email" name="email" autocomplete="email" inputmode="email" maxlength="254">
          <span class="hint">${EMAIL_ZWECK}</span>
          <span class="error">Bitte prüfen Sie die E-Mail-Adresse.</span>
        </div>
        <div class="field">
          <label for="ord-hinweis">Hinweis <span class="hint">(optional)</span></label>
          <textarea id="ord-hinweis" name="hinweis" placeholder="Allergien, Sonderwünsche ..."></textarea>
        </div>
      </div>
      ${rechtlichesHtml("bestellung", apiUrl)}
      <div class="field" id="ord-noshow-feld" style="display:none;margin-top:14px">
        <label style="display:flex;align-items:flex-start;gap:8px;font-weight:400;text-transform:none;letter-spacing:normal">
          <input type="checkbox" id="ord-noshow" name="noShowZustimmung" style="margin-top:3px">
          <span id="ord-noshow-text"></span>
        </label>
        <span class="error">Bitte stimmen Sie zu, um die Bestellung abzuschicken.</span>
      </div>
      <div class="drawer-foot" style="margin:24px -22px -22px">
        <div class="totals"><span>Gesamt</span><span id="cart-total">0,00 €</span></div>
        <button class="btn btn-primary btn-block" id="order-submit" type="submit">${apiUrl ? ZAHLUNGSPFLICHTIG_BESTELLEN : PROBEBESTELLUNG_ABSENDEN}</button>
        <p class="hint" style="margin-top:10px;text-align:center">Bezahlung bei Abholung, bar oder mit Karte.</p>${
          apiUrl
            ? `
        <p class="hint" style="margin-top:6px;text-align:center">${escapeHtml(STATUS_LINK_HINWEIS)}</p>`
            : ""
        }
      </div>
    </form>
  </div>
</aside>

<div class="confirm-box" id="confirm" role="dialog" aria-modal="true">
  <div class="confirm-icon" id="confirm-icon" aria-hidden="true">
    <span class="ci-ok">${checkCircle()}</span>
    <span class="ci-fehler">${warnung()}</span>
  </div>
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

${renderFooter({ name, adresse, telefon, cuisine: gestaltung.cuisine, handschrift, rechtsLinks: rechtsLinks(apiUrl) })}

<script>window.PAGE_DATA = ${pageData};</script>
<script>${abholzeitSkript()}</script>
<script>${PAGE_SCRIPT}</script>
<script>${MOTION_SCRIPT}</script>${brauchtExtraBewegung ? `
<script>${MOTION_EXTRA_SKRIPT}</script>` : ""}
${resonanzBeacon ? `<script>${resonanzBeacon}</script>` : ""}
</body>
</html>
`;
}
