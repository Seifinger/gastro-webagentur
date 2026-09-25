import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { erstelleSicherung, pruefeSicherung } from "../scripts/sicherung.mjs";

// Sicherung und Wiederherstellungsprobe mit synthetischen Daten in einem
// Temp-Ordner – das echte data/ wird nicht angefasst.

function testWurzel() {
  const wurzel = mkdtempSync(path.join(tmpdir(), "sicherung-test-"));
  mkdirSync(path.join(wurzel, "data", "betrieb"), { recursive: true });
  mkdirSync(path.join(wurzel, "data", "kunden", "k-abcdefghij"), { recursive: true });
  writeFileSync(path.join(wurzel, "data", "betrieb", "testhaus.json"), JSON.stringify({ reservierungen: [{ id: "r1", name: "Erika Beispiel" }], bestellungen: [{ id: "b1" }, { id: "b2" }], rechtsdokumente: [] }));
  writeFileSync(path.join(wurzel, "data", "betrieb", ".gast-status-geheimnis"), "synthetisches-geheimnis-fuer-den-test-0123456789\n");
  writeFileSync(path.join(wurzel, "data", "kunden", "k-abcdefghij", "projekt.json"), JSON.stringify({ revision: 3 }));
  return wurzel;
}

test("Sicherung enthält Betriebe und Status-Link-Geheimnis, Probe zählt richtig", () => {
  const wurzel = testWurzel();
  try {
    const s = erstelleSicherung({ wurzel, ziel: path.join(wurzel, "sicherung"), jetzt: new Date("2026-09-25T10:00:00Z") });
    assert.deepEqual(s.pfade, ["data/betrieb", "data/kunden"]);
    if (process.platform !== "win32") assert.equal(statSync(s.datei).mode & 0o777, 0o600, "nur für den Besitzer lesbar");
    const p = pruefeSicherung(s.datei);
    assert.equal(p.ok, true);
    assert.deepEqual(p.betriebe.testhaus, { reservierungen: 1, bestellungen: 2, rechtsdokumente: 0 });
    assert.equal(p.statusLinkGeheimnis, true);
    assert.equal(p.jsonDateien, 2);
  } finally {
    rmSync(wurzel, { recursive: true, force: true });
  }
});

test("Probe erkennt eine beschädigte Datei im Archiv", () => {
  const wurzel = testWurzel();
  try {
    writeFileSync(path.join(wurzel, "data", "betrieb", "kaputt.json"), '{"reservierungen": [');
    const s = erstelleSicherung({ wurzel, ziel: path.join(wurzel, "sicherung") });
    const p = pruefeSicherung(s.datei);
    assert.equal(p.ok, false);
    assert.match(p.fehler.join("\n"), /kaputt\.json: kein gültiges JSON/);
  } finally {
    rmSync(wurzel, { recursive: true, force: true });
  }
});

test("ohne Laufzeitdaten gibt es eine klare Meldung statt eines leeren Archivs", () => {
  const leer = mkdtempSync(path.join(tmpdir(), "sicherung-leer-"));
  try {
    assert.throws(() => erstelleSicherung({ wurzel: leer, ziel: path.join(leer, "s") }), /nichts zu sichern/);
  } finally {
    rmSync(leer, { recursive: true, force: true });
  }
});

test("Sicherungen im Repo-Ordner sind gitignoriert", () => {
  const wurzel = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
  assert.doesNotThrow(() => execFileSync("git", ["check-ignore", "-q", "--no-index", "data/sicherung/gastro-sicherung-x.tar.gz"], { cwd: wurzel }));
});
