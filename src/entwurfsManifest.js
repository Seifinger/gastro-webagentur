import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { landingPagesDir } from "./config.js";
import { ENGINE_VERSION } from "./engineVersion.js";

// data/landingpages/entwuerfe.json: die Zuordnung placeId -> Entwurfsordner.
// Früher stand dort direkt der Slug als String. Seit der Engine-Versionierung
// hängt am selben Eintrag außerdem, mit welcher Engine-Fassung der Entwurf
// zuletzt wirklich veröffentlicht wurde:
//
//   { "<placeId>": { "slug": "...", "engineVersion": 2,
//                    "archetyp": "abend", "veroeffentlichtAm": "<ISO>" } }
//
// Die alte String-Form wird weiterhin gelesen (ältere Manifeste, Tests, von
// Hand geschriebene Dateien) – ladeManifest() normalisiert sie beim Lesen.
// Geschrieben wird nur noch die Objektform.

export function manifestPfad(dir = landingPagesDir) {
  return path.join(dir, "entwuerfe.json");
}

function normalisiere(wert) {
  if (typeof wert === "string") return { slug: wert };
  if (wert && typeof wert === "object" && typeof wert.slug === "string") return { ...wert };
  return null;
}

/** Das Manifest in normalisierter Form: { placeId: { slug, ... } }. */
export function ladeManifest(dir = landingPagesDir) {
  let roh;
  try {
    roh = JSON.parse(readFileSync(manifestPfad(dir), "utf-8"));
  } catch {
    // Kein Manifest (erster Lauf) oder kaputtes JSON: ein leeres Manifest ist
    // der richtige Ausgangspunkt, ein Abbruch wäre hier unverhältnismäßig.
    return {};
  }
  if (!roh || typeof roh !== "object") return {};

  const manifest = {};
  for (const [placeId, wert] of Object.entries(roh)) {
    const eintrag = normalisiere(wert);
    if (placeId && eintrag) manifest[placeId] = eintrag;
  }
  return manifest;
}

export function schreibeManifest(manifest, dir = landingPagesDir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(manifestPfad(dir), `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  return manifest;
}

export function slugFuerPlaceId(manifest, placeId) {
  return manifest[placeId]?.slug ?? null;
}

export function placeIdFuerSlug(manifest, slug) {
  return Object.keys(manifest).find((placeId) => manifest[placeId].slug === slug) ?? null;
}

/** Der Eintrag zu einem Ordnernamen, inklusive placeId. Ohne Treffer: null. */
export function eintragFuerSlug(manifest, slug) {
  const placeId = placeIdFuerSlug(manifest, slug);
  return placeId ? { placeId, ...manifest[placeId] } : null;
}

/**
 * Schreibt die Zuordnung eines vollständigen Laufs. Leads, die nicht mehr
 * dabei sind, fallen heraus – wie bisher. Die Veröffentlichungsdaten der
 * übrigen bleiben aber stehen: Ein lokaler "npm run pages"-Lauf sagt nichts
 * darüber aus, was beim Kunden online liegt.
 */
export function merkeEntwuerfe(paare, dir = landingPagesDir) {
  const bisher = ladeManifest(dir);
  const manifest = {};
  for (const { placeId, slug } of paare) {
    if (!placeId) continue;
    const alt = bisher[placeId];
    // Der Ordnername kann sich (bei umbenanntem Lokal) ändern. Dann gehört
    // der alte Veröffentlichungsstand nicht mehr zu diesem Ordner.
    manifest[placeId] = alt && alt.slug === slug ? { ...alt, slug } : { slug };
  }
  return schreibeManifest(manifest, dir);
}

/** Einen einzelnen Eintrag ergänzen, ohne die übrigen anzufassen. */
export function merkeEntwurf(placeId, slug, dir = landingPagesDir) {
  if (!placeId) return ladeManifest(dir);
  const manifest = ladeManifest(dir);
  manifest[placeId] = { ...(manifest[placeId]?.slug === slug ? manifest[placeId] : {}), slug };
  return schreibeManifest(manifest, dir);
}

/**
 * Hält fest, dass ein Entwurf gerade nach docs/ veröffentlicht wurde – mit
 * welcher Engine-Fassung und welchem Archetyp. Nur das macht später sichtbar,
 * welche Kundenseiten noch auf dem alten Stand stehen.
 */
export function merkeVeroeffentlichung(
  { placeId, slug, archetyp = "", engineVersion = ENGINE_VERSION, zeitpunkt = new Date().toISOString() },
  dir = landingPagesDir,
) {
  if (!placeId || !slug) return ladeManifest(dir);
  const manifest = ladeManifest(dir);
  manifest[placeId] = {
    ...(manifest[placeId] ?? {}),
    slug,
    engineVersion,
    archetyp,
    veroeffentlichtAm: zeitpunkt,
  };
  return schreibeManifest(manifest, dir);
}
