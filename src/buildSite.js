import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readAllLeads } from "./csvImport.js";
import {
  buildLandingPage,
  slugify,
  themeForLead,
  imageSpecsForLead,
} from "./landingPageGenerator.js";
import { menuForCuisine, MENUS } from "./menuCatalog.js";
import { ladeZuordnungen, kuecheFuerLead } from "./cuisineOverrides.js";
import { ladeStimmungsWahl, stimmungFuerLead } from "./stimmungsWahl.js";
import { ensureAssets } from "./imageLibrary.js";
import { ensureFonts, fontFaceCss } from "./fontLibrary.js";
import { resonanzUrl } from "./config.js";
import { ladeManifest, placeIdFuerSlug } from "./entwurfsManifest.js";

// Gemeinsamer Unterbau für die lokale Fassung (npm run pages) und die
// veröffentlichte Fassung (npm run publish-site). Beide sollen denselben
// Entwurf ergeben – deshalb liegt die Auswahl- und Schreiblogik hier.

export function parseArgs(argv) {
  const args = {
    region: null,
    limit: null,
    minScore: 0,
    email: "",
    cuisine: null,
    kontakt: "",
    api: "",
    // Adresse des Resonanz-Collectors. Leer gelassen wird kein Beacon in die
    // Entwürfe gebaut; Default kommt aus RESONANZ_URL in der .env.
    resonanz: resonanzUrl,
    // Nur diesen einen Entwurf neu bauen (siehe leadFuerSlug unten) – für
    // Änderungen an einem einzelnen Lead, ohne die übrigen ~55 anzufassen.
    only: null,
    // Remotion-Signaturen aktivieren: animierte Hero-Elemente statt statische Bilder.
    remotion: false,
    // Nur diese eine Beispielseite (docs/beispiel-<küche>) veröffentlichen.
    beispiel: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--region") args.region = argv[++i];
    if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    if (argv[i] === "--min-score") args.minScore = Number(argv[++i]);
    if (argv[i] === "--email") args.email = argv[++i];
    if (argv[i] === "--cuisine") args.cuisine = argv[++i];
    if (argv[i] === "--kontakt") args.kontakt = argv[++i];
    if (argv[i] === "--api") args.api = argv[++i];
    if (argv[i] === "--resonanz") args.resonanz = argv[++i];
    if (argv[i] === "--only") args.only = argv[++i];
    if (argv[i] === "--remotion") args.remotion = true;
    if (argv[i] === "--beispiel") args.beispiel = argv[++i];
  }
  return args;
}

export function pruefeKueche(cuisine) {
  if (cuisine && !MENUS[cuisine]) {
    return `Unbekannte Küche "${cuisine}". Möglich sind: ${Object.keys(MENUS).join(", ")}`;
  }
  return null;
}

export function waehleLeads({ region, limit, minScore }) {
  let selected = readAllLeads()
    .filter((lead) => (region ? lead.ort === region : true))
    .filter((lead) => (lead.score ?? 0) >= minScore)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  if (limit) selected = selected.slice(0, limit);
  return selected;
}

/**
 * Kennung am Ordnernamen, damit die Entwürfe nicht durch Raten des
 * Restaurantnamens gefunden werden. Sie hängt fest am Lead, die Adresse
 * bleibt also über mehrere Läufe dieselbe – ein einmal ausgegebener
 * QR-Code funktioniert weiter.
 */
