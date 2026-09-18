import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  ladeResonanz,
  speichereResonanz,
  vermerkeAufruf,
  resonanzUebersicht,
  MAX_AUFRUFE,
  MAX_SEKUNDEN,
} from "../src/resonanzStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLUG = "test-resonanz";
const dateiPfad = path.join(__dirname, "..", "data", "resonanz", `${SLUG}.json`);

beforeEach(() => {
  rmSync(dateiPfad, { force: true });
});

after(() => {
  rmSync(dateiPfad, { force: true });
});

test("ohne Datei ist der Stand leer statt kaputt", () => {
  const stand = ladeResonanz(SLUG);

  assert.equal(stand.slug, SLUG);
  assert.equal(stand.ersterAufruf, null);
  assert.deepEqual(stand.aufrufe, []);
  assert.equal(resonanzUebersicht(SLUG).geoeffnet, false);
});

test("der erste Aufruf legt den Stand an", () => {
  vermerkeAufruf(SLUG, { besuch: randomUUID(), sekunden: 30 });

  const stand = ladeResonanz(SLUG);
  assert.equal(stand.aufrufe.length, 1);
  assert.equal(stand.aufrufe[0].sekunden, 30);
  assert.equal(stand.aufrufe[0].reservierungGesehen, false);
  assert.equal(stand.ersterAufruf, stand.aufrufe[0].zeitpunkt);
});

test("dasselbe Tab meldet sich zweimal und bleibt ein Besuch", () => {
  const besuch = randomUUID();
  vermerkeAufruf(SLUG, { besuch, sekunden: 0 });
  vermerkeAufruf(SLUG, { besuch, sekunden: 90, reservierungGesehen: true });

  const stand = ladeResonanz(SLUG);
  assert.equal(stand.aufrufe.length, 1);
  assert.equal(stand.aufrufe[0].sekunden, 90);
  assert.equal(stand.aufrufe[0].reservierungGesehen, true);
});

test("ein zweites Tab zählt als eigener Besuch", () => {
  vermerkeAufruf(SLUG, { besuch: randomUUID(), sekunden: 10 });
  vermerkeAufruf(SLUG, { besuch: randomUUID(), sekunden: 20 });

  assert.equal(resonanzUebersicht(SLUG).anzahl, 2);
});

test("ein einmal gesehenes Reservierungsfeld bleibt gesehen", () => {
  const besuch = randomUUID();
  vermerkeAufruf(SLUG, { besuch, reservierungGesehen: true });
  vermerkeAufruf(SLUG, { besuch, reservierungGesehen: false });

  assert.equal(ladeResonanz(SLUG).aufrufe[0].reservierungGesehen, true);
});

test("die Verweildauer wird auf Zehnerstufen gerundet und gedeckelt", () => {
  vermerkeAufruf(SLUG, { besuch: randomUUID(), sekunden: 34 });
  vermerkeAufruf(SLUG, { besuch: randomUUID(), sekunden: 99_999 });
  vermerkeAufruf(SLUG, { besuch: randomUUID(), sekunden: -5 });
  vermerkeAufruf(SLUG, { besuch: randomUUID(), sekunden: "unfug" });

  const dauern = ladeResonanz(SLUG).aufrufe.map((a) => a.sekunden);
  assert.deepEqual(dauern, [30, MAX_SEKUNDEN, 0, 0]);
});

test("alte Aufrufe fallen hinten raus, statt die Datei wachsen zu lassen", () => {
  const stand = { slug: SLUG, ersterAufruf: null, letzterAufruf: null, aufrufe: [] };
  for (let i = 0; i < MAX_AUFRUFE; i += 1) {
    stand.aufrufe.push({ zeitpunkt: `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`, sekunden: 10, reservierungGesehen: false });
  }
  speichereResonanz(SLUG, stand);

  vermerkeAufruf(SLUG, { besuch: randomUUID(), sekunden: 70 });

  const danach = ladeResonanz(SLUG);
  assert.equal(danach.aufrufe.length, MAX_AUFRUFE);
  assert.equal(danach.aufrufe.at(-1).sekunden, 70);
  assert.equal(danach.aufrufe[0].zeitpunkt, "2026-01-01T00:00:01.000Z");
});

test("eine unerwartete Entwurfskennung wird abgewiesen, statt aus dem Ordner zu laufen", () => {
  assert.throws(() => vermerkeAufruf("../../etc/passwd", { besuch: randomUUID() }), /Entwurfskennung/);
  assert.throws(() => vermerkeAufruf("", { besuch: randomUUID() }), /Entwurfskennung/);
  assert.throws(() => ladeResonanz("Groß/Klein"), /Entwurfskennung/);
});

test("ohne Besuchskennung lässt sich nichts zuordnen", () => {
  assert.throws(() => vermerkeAufruf(SLUG, {}), /Besuchskennung/);
});

test("die Übersicht verdichtet auf das, was die Nachfass-Entscheidung trägt", () => {
  vermerkeAufruf(SLUG, { besuch: randomUUID(), sekunden: 20 });
  vermerkeAufruf(SLUG, { besuch: randomUUID(), sekunden: 120, reservierungGesehen: true });

  const uebersicht = resonanzUebersicht(SLUG);
  assert.equal(uebersicht.geoeffnet, true);
  assert.equal(uebersicht.anzahl, 2);
  assert.equal(uebersicht.maxSekunden, 120);
  assert.equal(uebersicht.reservierungGesehen, true);
  assert.equal(uebersicht.letzterAufruf, ladeResonanz(SLUG).letzterAufruf);
});

// Die Zusage, dass in data/ nichts Personenbezogenes landet, ist der Grund,
// warum die Messung ohne Einwilligung tragfähig ist. Sie gehört deshalb in
// einen Test und nicht nur in einen Kommentar.
test("ein gespeicherter Aufruf enthält nichts, womit sich jemand wiedererkennen ließe", () => {
  vermerkeAufruf(SLUG, {
    besuch: randomUUID(),
    sekunden: 40,
    reservierungGesehen: true,
    // Selbst wenn der Collector das je durchreichen würde: hier endet es.
    ip: "203.0.113.7",
    userAgent: "Mozilla/5.0",
    referer: "https://example.invalid/",
  });

  const aufruf = ladeResonanz(SLUG).aufrufe[0];
  assert.deepEqual(Object.keys(aufruf).sort(), ["reservierungGesehen", "sekunden", "zeitpunkt"]);

  const roh = JSON.stringify(ladeResonanz(SLUG));
  assert.doesNotMatch(roh, /203\.0\.113\.7|Mozilla|example\.invalid/);
});
