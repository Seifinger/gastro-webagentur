import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Abholzeiten über die öffentliche Schnittstelle von wirtServer.js. Eigene
// Datei (eigener Prozess), weil die Anfrage-Bremse je Adresse sonst mit den
// übrigen wirtServer-Tests zusammenzählt.
const SLUG = "__test-wirt-abholzeiten";
process.env.BETRIEB = SLUG;
const { handler } = await import("../src/wirtServer.js");
const { ladeBetrieb, speichereBetrieb, uhrHook } = await import("../src/betriebStore.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dateiPfad = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);

// Donnerstag, 24.09.2026, 17:00 in Berlin (Standardzeiten: ab 17:00 geöffnet).
const JETZT = new Date("2026-09-24T17:00:00+02:00");
uhrHook.jetzt = () => new Date(JETZT);

beforeEach(() => {
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
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

/* ----- Abholzeiten: Einstellungen fürs Formular und Prüfung beim Eingang ----- */

test("/oeffentlich/abholzeiten liefert Öffnungszeiten, Zeitzone, Zusatz-Wartezeit und Serverzeit", async () => {
  await mitServer(async (basis) => {
    await fetch(`${basis}/intern/wartezeit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ minuten: 10 }) });
    const antwort = await fetch(`${basis}/oeffentlich/abholzeiten`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const ergebnis = await antwort.json();
    assert.equal(antwort.status, 200);
    assert.equal(antwort.headers.get("access-control-allow-origin"), "*");
    assert.equal(ergebnis.zeitzone, "Europe/Berlin");
    assert.equal(ergebnis.zusatzMinuten, 10);
    assert.equal(ergebnis.jetzt, JETZT.toISOString());
    assert.ok(Array.isArray(ergebnis.oeffnungszeiten) && ergebnis.oeffnungszeiten.length > 0);
  });
});

test("/oeffentlich/bestellung lehnt eine veraltete Abholzeit mit klarer Meldung ab und legt nichts an", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/oeffentlich/bestellung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
        abholzeit: "17:10",
        abholArt: "geplant",
        abholZeitpunkt: "2026-09-24T15:10:00.000Z",
        name: "Testgast",
      }),
    });
    const ergebnis = await antwort.json();
    assert.equal(antwort.status, 400);
    assert.match(ergebnis.fehler, /17:10 Uhr ist nicht mehr möglich\. Frühestens möglich: 17:25 Uhr/);
    assert.equal(ladeBetrieb(SLUG).bestellungen.length, 0);
  });
});

test("/oeffentlich/bestellung speichert Art und Zeitpunkt der Abholung", async () => {
  await mitServer(async (basis) => {
    const antwort = await fetch(`${basis}/oeffentlich/bestellung`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
        abholzeit: "17:20",
        abholArt: "asap",
        abholZeitpunkt: "2026-09-24T15:20:00.000Z",
        name: "Testgast",
      }),
    });
    assert.equal(antwort.status, 200);
    const [b] = ladeBetrieb(SLUG).bestellungen;
    assert.equal(b.abholzeit, "17:20");
    assert.equal(b.abholArt, "asap");
    assert.equal(b.abholZeitpunkt, "2026-09-24T15:20:00.000Z");
  });
});
