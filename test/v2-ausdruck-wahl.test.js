import { test } from "node:test";
import assert from "node:assert/strict";
import { ausdruckFuerSlug } from "../v2/build/ausdruck.js";

test("Ausdruck-Wahl: versionierte Zuordnung je Slug, Unbekanntes wird ignoriert", () => {
  assert.equal(ausdruckFuerSlug("beispiel-bayerisch"), "gesellig");
  assert.equal(ausdruckFuerSlug("beispiel-italienisch"), "gesellig");
  assert.equal(ausdruckFuerSlug("beispiel-gibt-es-nicht"), null, "ohne Eintrag keine ausdrückliche Wahl (der Standard kommt aus ausdruckZumBauen)");
  assert.equal(ausdruckFuerSlug("_hinweis"), null);
  assert.equal(ausdruckFuerSlug("x", "/gibt/es/nicht.json"), null);
});

import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ausdruckZumBauen, speichereAusdruckWahl, STANDARD_JE_KUECHE } from "../v2/build/ausdruck.js";

function wegwerfDatei(inhalt) {
  const ordner = mkdtempSync(path.join(tmpdir(), "ausdruck-wahl-"));
  const datei = path.join(ordner, "wahl.json");
  writeFileSync(datei, JSON.stringify(inhalt));
  return { datei, weg: () => rmSync(ordner, { recursive: true, force: true }) };
}

test("AP11: ohne Wahl gilt die Standard-Zuordnung der Küche, eine Wahl oder 'aus' geht vor", () => {
  const { datei, weg } = wegwerfDatei({ "haus-a": "kino", "haus-b": "aus", "haus-c": { ausdruck: "editorial", stimmung: "teehaus" } });
  try {
    assert.deepEqual(ausdruckZumBauen("haus-x", "italienisch", datei), { ausdruck: "gesellig", quelle: "standard", vorschlag: "gesellig" });
    assert.deepEqual(ausdruckZumBauen("haus-a", "italienisch", datei), { ausdruck: "kino", quelle: "gewaehlt", vorschlag: "gesellig" });
    assert.deepEqual(ausdruckZumBauen("haus-b", "tuerkisch", datei), { ausdruck: null, quelle: "aus", vorschlag: "handwerk" });
    assert.equal(ausdruckZumBauen("haus-c", "chinesisch", datei).ausdruck, "editorial");
    assert.deepEqual(ausdruckZumBauen("haus-x", "unbekannt", datei), { ausdruck: null, quelle: "keiner", vorschlag: null });
  } finally {
    weg();
  }
});

test("AP11: alle 12 Küchen haben einen Standard, kino ist nie automatisch", () => {
  assert.equal(Object.keys(STANDARD_JE_KUECHE).length, 12);
  assert.ok(!Object.values(STANDARD_JE_KUECHE).includes("kino"));
});

test("AP11: speichereAusdruckWahl setzt, entfernt und behält eine gewählte Farbwelt", () => {
  const { datei, weg } = wegwerfDatei({ _hinweis: "x", "haus-c": { ausdruck: "editorial", stimmung: "teehaus" } });
  try {
    speichereAusdruckWahl("haus-a", "handwerk", datei);
    speichereAusdruckWahl("haus-c", "kino", datei);
    speichereAusdruckWahl("haus-d", "aus", datei);
    let wahl = JSON.parse(readFileSync(datei, "utf-8"));
    assert.equal(wahl["haus-a"], "handwerk");
    assert.deepEqual(wahl["haus-c"], { ausdruck: "kino", stimmung: "teehaus" });
    assert.equal(wahl["haus-d"], "aus");
    assert.equal(wahl._hinweis, "x");
    speichereAusdruckWahl("haus-a", "", datei);
    speichereAusdruckWahl("haus-c", "", datei);
    wahl = JSON.parse(readFileSync(datei, "utf-8"));
    assert.equal(wahl["haus-a"], undefined, "leer = zurück zum Standard");
    assert.deepEqual(wahl["haus-c"], { stimmung: "teehaus" });
    assert.throws(() => speichereAusdruckWahl("haus-a", "barock", datei), /Unbekannter Ausdruck/);
    assert.throws(() => speichereAusdruckWahl("_hinweis", "kino", datei), /Ungültige Seite/);
  } finally {
    weg();
  }
});
