import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { richteTestLeadsEin } from "./hilfen/testLead.js";
import { KUECHEN } from "../src/cuisineOverrides.js";
import { STANDARD_JE_KUECHE } from "../v2/build/ausdruck.js";
import {
  demoEinstellungen,
  speichereDemoEinstellungen,
  farbschemataFuer,
  vorlageFuer,
  setzeDemoStatus,
} from "../src/demoEinstellungen.js";
import { loadLeadEdits } from "../src/leadEdits.js";

const LEAD = { slug: "__test-wirtshaus-linde", placeId: "ChIJtestLinde01", name: "Gasthof Zur Linde", adresse: "Stadtplatz 3, 84453 Mühldorf am Inn, Deutschland", ort: "Mühldorf am Inn", rating: 4.4, anzahlBewertungen: 321 };
let umgebung;
before(() => {
  umgebung = richteTestLeadsEin([LEAD]);
});
after(() => umgebung.aufraeumen());

test("Küchenzuordnung → richtige neue Vorlage (Standard je Küche)", () => {
  for (const kueche of KUECHEN) {
    const v = vorlageFuer(kueche);
    assert.equal(v.ausdruck, STANDARD_JE_KUECHE[kueche], kueche);
    assert.equal(v.id, `${kueche}/${STANDARD_JE_KUECHE[kueche]}`);
  }
  assert.equal(vorlageFuer("bayerisch", "kino").ausdruck, "kino");
  assert.equal(vorlageFuer("bayerisch", "unsinn").ausdruck, "gesellig");
});

test("pro Küche genau drei gültige Farbschemata (traditionell, abend, hell)", () => {
  for (const kueche of KUECHEN) {
    const f = farbschemataFuer(kueche);
    assert.equal(f.length, 3, kueche);
    assert.deepEqual(f.map((x) => x.archetyp).sort(), ["abend", "hell", "traditionell"]);
    assert.equal(new Set(f.map((x) => x.id)).size, 3);
  }
});

test("demoEinstellungen: Lead, Küche, Vorlage, Farbschema, Slogan-Standard, unbestätigte Google-Angaben", () => {
  const d = demoEinstellungen(LEAD.slug);
  assert.equal(d.placeId, LEAD.placeId);
  assert.equal(d.kueche, "bayerisch");
  assert.equal(d.vorlage.id, "bayerisch/gesellig");
  assert.equal(d.farbschemata.length, 3);
  assert.ok(d.farbschemata.some((f) => f.id === d.farbschema.id));
  assert.equal(d.slogan.wert, "");
  assert.equal(d.slogan.standard, "Einkehren in Mühldorf am Inn");
  assert.equal(d.name.wert, "Gasthof Zur Linde");
  assert.equal(d.name.bestaetigt, false);
  assert.match(d.name.quelle, /Google Places/);
  assert.match(d.googleMapsUrl, /query_place_id=ChIJtestLinde01/);
  assert.equal(demoEinstellungen("__gibt-es-nicht"), null);
});

test("Slogan-Override und Fallback bei leerem Feld", () => {
  let d = speichereDemoEinstellungen(LEAD.slug, { slogan: "  Wo Mühldorf   zu Mittag isst  " });
  assert.equal(d.slogan.wert, "Wo Mühldorf zu Mittag isst");
  assert.equal(d.slogan.manuell, true);
  assert.equal(loadLeadEdits(LEAD.slug).texte.slogan, "Wo Mühldorf zu Mittag isst");
  d = speichereDemoEinstellungen(LEAD.slug, { slogan: "" });
  assert.equal(d.slogan.wert, "");
  assert.equal(d.slogan.manuell, false);
  assert.equal(loadLeadEdits(LEAD.slug).texte, undefined);
  assert.throws(() => speichereDemoEinstellungen(LEAD.slug, { slogan: "x".repeat(61) }), /höchstens 60/);
  assert.throws(() => speichereDemoEinstellungen(LEAD.slug, { slogan: "<script>" }), /spitzen Klammern/);
});

