#!/usr/bin/env node
// ENTWICKLERWERKZEUG – nicht Teil des Generators, wird von keiner Seite
// eingebunden.
//
// Zwei Prüfungen:
//
// 1. Die abgeleitete Akzentfarbe (accentBold, siehe stimmungen.js +
//    colorMath.boldAccent) gegen den eigenen Grund. Das war der ursprüngliche
//    Zweck dieses Skripts.
// 2. Die tatsächlichen Farbanwendungen der Seite: Welcher Token trägt an
//    welcher Stelle Text, und auf welchem Grund steht er dort? Die
//    Basispalette zu prüfen reicht nicht – 4.5:1 gilt für die Paarung, nicht
//    für die Farbe.
//
// Aufruf:  node scripts/colorSwatchCheck.mjs [--alle]
// Ohne --alle werden nur die Durchfaller gelistet.
// Beendet mit Code 1, sobald eine Prüfung mit Rang "muss" durchfällt.

import { STIMMUNGEN } from "../src/stimmungen.js";
import { contrastRatio, mixColors } from "../src/colorMath.js";

const ZIEL = 4.5;
const ALLE = process.argv.includes("--alle");

const alle = Object.entries(STIMMUNGEN).flatMap(([cuisine, liste]) =>
  liste.map((s) => ({
    cuisine,
    ...s,
    // Der ungünstigste Grund im Hero: Tint mit 80 % Deckkraft über einem
    // hellen Foto. Kein Token der Palette, sondern das, was der Besucher
    // wirklich sieht.
    tintHell: mixColors(s.tint, "#ffffff", 0.8),
  })),
);

/**
 * Die Farbanwendungen der erzeugten Seite.
 *
 * rang "muss": Diese Paarung steht in jeder Seite und muss 4.5:1 erreichen.
 * rang "alt":  Eine Paarung, die es nur noch in Archetypen ohne Handschrift
 *              gibt. Sie ist bekannt und in docs-intern/design-tokens/
 *              festgehalten; die Handschrift ersetzt sie durch accentBold.
 *              Sie zählt hier nicht als Fehlschlag, wird aber gezählt.
 */
const ANWENDUNGEN = [
  { rang: "muss", was: "Fließtext", vorn: "ink", hinten: "bg" },
  { rang: "muss", was: "Fließtext auf Fläche", vorn: "ink", hinten: "surface" },
  { rang: "muss", was: "Fließtext auf Sektionsfläche", vorn: "ink", hinten: "soft" },
  { rang: "muss", was: "Nebentext", vorn: "inkSoft", hinten: "bg" },
  { rang: "muss", was: "Nebentext auf Fläche", vorn: "inkSoft", hinten: "surface" },
  { rang: "muss", was: "Nebentext auf Sektionsfläche", vorn: "inkSoft", hinten: "soft" },
  { rang: "muss", was: "Knopfschrift auf Akzentfläche", vorn: "onAccent", hinten: "accent" },
  { rang: "muss", was: "Knopfschrift auf dunklem Akzent", vorn: "onAccent", hinten: "accentDark" },
  // Mit Handschrift trägt accentBold jeden Text, der vorher accent trug:
  // Eyebrow, Preis der Stimmen-Note, Kontaktlink, Vorbestellen-Knopf.
  { rang: "muss", was: "Akzenttext (Handschrift)", vorn: "accentLesbar", hinten: "bg" },
  { rang: "muss", was: "Akzenttext auf Fläche (Handschrift)", vorn: "accentLesbar", hinten: "surface" },
  { rang: "muss", was: "Akzenttext auf Sektionsfläche (Handschrift)", vorn: "accentLesbar", hinten: "soft" },
  // Gold trägt das "Platzhalter"-Abzeichen (in jeder Seite), die Sterne und
  // die Kicker-Zeile (nur mit Handschrift).
  { rang: "muss", was: "Goldtext auf hellem Grund", vorn: "goldDunkel", hinten: "bg" },
  { rang: "muss", was: "Goldtext auf Fläche", vorn: "goldDunkel", hinten: "surface" },
  { rang: "muss", was: "Goldtext auf Sektionsfläche", vorn: "goldDunkel", hinten: "soft" },
  { rang: "muss", was: "Goldtext im Hero", vorn: "goldAufTint", hinten: "tint" },
  { rang: "muss", was: "Goldtext im Hero über hellem Foto", vorn: "goldAufTint", hinten: "tintHell" },
  { rang: "alt", was: "Gold ohne Handschrift", vorn: "gold", hinten: "bg" },
  { rang: "alt", was: "Gold ohne Handschrift auf Sektionsfläche", vorn: "gold", hinten: "soft" },
  // Das Magazin nutzt accentBold für große Flächen und große Schrift; dort
  // gilt die Schwelle für große Schrift (3:1). Der Vollständigkeit halber
  // steht der Wert gegen bg trotzdem auf 4.5:1.
  { rang: "muss", was: "Magazin-Akzent", vorn: "accentBold", hinten: "bg" },
  // Ohne Handschrift steht dort weiterhin accent. Bekannter Mangel.
  { rang: "alt", was: "Akzenttext (ohne Handschrift)", vorn: "accent", hinten: "bg" },
  { rang: "alt", was: "Akzenttext auf Fläche (ohne Handschrift)", vorn: "accent", hinten: "surface" },
  { rang: "alt", was: "Akzenttext auf Sektionsfläche (ohne Handschrift)", vorn: "accent", hinten: "soft" },
];

