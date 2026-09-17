import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ladeBetrieb,
  speichereBetrieb,
  legeTischAn,
  entferneTisch,
  gesamtPlaetze,
  freiePlaetze,
  ueberschneidetSich,
  legeReservierungAn,
  setzeReservierungStatus,
  weiseTischZu,
  legeBestellungAn,
  bestaetigeBestellung,
  setzeBestellungStatus,
  BELEGDAUER_MINUTEN,
} from "../src/betriebStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLUG = "__test-betrieb";
const dateiPfad = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);

function grundriss() {
  legeTischAn(SLUG, { name: "Tisch 1", plaetze: 4 });
  legeTischAn(SLUG, { name: "Tisch 2", plaetze: 6 });
  legeTischAn(SLUG, { name: "Stube", plaetze: 8 });
}

beforeEach(() => {
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [] });
});

after(() => {
  rmSync(dateiPfad, { force: true });
});

test("ueberschneidetSich deckt genau das Belegfenster ab", () => {
  assert.equal(BELEGDAUER_MINUTEN, 120);
  assert.equal(ueberschneidetSich("19:00", "19:00"), true);
  assert.equal(ueberschneidetSich("19:00", "20:59"), true);
  assert.equal(ueberschneidetSich("19:00", "21:00"), false);
  assert.equal(ueberschneidetSich("19:00", "17:00"), false);
  assert.equal(ueberschneidetSich("19:00", "kaputt"), false);
});

test("der Tischplan bestimmt die Gesamtplatzzahl", () => {
  grundriss();
  assert.equal(gesamtPlaetze(ladeBetrieb(SLUG)), 18);
});

test("ein Tisch kann nicht doppelt heißen", () => {
  legeTischAn(SLUG, { name: "Stube", plaetze: 8 });
  assert.throws(() => legeTischAn(SLUG, { name: "stube", plaetze: 4 }), /bereits einen Tisch/);
});

test("unsinnige Platzzahlen werden abgewiesen", () => {
  assert.throws(() => legeTischAn(SLUG, { name: "A", plaetze: 0 }), /zwischen 1 und 40/);
  assert.throws(() => legeTischAn(SLUG, { name: "B", plaetze: 99 }), /zwischen 1 und 40/);
  assert.throws(() => legeTischAn(SLUG, { name: "  ", plaetze: 4 }), /Bezeichnung/);
});

test("ohne Tischplan wird keine Reservierung angenommen", () => {
  assert.throws(
    () => legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:00", personen: 2, name: "X" }),
    /kein Tisch angelegt/,
  );
});

test("Reservierungen belegen Plätze nur im überschneidenden Zeitfenster", () => {
  grundriss();
  legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:00", personen: 8, name: "Huber" });
  const daten = ladeBetrieb(SLUG);

  assert.equal(freiePlaetze(daten, "2026-09-20", "19:00"), 10);
  assert.equal(freiePlaetze(daten, "2026-09-20", "20:30"), 10, "20:30 liegt noch im Fenster");
  assert.equal(freiePlaetze(daten, "2026-09-20", "21:00"), 18, "21:00 liegt außerhalb");
  assert.equal(freiePlaetze(daten, "2026-09-21", "19:00"), 18, "anderer Tag ist unberührt");
});

test("eine Überbuchung wird mit konkreter Zahl abgelehnt", () => {
  grundriss();
  legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:00", personen: 8, name: "Huber" });
  legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:30", personen: 6, name: "Meier" });

  assert.throws(
    () => legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:15", personen: 6, name: "Zuviel" }),
    /nur noch 4 Plätze frei \(angefragt: 6\)/,
  );

  // Vier passen noch genau hinein.
  const passt = legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:15", personen: 4, name: "Passt" });
  assert.equal(passt.personen, 4);
  assert.equal(freiePlaetze(ladeBetrieb(SLUG), "2026-09-20", "19:00"), 0);
});

test("abgesagte Reservierungen geben ihre Plätze wieder frei", () => {
  grundriss();
  const r = legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:00", personen: 8, name: "Huber" });
  assert.equal(freiePlaetze(ladeBetrieb(SLUG), "2026-09-20", "19:00"), 10);

  setzeReservierungStatus(SLUG, r.id, "abgesagt");
  assert.equal(freiePlaetze(ladeBetrieb(SLUG), "2026-09-20", "19:00"), 18);
});

test("was der Wirt selbst einträgt, gilt sofort als bestätigt", () => {
  grundriss();
  const online = legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:00", personen: 2, name: "Web" });
  const manuell = legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:00", personen: 2, name: "Anruf" }, "manuell");

  assert.equal(online.quelle, "online");
  assert.equal(online.status, "neu");
  assert.equal(manuell.quelle, "manuell");
  assert.equal(manuell.status, "bestaetigt");
});