test("Farbschema nur aus den drei der Küche; Küchenwechsel lässt ein unpassendes Schema verfallen", () => {
  let d = speichereDemoEinstellungen(LEAD.slug, { farbschema: "kellerstube" });
  assert.equal(d.farbschema.id, "kellerstube");
  assert.equal(d.farbschema.manuell, true);
  assert.throws(() => speichereDemoEinstellungen(LEAD.slug, { farbschema: "trattoria" }), /keins der drei Farbschemata/);
  assert.throws(() => speichereDemoEinstellungen(LEAD.slug, { farbschema: "wirtshaus-editorial" }), /keins der drei/);
  d = speichereDemoEinstellungen(LEAD.slug, { kueche: "italienisch" });
  assert.equal(d.kueche, "italienisch");
  assert.equal(d.vorlage.id, "italienisch/gesellig");
  assert.equal(d.farbschema.manuell, false, "Kellerstube passt nicht zu Italienisch");
  d = speichereDemoEinstellungen(LEAD.slug, { kueche: "italienisch", farbschema: "costiera" });
  assert.equal(d.farbschema.id, "costiera");
  d = speichereDemoEinstellungen(LEAD.slug, { kueche: "", farbschema: "" });
  assert.equal(d.kueche, "bayerisch", "leer = automatische Erkennung");
});

test("Name/Adresse bestätigen: Quelle und Zeitpunkt werden festgehalten, CSV bleibt unberührt", () => {
  const jetzt = new Date("2026-09-24T12:00:00Z");
  let d = speichereDemoEinstellungen(LEAD.slug, { name: { wert: "Gasthof zur Linde", notiz: "Schild am Haus" }, adresse: { wert: "Stadtplatz 3, 84453 Mühldorf am Inn" } }, { jetzt });
  assert.equal(d.name.wert, "Gasthof zur Linde");
  assert.equal(d.name.bestaetigt, true);
  assert.equal(d.name.quelle, "manuell bestätigt");
  assert.equal(d.name.bestaetigtAm, jetzt.toISOString());
  assert.equal(d.name.notiz, "Schild am Haus");
  assert.equal(d.lead.name, "Gasthof Zur Linde", "der Google-Name im CSV bleibt, wie er ist");
  d = speichereDemoEinstellungen(LEAD.slug, { adresse: null });
  assert.equal(d.adresse.bestaetigt, false);
  assert.throws(() => speichereDemoEinstellungen(LEAD.slug, { name: { wert: "  " } }), /nicht leer/);
});

test("Vorlage abweichend wählen und zurücksetzen; wird in lead-edits gespeichert, nicht im öffentlichen Repo", () => {
  let d = speichereDemoEinstellungen(LEAD.slug, { vorlage: "handwerk" });
  assert.equal(d.vorlage.ausdruck, "handwerk");
  assert.equal(d.vorlage.quelle, "gewaehlt");
  assert.equal(loadLeadEdits(LEAD.slug).demo.vorlage, "handwerk");
  assert.throws(() => speichereDemoEinstellungen(LEAD.slug, { vorlage: "barock" }), /Unbekannte Vorlage/);
  d = speichereDemoEinstellungen(LEAD.slug, { vorlage: "" });
  assert.equal(d.vorlage.quelle, "standard");
});

test("Speichern setzt den Status 'gespeichert', lässt aber die nachweislich öffentliche Fassung stehen", () => {
  setzeDemoStatus(LEAD.placeId, { zustand: "online", online: { url: "https://x/y/", buildId: "b1", zeitpunkt: "t" } });
  const d = speichereDemoEinstellungen(LEAD.slug, { slogan: "Neu" });
  assert.equal(d.status.zustand, "gespeichert");
  assert.equal(d.status.online.buildId, "b1");
});

test("jede Änderung landet im Verlauf der lead-edits (versioniert, nachvollziehbar)", () => {
  const vorher = (loadLeadEdits(LEAD.slug).verlauf ?? []).length;
  speichereDemoEinstellungen(LEAD.slug, { slogan: "Noch neuer" });
  const edits = loadLeadEdits(LEAD.slug);
  assert.equal(edits.verlauf.length, vorher + 1);
  assert.equal(edits.verlauf.at(-1).vorher.texte.slogan, "Neu");
});
