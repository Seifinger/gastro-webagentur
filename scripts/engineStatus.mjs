// npm run engine-status
//
// Listet alle veröffentlichten Entwürfe unter docs/ mit der Engine-Fassung,
// mit der sie zuletzt gebaut wurden. Damit sieht der Betreiber auf einen
// Blick, welche Kundenseiten noch auf dem Stand vor dem Umbau stehen und für
// eine Auffrischung in Frage kommen.
//
// Quelle der Wahrheit ist die veröffentlichte Seite selbst (der Marker im
// <head>), nicht das Manifest: docs/ liegt im Repository, das Manifest unter
// data/ nicht. Das Manifest liefert nur die Ergänzungen – Lokalname und
// Datum der letzten Veröffentlichung.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { docsDir } from "../src/config.js";
import { ENGINE_VERSION, LEGACY_ENGINE_VERSION, leseEngineVersion, leseEngineArchetyp } from "../src/engineVersion.js";
import { ladeManifest, eintragFuerSlug } from "../src/entwurfsManifest.js";

function veroeffentlichteSlugs() {
  if (!existsSync(docsDir)) return [];
  return readdirSync(docsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "assets")
    .map((e) => e.name)
    .filter((slug) => existsSync(path.join(docsDir, slug, "index.html")))
    .sort();
}

export function sammleStatus({ manifest = ladeManifest(), slugs = veroeffentlichteSlugs() } = {}) {
  return slugs.map((slug) => {
    const html = readFileSync(path.join(docsDir, slug, "index.html"), "utf-8");
    const eintrag = eintragFuerSlug(manifest, slug) ?? {};
    const version = leseEngineVersion(html);
    return {
      slug,
      version,
      // Vor dem Umbau stand der Archetyp nirgends in der Seite. Steht er im
      // Manifest, stammt er von genau dieser Veröffentlichung.
      archetyp: leseEngineArchetyp(html) ?? eintrag.archetyp ?? "?",
      veroeffentlichtAm: eintrag.veroeffentlichtAm ?? "",
      demo: slug.startsWith("beispiel-"),
    };
  });
}

function spalte(wert, breite) {
  const text = String(wert);
  return text.length >= breite ? text : text + " ".repeat(breite - text.length);
}

export function formatiereTabelle(zeilen) {
  const kopf = ["Entwurf", "Engine", "Archetyp", "Zuletzt veröffentlicht"];
  const daten = zeilen.map((z) => [
    z.slug,
    z.version === LEGACY_ENGINE_VERSION ? `${z.version} (alt)` : String(z.version),
    z.archetyp,
    z.veroeffentlichtAm ? z.veroeffentlichtAm.slice(0, 10) : "–",
  ]);

  const breiten = kopf.map((_, i) =>
    Math.max(kopf[i].length, ...daten.map((zeile) => zeile[i].length), 0),
  );

  const linie = breiten.map((b) => "-".repeat(b)).join("  ");
  const zeilenText = daten.map((zeile) => zeile.map((w, i) => spalte(w, breiten[i])).join("  ").trimEnd());

  return [kopf.map((w, i) => spalte(w, breiten[i])).join("  ").trimEnd(), linie, ...zeilenText].join("\n");
}

function run() {
  const zeilen = sammleStatus();
  if (zeilen.length === 0) {
    console.log("\nUnter docs/ liegt noch kein veröffentlichter Entwurf.\n");
    return;
  }

  // Die alten zuerst: Das ist die Arbeitsliste.
  zeilen.sort((a, b) => a.version - b.version || a.slug.localeCompare(b.slug));

  const alt = zeilen.filter((z) => z.version < ENGINE_VERSION);
  const aktuell = zeilen.length - alt.length;

  console.log(`\nEngine-Stand der veröffentlichten Entwürfe (aktuelle Fassung: ${ENGINE_VERSION})\n`);
  console.log(formatiereTabelle(zeilen));
  console.log(
    `\n${zeilen.length} Entwürfe – ${aktuell} auf Fassung ${ENGINE_VERSION}, ${alt.length} noch auf einer älteren.`,
  );
  if (alt.length > 0) {
    console.log("\nKandidaten für eine Auffrischung (einzeln, erst nach Blick in die Vorschau):");
    for (const z of alt.slice(0, 10)) {
      console.log(`   npm run preview -- --only ${z.slug}`);
    }
    if (alt.length > 10) console.log(`   ... und ${alt.length - 10} weitere.`);
    console.log("\nDanach: npm run publish-site -- --only <slug>\n");
  } else {
    console.log("");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) run();
