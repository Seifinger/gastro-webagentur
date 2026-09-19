#!/usr/bin/env node
// ENTWICKLERWERKZEUG – nicht Teil des Generators, wird von keiner Seite
// eingebunden. Schreibt für jede Küche und jede ihrer vier Stimmungen genau
// eine Seite in einen Zielordner. Grundlage für den Byte-Diff-Regressionstest:
//
//   node scripts/archetypSnapshot.mjs /tmp/vorher
//   ... Änderung an einem Archetyp ...
//   node scripts/archetypSnapshot.mjs /tmp/nachher
//   diff -rq /tmp/vorher /tmp/nachher
//
// Was dabei gleich bleiben muss, sagt die Aufgabe: Wird an einem Archetyp
// gearbeitet, dürfen die Dateien der übrigen drei sich um kein Byte ändern.
//
// Der Lead ist bewusst synthetisch und fest verdrahtet – derselbe Aufruf ergibt
// zweimal dasselbe Byte. Es wird nichts geladen (keine Bilder, keine
// Schriften), die Seiten zeigen auf ../assets wie ein lokaler Lauf.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildLandingPage, themeForLead } from "../src/landingPageGenerator.js";
import { MENUS, menuForCuisine } from "../src/menuCatalog.js";
import { stimmungenFuer } from "../src/stimmungen.js";

// Ein Lead je Küche, damit Highlights und Bildauswahl (beide hängen am Hash der
// placeId) über alle Läufe hinweg identisch bleiben.
function leadFuer(cuisine) {
  return {
    placeId: `snapshot-${cuisine}`,
    name: `Beispielhaus ${cuisine}`,
    ort: "Mühldorf am Inn",
    adresse: "Marktplatz 1, 84453 Mühldorf am Inn",
    telefon: "08631 123456",
    rating: 4.6,
    anzahlBewertungen: 312,
  };
}

export function schreibeSnapshot(zielordner) {
  rmSync(zielordner, { recursive: true, force: true });
  mkdirSync(zielordner, { recursive: true });

  let anzahl = 0;
  for (const cuisine of Object.keys(MENUS)) {
    const lead = leadFuer(cuisine);
    for (const stimmung of stimmungenFuer(cuisine)) {
      const html = buildLandingPage(lead, {
        menu: menuForCuisine(cuisine),
        gestaltung: themeForLead(lead, cuisine, stimmung.id),
      });
      writeFileSync(path.join(zielordner, `${stimmung.archetyp}__${cuisine}.html`), html, "utf-8");
      anzahl += 1;
    }
  }
  return anzahl;
}

const zielordner = process.argv[2];
if (!zielordner) {
  console.error("Aufruf: node scripts/archetypSnapshot.mjs <zielordner>");
  process.exit(1);
}

const anzahl = schreibeSnapshot(path.resolve(zielordner));
console.log(`${anzahl} Seiten nach ${zielordner} geschrieben.`);
