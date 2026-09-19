import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// wirtServer.js liest den Betrieb einmalig beim Modul-Import aus argv/env
// (siehe wirtServer.js) – der Testbetrieb muss deshalb vor dem Import stehen,
// damit der Handler auf einer eigenen Datei arbeitet statt auf "mein-lokal".
const SLUG = "__test-wirt-server";
process.env.BETRIEB = SLUG;
const { handler } = await import("../src/wirtServer.js");
const { ladeBetrieb, legeTischAn } = await import("../src/betriebStore.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dateiPfad = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);

before(() => {
  legeTischAn(SLUG, { name: "Tisch 1", plaetze: 4 });
});

after(() => {
  rmSync(dateiPfad, { force: true });
});

async function mitServer(fn) {
  const server = createServer(handler);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

test("POST /intern/wartezeit setzt und liefert den neuen Wert", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/intern/wartezeit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minuten: 25 }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 200);
    assert.equal(ergebnis.ok, true);
    assert.equal(ergebnis.zusaetzlicheWartezeitMinuten, 25);
    assert.equal(ladeBetrieb(SLUG).zusaetzlicheWartezeitMinuten, 25);
  });
});

test("POST /intern/wartezeit weist ungültige Werte ab", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/intern/wartezeit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minuten: 999 }),
    });
    const ergebnis = await antwort.json();

    assert.equal(antwort.status, 400);
    assert.equal(ergebnis.ok, false);
    assert.match(ergebnis.fehler, /zwischen 0 und 180/);
  });
});

test("GET /api/betrieb liefert die aktuelle Zusatz-Wartezeit mit", async () => {
  await mitServer(async (basis) => {
    await fetch(`${basis}/intern/wartezeit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minuten: 10 }),
    });

    const antwort = await fetch(`${basis}/api/betrieb`);
    const ergebnis = await antwort.json();

    assert.equal(ergebnis.zusaetzlicheWartezeitMinuten, 10);
  });
});
