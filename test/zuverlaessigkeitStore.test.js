import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  vermerkeNoShow,
  noShowAnzahl,
  warnhinweisNoetig,
  normalisiereTelefon,
} from "../src/zuverlaessigkeitStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLUG = "__test-zuverlaessigkeit";
const dateiPfad = path.join(__dirname, "..", "data", "zuverlaessigkeit", `${SLUG}.json`);

beforeEach(() => {
  rmSync(dateiPfad, { force: true });
});

after(() => {
  rmSync(dateiPfad, { force: true });
});

test("normalisiereTelefon vergleicht unabhängig von Schreibweise", () => {
  assert.equal(normalisiereTelefon("0170 123 45"), normalisiereTelefon("0170-123-45"));
  assert.equal(normalisiereTelefon("+49 170 12345"), "+4917012345");
});

test("eine frische Nummer hat null No-Shows", () => {
  assert.equal(noShowAnzahl(SLUG, "0170 111"), 0);
});

test("der Zähler erhöht sich mit jedem vermerkten No-Show", () => {
  vermerkeNoShow(SLUG, "0170 111");
  assert.equal(noShowAnzahl(SLUG, "0170 111"), 1);
  vermerkeNoShow(SLUG, "0170 111");
  assert.equal(noShowAnzahl(SLUG, "0170 111"), 2);
});

test("verschiedene Schreibweisen derselben Nummer zählen zusammen", () => {
  vermerkeNoShow(SLUG, "0170 111");
  vermerkeNoShow(SLUG, "0170-111");
  assert.equal(noShowAnzahl(SLUG, "0170111"), 2);
});

test("andere Nummern bleiben unberührt", () => {
  vermerkeNoShow(SLUG, "0170 111");
  assert.equal(noShowAnzahl(SLUG, "0170 222"), 0);
});

test("No-Shows älter als 90 Tage zählen nicht mehr mit", () => {
  const jetzt = new Date("2026-09-20T12:00:00Z");
  const vor100Tagen = new Date(jetzt.getTime() - 100 * 24 * 60 * 60 * 1000);
  const vor10Tagen = new Date(jetzt.getTime() - 10 * 24 * 60 * 60 * 1000);

  vermerkeNoShow(SLUG, "0170 111", vor100Tagen);
  vermerkeNoShow(SLUG, "0170 111", vor10Tagen);

  assert.equal(noShowAnzahl(SLUG, "0170 111", jetzt), 1);
});

test("warnhinweisNoetig greift erst ab der Schwelle", () => {
  vermerkeNoShow(SLUG, "0170 111");
  assert.equal(warnhinweisNoetig(SLUG, "0170 111", 2), false);
  vermerkeNoShow(SLUG, "0170 111");
  assert.equal(warnhinweisNoetig(SLUG, "0170 111", 2), true);
});