export function entwurfToken(lead) {
  const quelle = String(lead?.placeId || lead?.name || "entwurf");
  let hash = 0;
  for (let i = 0; i < quelle.length; i += 1) {
    hash = (hash * 33 + quelle.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).padStart(7, "0").slice(-7);
}

/**
 * Vergibt pro Lead einen eindeutigen Ordnernamen. Gleichnamige Restaurants
 * unterscheiden sich schon durch die Kennung; bei echten Kollisionen kommt
 * eine laufende Nummer dazu.
 */
function uniqueSlug(lead, taken) {
  const base = `${slugify(lead.name)}-${entwurfToken(lead)}`;
  let slug = base;
  let counter = 2;
  while (taken.has(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  taken.add(slug);
  return slug;
}

export function baueEintraege(leads, cuisineOverride) {
  const taken = new Set();
  const zuordnungen = ladeZuordnungen();
  const stimmungsWahl = ladeStimmungsWahl();

  return leads.map((lead) => {
    const cuisine = cuisineOverride ?? kuecheFuerLead(lead, zuordnungen);
    return {
      lead,
      cuisine,
      gestaltung: themeForLead(lead, cuisine, stimmungFuerLead(lead, cuisine, stimmungsWahl)),
      slug: uniqueSlug(lead, taken),
    };
  });
}

/**
 * Findet den Lead zu einem Entwurfs-Slug über data/landingpages/entwuerfe.json
 * – die Zuordnung, die baueEintraege() bei einem vollständigen Lauf erzeugt.
 * Grundlage für "--only <slug>": uniqueSlug() vergibt für denselben Lead
 * (dieselbe placeId) immer denselben Slug, ein Lauf mit nur diesem einen Lead
 * trifft also wieder genau diesen Slug – die Kollisions-Zählung in
 * uniqueSlug() greift nur, wenn zwei verschiedene Leads zufällig denselben
 * Namen und Hash ergeben, praktisch ausgeschlossen bei eindeutigen placeIds.
 */
export function leadFuerSlug(slug) {
  const placeId = placeIdFuerSlug(ladeManifest(), slug);
  if (!placeId) return null;
  return readAllLeads().find((lead) => lead.placeId === placeId) ?? null;
}

export async function ladeBilder(entries, assetsDir) {
  const specs = entries.flatMap(({ lead, cuisine }) => imageSpecsForLead(lead, cuisine));
  const ergebnis = await ensureAssets(specs, assetsDir);

  console.log(
    ergebnis.geladen > 0
      ? `   ${ergebnis.geladen} Bild(er) geladen.`
      : "   Alle Bilder bereits vorhanden.",
  );
  if (ergebnis.fehlgeschlagen.length > 0) {
    console.log(`   ⚠️  ${ergebnis.fehlgeschlagen.length} Bild(er) nicht geladen:`);
    ergebnis.fehlgeschlagen.forEach((zeile) => console.log(`      ${zeile}`));
  }
  return ergebnis;
}

/**
 * Lädt die Schriften und liefert das passende @font-face-CSS. Schlägt der
 * Download fehl, kommt ein leerer String zurück und die Seiten greifen auf
 * Systemschriften zurück.
 */
export async function ladeSchriften(fontsDir, cssPfad = "../assets/fonts") {
  const ergebnis = await ensureFonts(fontsDir);

  console.log(
    ergebnis.geladen > 0
      ? `   ${ergebnis.geladen} Schriftdatei(en) geladen.`
      : "   Alle Schriften bereits vorhanden.",
  );
  if (ergebnis.fehlgeschlagen.length > 0) {
    console.log(
      `   ⚠️  ${ergebnis.fehlgeschlagen.length} Schrift(en) nicht geladen – die Entwürfe nutzen Systemschriften.`,
    );
    ergebnis.fehlgeschlagen.forEach((zeile) => console.log(`      ${zeile}`));
  }

  return fontFaceCss(fontsDir, cssPfad);
}

export function schreibeSeiten(entries, zielordner, optionen = {}) {
  for (const entry of entries) {
    const html = buildLandingPage(entry.lead, {
      ...optionen,
      menu: menuForCuisine(entry.cuisine),
      gestaltung: entry.gestaltung,
      editUebersteuerung: entry.editUebersteuerung,
      // Das Resonanz-Beacon meldet den Entwurf unter genau dieser Kennung –
      // vergeben wird sie erst hier von uniqueSlug().
      slug: entry.slug,
    });

    const dir = path.join(zielordner, entry.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), html, "utf-8");
  }
}