const durchgefallen = [];
const bekannt = [];

console.log("1) Abgeleiteter Akzent gegen den eigenen Grund\n");
for (const s of alle) {
  const vorher = contrastRatio(s.accent, s.bg);
  const nachher = contrastRatio(s.accentBold, s.bg);
  const status = nachher >= ZIEL ? "ok  " : "FEHL";
  if (ALLE || nachher < ZIEL) {
    console.log(
      `${status} ${s.cuisine}/${s.id}`.padEnd(46) +
        `${s.accent} ${vorher.toFixed(2)}:1  ->  ${s.accentBold} ${nachher.toFixed(2)}:1`,
    );
  }
  if (nachher < ZIEL) durchgefallen.push(`${s.cuisine}/${s.id}: accentBold ${nachher.toFixed(2)}:1`);
}
console.log(`\n${alle.length} Stimmungen geprüft, Ziel ${ZIEL}:1 gegen den eigenen Grund.`);

console.log("\n2) Tatsächliche Farbanwendungen\n");
let geprueft = 0;
for (const s of alle) {
  for (const { rang, was, vorn, hinten } of ANWENDUNGEN) {
    const wert = contrastRatio(s[vorn], s[hinten]);
    geprueft += 1;
    const ok = wert >= ZIEL;
    if (ALLE || !ok) {
      console.log(
        `${ok ? "ok  " : rang === "muss" ? "FEHL" : "alt "} ${s.cuisine}/${s.id}`.padEnd(46) +
          `${was}: ${vorn} auf ${hinten} = ${wert.toFixed(2)}:1`,
      );
    }
    if (!ok) {
      const zeile = `${s.cuisine}/${s.id}: ${was} (${vorn} auf ${hinten}) ${wert.toFixed(2)}:1`;
      if (rang === "muss") durchgefallen.push(zeile);
      else bekannt.push(zeile);
    }
  }
}
console.log(`\n${geprueft} Paarungen geprüft, Ziel ${ZIEL}:1.`);

if (bekannt.length > 0) {
  console.log(
    `\n${bekannt.length} bekannte Altlast(en) in Archetypen ohne Handschrift ` +
      `(siehe docs-intern/design-tokens/): accent trägt dort noch selbst Text.`,
  );
  if (ALLE) for (const zeile of bekannt) console.log(`  ${zeile}`);
}

if (durchgefallen.length > 0) {
  console.error(`\n${durchgefallen.length} durchgefallen:`);
  for (const zeile of durchgefallen) console.error(`  ${zeile}`);
  process.exit(1);
}

console.log("\nAlle Pflichtprüfungen bestanden.");