test("unvollständige Reservierungen werden abgewiesen", () => {
  grundriss();
  const gueltig = { datum: "2026-09-20", uhrzeit: "19:00", personen: 2, name: "X" };

  assert.throws(() => legeReservierungAn(SLUG, { ...gueltig, datum: "20.09.2026" }), /JJJJ-MM-TT/);
  assert.throws(() => legeReservierungAn(SLUG, { ...gueltig, uhrzeit: "abends" }), /HH:MM/);
  assert.throws(() => legeReservierungAn(SLUG, { ...gueltig, personen: 0 }), /zwischen 1 und 40/);
  assert.throws(() => legeReservierungAn(SLUG, { ...gueltig, name: "   " }), /Namen/);
});

test("ein Tisch nimmt nicht mehr Gäste als er Plätze hat", () => {
  grundriss();
  const r = legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:00", personen: 8, name: "Huber" });
  const klein = ladeBetrieb(SLUG).tische.find((t) => t.plaetze === 4);

  assert.throws(() => weiseTischZu(SLUG, r.id, klein.id), /nur 4 Plätze, gebraucht werden 8/);
});

test("derselbe Tisch wird nicht doppelt vergeben", () => {
  grundriss();
  const stube = ladeBetrieb(SLUG).tische.find((t) => t.plaetze === 8);
  const a = legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:00", personen: 6, name: "Huber" });
  const b = legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "20:00", personen: 4, name: "Meier" });

  weiseTischZu(SLUG, a.id, stube.id);
  assert.throws(() => weiseTischZu(SLUG, b.id, stube.id), /bereits an Huber vergeben/);

  // Außerhalb des Belegfensters ist derselbe Tisch wieder frei.
  const c = legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "21:30", personen: 4, name: "Spät" });
  assert.equal(weiseTischZu(SLUG, c.id, stube.id).tischId, stube.id);
});

test("ein gelöschter Tisch löst seine Zuweisungen", () => {
  grundriss();
  const stube = ladeBetrieb(SLUG).tische.find((t) => t.plaetze === 8);
  const r = legeReservierungAn(SLUG, { datum: "2026-09-20", uhrzeit: "19:00", personen: 6, name: "Huber" });
  weiseTischZu(SLUG, r.id, stube.id);

  entferneTisch(SLUG, stube.id);
  const daten = ladeBetrieb(SLUG);

  assert.equal(daten.tische.length, 2);
  assert.equal(daten.reservierungen[0].tischId, null, "Zuweisung zeigt ins Leere");
});

test("eine Bestellung rechnet die Summe aus den Positionen", () => {
  const b = legeBestellungAn(SLUG, {
    positionen: [
      { name: "Schweinsbraten", menge: 2, preis: 16.9 },
      { name: "Kaiserschmarrn", menge: 1, preis: 9.5 },
    ],
    abholzeit: "18:30",
    name: "Bauer",
  });

  assert.equal(Number(b.gesamt.toFixed(2)), 43.3);
  assert.equal(b.status, "neu");
  assert.equal(b.bestaetigteAbholzeit, "", "vor der Bestätigung steht keine Zeit fest");
  assert.match(b.nummer, /^AB-\d{4}$/);
});

test("leere oder namenlose Bestellungen werden abgewiesen", () => {
  assert.throws(() => legeBestellungAn(SLUG, { positionen: [], abholzeit: "18:30", name: "X" }), /leer/);
  assert.throws(
    () => legeBestellungAn(SLUG, { positionen: [{ name: "A", menge: 1, preis: 5 }], abholzeit: "18:30", name: " " }),
    /Namen/,
  );
  assert.throws(
    () => legeBestellungAn(SLUG, { positionen: [{ name: "A", menge: 1, preis: 5 }], abholzeit: "", name: "X" }),
    /Abholzeit/,
  );
});

test("die Abholzeit gilt erst, wenn der Wirt sie bestätigt", () => {
  const b = legeBestellungAn(SLUG, {
    positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
    abholzeit: "18:30",
    name: "Bauer",
  });

  // Der Wirt schafft es erst später.
  const bestaetigt = bestaetigeBestellung(SLUG, b.id, "19:00");

  assert.equal(bestaetigt.abholzeit, "18:30", "der Wunsch des Gastes bleibt erhalten");
  assert.equal(bestaetigt.bestaetigteAbholzeit, "19:00");
  assert.equal(bestaetigt.status, "bestaetigt");

  assert.throws(() => bestaetigeBestellung(SLUG, b.id, "  "), /Abholzeit/);
});

test("Bestellmengen werden auf einen sinnvollen Bereich begrenzt", () => {
  const b = legeBestellungAn(SLUG, {
    positionen: [
      { name: "Viel", menge: 500, preis: 1 },
      { name: "Nichts", menge: 0, preis: 1 },
    ],
    abholzeit: "18:30",
    name: "X",
  });

  assert.equal(b.positionen[0].menge, 99);
  assert.equal(b.positionen[1].menge, 1);
});

test("unbekannte Status werden nicht gesetzt", () => {
  const b = legeBestellungAn(SLUG, {
    positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
    abholzeit: "18:30",
    name: "X",
  });

  assert.throws(() => setzeBestellungStatus(SLUG, b.id, "verschimmelt"), /Unbekannter Status/);
  assert.equal(setzeBestellungStatus(SLUG, b.id, "abgeholt").status, "abgeholt");
});
