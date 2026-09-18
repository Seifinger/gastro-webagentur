#!/usr/bin/env node
// ENTWICKLERWERKZEUG – nicht Teil des Generators, wird von keiner Seite
// eingebunden. Prüft die abgeleitete Akzentfarbe (accentBold, siehe
// stimmungen.js + colorMath.boldAccent) jeder Stimmung gegen ihren eigenen
// Grund und meldet jede, die unter WCAG AA (4.5:1) bleibt.
//
// Aufruf:  node scripts/colorSwatchCheck.mjs
// Beendet mit Code 1, sobald eine Stimmung durchfällt.

import { STIMMUNGEN } from "../src/stimmungen.js";
import { contrastRatio } from "../src/colorMath.js";

const ZIEL = 4.5;

const alle = Object.entries(STIMMUNGEN).flatMap(([cuisine, liste]) =>
  liste.map((s) => ({ cuisine, ...s })),
);

const durchgefallen = [];

for (const s of alle) {
  const vorher = contrastRatio(s.accent, s.bg);
  const nachher = contrastRatio(s.accentBold, s.bg);
  const status = nachher >= ZIEL ? "ok  " : "FEHL";
  console.log(
    `${status} ${s.cuisine}/${s.id}`.padEnd(46) +
      `${s.accent} ${vorher.toFixed(2)}:1  ->  ${s.accentBold} ${nachher.toFixed(2)}:1`,
  );
  if (nachher < ZIEL) durchgefallen.push(`${s.cuisine}/${s.id}: ${nachher.toFixed(2)}:1`);
}

console.log(`\n${alle.length} Stimmungen geprüft, Ziel ${ZIEL}:1 gegen den eigenen Grund.`);

if (durchgefallen.length > 0) {
  console.error(`\n${durchgefallen.length} durchgefallen:`);
  for (const zeile of durchgefallen) console.error(`  ${zeile}`);
  process.exit(1);
}

console.log("Alle bestanden.");
