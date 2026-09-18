import test from "node:test";
import assert from "node:assert/strict";
import {
  STIMMUNGEN,
  ARCHETYPEN,
  stimmungenFuer,
  stimmungsAuswahl,
  istStimmungsId,
  resolveStimmung,
} from "../src/stimmungen.js";
import { MENUS } from "../src/menuCatalog.js";
import { HERO_IMAGES } from "../src/imageLibrary.js";

const alle = Object.entries(STIMMUNGEN).flatMap(([cuisine, liste]) =>
  liste.map((s) => ({ cuisine, ...s })),
);

test("jede Küche des Katalogs hat genau drei Stimmungen", () => {
  // Die Speisekarte kennt die Küchen – ohne passende Stimmung fiele ein Lokal
  // stumm auf eine fremde Gestaltungswelt zurück.
  assert.deepEqual(Object.keys(STIMMUNGEN).sort(), Object.keys(MENUS).sort());

  for (const [cuisine, liste] of Object.entries(STIMMUNGEN)) {
    assert.equal(liste.length, 3, `${cuisine} hat ${liste.length} Stimmungen`);
  }
});

test("jede Küche deckt alle drei Archetypen genau einmal ab", () => {
  for (const [cuisine, liste] of Object.entries(STIMMUNGEN)) {
    assert.deepEqual(
      liste.map((s) => s.archetyp).sort(),
      [...ARCHETYPEN].sort(),
      `${cuisine} deckt die Archetypen nicht ab`,
    );
  }
});

test("die Kennungen sind über alle Küchen hinweg eindeutig", () => {
  const ids = alle.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("jede Stimmung bringt alle Gestaltungswerte mit", () => {
  const pflicht = [
    "label", "display", "body", "displayTransform", "displayTracking", "radius",
    "bg", "surface", "ink", "inkSoft", "line", "soft",
    "accent", "accentDark", "onAccent", "gold", "tint", "tintRgb",
  ];

  for (const s of alle) {
    for (const feld of pflicht) {
      assert.ok(s[feld], `${s.cuisine}/${s.id}: ${feld} fehlt`);
    }
    assert.equal(typeof s.dark, "boolean");
  }
});

test("die drei Stimmungen einer Küche teilen den Bildvorrat ohne Überschneidung", () => {
  for (const [cuisine, liste] of Object.entries(STIMMUNGEN)) {
    const belegt = liste.flatMap((s) => s.bilder).sort((a, b) => a - b);
    assert.deepEqual(
      belegt,
      HERO_IMAGES[cuisine].map((_, i) => i),
      `${cuisine} teilt den Bildvorrat nicht sauber auf`,
    );
  }
});

/* ---------- Lesbarkeit ---------- */

function leuchtdichte(hex) {
  const kanaele = hex.replace("#", "").match(/../g).map((paar) => {
    const c = parseInt(paar, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * kanaele[0] + 0.7152 * kanaele[1] + 0.0722 * kanaele[2];
}

function kontrast(vordergrund, hintergrund) {
  const a = leuchtdichte(vordergrund);
  const b = leuchtdichte(hintergrund);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// 36 Farbwelten von Hand zu prüfen ist unzuverlässig, und ein zu blasser Knopf
// fällt erst auf, wenn der Wirt die Seite schon offen hat. Geprüft werden nur
// Paarungen, die auf der Seite wirklich vorkommen: Der Hero-Kicker etwa steht
// auf dem Tint-Overlay, nicht auf dem hellen Grund.
test("jede Stimmung ist lesbar", () => {
  const probleme = [];

  for (const s of alle) {
    const paarungen = [
      ["Fließtext auf Grund", s.ink, s.bg, 4.5],
      ["Fließtext auf Fläche", s.ink, s.surface, 4.5],
      ["Sekundärtext auf Grund", s.inkSoft, s.bg, 4.5],
      ["Knopfschrift auf Akzent", s.onAccent, s.accent, 4.5],
      ["Knopfschrift auf dunklem Akzent", s.onAccent, s.accentDark, 4.5],
      ["Akzent als Text", s.accent, s.bg, 3.0],
      ["Hero-Kicker auf Overlay", s.gold, s.tint, 4.5],
      ["Hero-Schrift auf Overlay", "#ffffff", s.tint, 4.5],
    ];

    for (const [was, vg, hg, mindestens] of paarungen) {
      const wert = kontrast(vg, hg);
      if (wert < mindestens) {
        probleme.push(`${s.cuisine}/${s.id}: ${was} ${wert.toFixed(2)} < ${mindestens}`);
      }
    }
  }

  assert.deepEqual(probleme, []);
});

/* ---------- Auflösung ---------- */

test("ohne Auswahl entscheidet der Seed, aber immer innerhalb der Küche", () => {
  const getroffen = new Set();
  for (let seed = 0; seed < 9; seed += 1) {
    const s = resolveStimmung("griechisch", { seed });
    assert.ok(STIMMUNGEN.griechisch.includes(s));
    getroffen.add(s.id);
  }

  // Über neun Seeds müssen alle drei drankommen, sonst wäre die Streuung kaputt.
  assert.equal(getroffen.size, 3);
});

test("eine gewählte Stimmung schlägt den Seed", () => {
  const s = resolveStimmung("griechisch", { id: "olivenhain", seed: 0 });
  assert.equal(s.id, "olivenhain");
});

test("eine unbekannte Kennung bricht die Seite nicht, sondern fällt auf den Seed zurück", () => {
  const s = resolveStimmung("griechisch", { id: "gibt-es-nicht", seed: 1 });
  assert.equal(s, STIMMUNGEN.griechisch[1]);
});

test("eine unbekannte Küche fällt auf Bayerisch zurück statt zu werfen", () => {
  assert.equal(stimmungenFuer("klingonisch"), STIMMUNGEN.bayerisch);
  assert.ok(resolveStimmung("klingonisch", { seed: 0 }).id);
});

test("istStimmungsId erkennt nur Stimmungen der eigenen Küche", () => {
  assert.equal(istStimmungsId("griechisch", "olivenhain"), true);
  // "trattoria" gibt es, aber bei Italienisch – für Griechisch wäre es falsch.
  assert.equal(istStimmungsId("griechisch", "trattoria"), false);
});

test("die Auswahl fürs Dashboard listet alle Küchen mit lesbaren Namen", () => {
  const auswahl = stimmungsAuswahl();

  assert.equal(auswahl.length, Object.keys(STIMMUNGEN).length);
  for (const eintrag of auswahl) {
    assert.equal(eintrag.stimmungen.length, 3);
    for (const s of eintrag.stimmungen) {
      assert.ok(s.id && s.label && s.archetyp && s.archetypLabel);
    }
  }
});
