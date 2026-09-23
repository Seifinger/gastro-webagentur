// Die funktionale Schicht aus v1 – unverändert.
//
// Warenkorb, Abholbestellung, Reservierung, No-Show-Zustimmung und die
// API-Aufrufe an wirtServer.js stecken in v1 in PAGE_SCRIPT
// (src/landingPageGenerator.js). Das Skript ist dort nicht exportiert, und
// v1 bleibt unangetastet. Statt es zu kopieren (und damit zwei Fassungen zu
// pflegen, die auseinanderlaufen), liest v2 es zur Build-Zeit aus der
// v1-Quelle und wertet das Template-Literal genau so aus, wie v1 es tut.
// Jede Korrektur an v1 gilt damit automatisch auch für v2.
//
// Dazu die Markup-Verträge, an denen das Skript hängt: Element-IDs,
// Formularfeldnamen und die Klassen, die es selbst setzt. siteBuilder.js
// prüft vor der Ausgabe, dass jede ID im Markup vorkommt.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export { RESERVATION_SLOTS, PICKUP_SLOTS } from "../../src/sections/reservation.js";
export {
  themeForLead,
  slugify,
  ortsbezug,
  strasseAusAdresse,
  DEFAULT_OPENING_HOURS,
} from "../../src/landingPageGenerator.js";
export { stimmenFuer, PLATZHALTER_ERKLAERUNG } from "../../src/testimonials.js";
export { menuForCuisine, highlightCandidates, gerichtId, KUECHEN_LABEL } from "../../src/menuCatalog.js";
export { assetFileName, remoteImageUrl, HERO_IMAGES, INTERIOR_IMAGES, TEAM_IMAGES } from "../../src/imageLibrary.js";
export { haken, stern, plus, chevron, checkCircle, warnung, kuechenMarke, KONTAKT_IKONEN, uhr, gedeck } from "../../src/signaturIcons.js";
export { escapeHtml, jsonForScript, formatPrice, formatCount, optionList } from "../../src/htmlHelpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const V1_GENERATOR = path.join(__dirname, "..", "..", "src", "landingPageGenerator.js");

let zwischenspeicher = null;

/**
 * PAGE_SCRIPT aus v1, Zeichen für Zeichen so, wie v1 es in die Seite
 * schreibt. Wirft, wenn sich die v1-Quelle so verändert hat, dass das
 * Skript nicht mehr eindeutig zu finden ist – dann soll der Build laut
 * scheitern statt eine Seite ohne Bestellfunktion auszuliefern.
 */
export function seitenSkript() {
  if (zwischenspeicher) return zwischenspeicher;
  const quelle = readFileSync(V1_GENERATOR, "utf-8");
  const start = quelle.indexOf("const PAGE_SCRIPT = `");
  if (start === -1) throw new Error("PAGE_SCRIPT nicht in src/landingPageGenerator.js gefunden.");
  const inhaltStart = start + "const PAGE_SCRIPT = ".length;
  // Robuster gegen verschiedene Zeilenenden (LF vs CRLF):
  // Suche nach Backtick gefolgt von Semikolon und optional Carriage Return + Newline
  let ende = quelle.indexOf("`;\r\n", inhaltStart + 1);
  if (ende === -1) ende = quelle.indexOf("`;\n", inhaltStart + 1);
  if (ende === -1) throw new Error("Ende von PAGE_SCRIPT nicht gefunden.");
  const literal = quelle.slice(inhaltStart, ende + 1);
  if (/\$\{/.test(literal)) throw new Error("PAGE_SCRIPT enthält Platzhalter – Auslesen wäre nicht mehr 1:1.");
  // Das Literal hat keine Platzhalter; ausgewertet wird es wie in v1, damit
  // Escapes wie \\u00E4 genau so in der Seite landen.
  zwischenspeicher = new Function(`return ${literal};`)();
  return zwischenspeicher;
}

/** IDs, die PAGE_SCRIPT per getElementById anspricht. */
export const PFLICHT_IDS = [
  "topbar",
  "karte",
  "cart-lines",
  "cart-total",
  "fab-total",
  "fab-count",
  "order-submit",
  "cart-fab",
  "drawer",
  "overlay",
  "drawer-close",
  "confirm",
  "confirm-title",
  "confirm-text",
  "confirm-summary",
  "confirm-mail",
  "confirm-close",
  "order-form",
  "ord-noshow-feld",
  "ord-noshow",
  "ord-noshow-text",
  "reservation-form",
  "res-datum",
];

/** Formularfelder (name-Attribute), die das Skript liest. */
export const PFLICHT_FELDER = {
  "order-form": ["abholzeit", "name", "telefon", "hinweis"],
  "reservation-form": ["datum", "uhrzeit", "personen", "name", "telefon", "email", "wunsch"],
};

/** Prüft, ob das Markup alle Anker des v1-Skripts enthält. */
export function pruefeFunktionsVertrag(html) {
  const fehlend = PFLICHT_IDS.filter((id) => !new RegExp(`id="${id}"`).test(html));
  for (const [form, felder] of Object.entries(PFLICHT_FELDER)) {
    const formStart = html.indexOf(`id="${form}"`);
    const formEnde = html.indexOf("</form>", formStart);
    const block = formStart === -1 ? "" : html.slice(formStart, formEnde);
    for (const feld of felder) {
      if (!new RegExp(`name="${feld}"`).test(block)) fehlend.push(`${form}[name=${feld}]`);
    }
  }
  if (!/data-add="[^"]+"[^>]*data-name="[^"]*"[^>]*data-preis="[\d.]+"/.test(html)) fehlend.push("[data-add][data-name][data-preis]");
  return fehlend;
}
