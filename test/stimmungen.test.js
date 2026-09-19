import test from "node:test";
import assert from "node:assert/strict";
import {
  STIMMUNGEN,
  ARCHETYPEN,
  GRUND_ARCHETYPEN,
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

test("jede Küche des Katalogs hat drei Grundstimmungen plus die Editorial-Welt", () => {
  // Die Speisekarte kennt die Küchen – ohne passende Stimmung fiele ein Lokal
  // stumm auf eine fremde Gestaltungswelt zurück.
  assert.deepEqual(Object.keys(STIMMUNGEN).sort(), Object.keys(MENUS).sort());

  for (const [cuisine, liste] of Object.entries(STIMMUNGEN)) {
    assert.equal(liste.length, 4, `${cuisine} hat ${liste.length} Stimmungen`);
    const grund = liste.filter((s) => GRUND_ARCHETYPEN.includes(s.archetyp));
    assert.equal(grund.length, 3, `${cuisine} hat nicht drei ausgearbeitete Grundstimmungen`);
  }
});

test("jede Küche deckt alle vier Archetypen genau einmal ab", () => {
  for (const [cuisine, liste] of Object.entries(STIMMUNGEN)) {
    assert.deepEqual(
      liste.map((s) => s.archetyp).sort(),
      [...ARCHETYPEN].sort(),
      `${cuisine} deckt die Archetypen nicht ab`,
    );
  }
});

test("die Editorial-Welt erbt die Farben der traditionellen Stimmung", () => {
  // Editorial ist eine Frage der Form, nicht der Farbe: Die Identität der
  // Küche darf sich nicht ändern, nur weil das Layout größer auftritt.
  for (const [cuisine, liste] of Object.entries(STIMMUNGEN)) {
    const editorial = liste.find((s) => s.archetyp === "editorial");
    const basis = liste.find((s) => s.archetyp === "traditionell");
    for (const feld of ["bg", "surface", "ink", "accent", "accentDark", "onAccent", "gold", "tint"]) {
      assert.equal(editorial[feld], basis[feld], `${cuisine}: ${feld} weicht ab`);
    }
  }
});

test("jede Stimmung bringt einen kräftigeren Akzent mit, der lesbar bleibt", () => {
  // accentBold wird beim Modul-Load aus accent abgeleitet (colorMath.boldAccent).
  // Ein zu blasser Ton fiele sonst erst auf der fertigen Seite auf.
  const probleme = [];
  for (const s of alle) {
    assert.match(s.accentBold, /^#[0-9a-f]{6}$/, `${s.cuisine}/${s.id}: accentBold fehlt`);
    const wert = kontrast(s.accentBold, s.bg);
    if (wert < 4.5) probleme.push(`${s.cuisine}/${s.id}: ${wert.toFixed(2)} < 4.5`);
  }
  assert.deepEqual(probleme, []);
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

test("die drei Grundstimmungen einer Küche teilen den Bildvorrat ohne Überschneidung", () => {
  for (const [cuisine, liste] of Object.entries(STIMMUNGEN)) {
    // Editorial bleibt außen vor: Das Magazin-Layout lebt vom Bild und greift
    // bewusst quer über alle drei Paare (je ein Bild daraus).
    const grund = liste.filter((s) => GRUND_ARCHETYPEN.includes(s.archetyp));
    const belegt = grund.flatMap((s) => s.bilder).sort((a, b) => a - b);
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

test("ohne Auswahl bleibt der Seed bei den drei Grundstimmungen", () => {
  const getroffen = new Set();
  for (let seed = 0; seed < 9; seed += 1) {
    const s = resolveStimmung("griechisch", { seed });
    assert.ok(STIMMUNGEN.griechisch.includes(s));
    getroffen.add(s.id);
  }

  // Über neun Seeds müssen alle drei drankommen, sonst wäre die Streuung kaputt.
  // Editorial darf nicht dabei sein: Das ist eine Entscheidung des Wirts.
  assert.equal(getroffen.size, 3);
  assert.ok(!getroffen.has("taverne-am-hafen-editorial"));
});

test("eine gewählte Stimmung schlägt den Seed", () => {
  const s = resolveStimmung("griechisch", { id: "olivenhain", seed: 0 });
  assert.equal(s.id, "olivenhain");
});

test("eine unbekannte Kennung bricht die Seite nicht, sondern fällt auf den Seed zurück", () => {
  const s = resolveStimmung("griechisch", { id: "gibt-es-nicht", seed: 1 });
  assert.equal(s, STIMMUNGEN.griechisch[1]);
});

test("die Editorial-Welt lässt sich ausdrücklich wählen", () => {
  const s = resolveStimmung("griechisch", { id: "taverne-am-hafen-editorial", seed: 0 });
  assert.equal(s.archetyp, "editorial");
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
    assert.equal(eintrag.stimmungen.length, 4);
    for (const s of eintrag.stimmungen) {
      assert.ok(s.id && s.label && s.archetyp && s.archetypLabel);
    }
  }
});
