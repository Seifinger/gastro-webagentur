import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ladeLernTabelle,
  auslastungsStufe,
  zeitfenster,
  wochentag,
  eintragFuer,
  lerneAusBeobachtung,
  gelernterZuschlag,
  beobachteAbholung,
  verfuegbareAbholzeitenMitLernen,
  lernUebersicht,
  MINDEST_BEOBACHTUNGEN,
} from "../src/wartezeitLernStore.js";
import { verfuegbareAbholzeiten } from "../src/betriebStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLUG = "__test-wartezeit-lernen";
const dateiPfad = path.join(__dirname, "..", "data", "wartezeitLernen", `${SLUG}.json`);

beforeEach(() => {
  rmSync(dateiPfad, { force: true });
});

after(() => {
  rmSync(dateiPfad, { force: true });
});

function betriebOhneTische() {
  return { tische: [], reservierungen: [], bestellungen: [], zusaetzlicheWartezeitMinuten: 0 };
}

test("zeitfenster teilt den Tag in 2-Stunden-Blöcke", () => {
  assert.equal(zeitfenster("00:15"), 0);
  assert.equal(zeitfenster("01:59"), 0);
  assert.equal(zeitfenster("02:00"), 1);
  assert.equal(zeitfenster("22:30"), 11);
  assert.equal(zeitfenster("23:59"), 11);
});

test("auslastungsStufe ist 'niedrig', solange es keinen Tischplan gibt", () => {
  assert.equal(auslastungsStufe(betriebOhneTische(), "2026-09-20", "19:00"), "niedrig");
});

test("auslastungsStufe rechnet aus der bestehenden 120-Minuten-Kapazitätsprüfung", () => {
  const betrieb = {
    tische: [{ id: "t1", name: "T1", plaetze: 10 }],
    reservierungen: [
      { id: "r1", datum: "2026-09-20", uhrzeit: "19:00", personen: 6, status: "bestaetigt" },
    ],
  };
  // 6 von 10 Plätzen belegt = 60% -> "mittel".
  assert.equal(auslastungsStufe(betrieb, "2026-09-20", "19:00"), "mittel");
  // Außerhalb des Belegfensters (120 Minuten) ist wieder alles frei.
  assert.equal(auslastungsStufe(betrieb, "2026-09-20", "22:00"), "niedrig");
});

test("lerneAusBeobachtung aktualisiert per gleitendem Durchschnitt", () => {
  const basis = { datum: "2026-09-20", uhrzeit: "18:30", auslastung: "niedrig" };
  lerneAusBeobachtung(SLUG, { ...basis, differenzMinuten: 10 });
  lerneAusBeobachtung(SLUG, { ...basis, differenzMinuten: 20 });
  lerneAusBeobachtung(SLUG, { ...basis, differenzMinuten: 15 });
  lerneAusBeobachtung(SLUG, { ...basis, differenzMinuten: 15 });
  const letzter = lerneAusBeobachtung(SLUG, { ...basis, differenzMinuten: 15 });

  // 0 -> 10 -> 15 -> 15 -> 15 -> 15 (siehe Kommentar in wartezeitLernStore.js).
  assert.equal(letzter.beobachtungen, 5);
  assert.equal(Math.round(letzter.zuschlagMinuten), 15);

  const eintrag = eintragFuer(ladeLernTabelle(SLUG), wochentag("2026-09-20"), zeitfenster("18:30"), "niedrig");
  assert.equal(eintrag.beobachtungen, 5);
});

test("unter 5 Beobachtungen hat der gelernte Wert keine Wirkung", () => {
  const basis = { datum: "2026-09-20", uhrzeit: "18:30", auslastung: "niedrig" };
  for (let i = 0; i < 4; i += 1) {
    lerneAusBeobachtung(SLUG, { ...basis, differenzMinuten: 30 });
  }
  const tabelle = ladeLernTabelle(SLUG);
  const wt = wochentag("2026-09-20");
  const fenster = zeitfenster("18:30");

  assert.equal(eintragFuer(tabelle, wt, fenster, "niedrig").beobachtungen, 4);
  assert.equal(gelernterZuschlag(tabelle, wt, fenster, "niedrig"), 0, "unter 5 Beobachtungen zählt der Wert nicht");

  lerneAusBeobachtung(SLUG, { ...basis, differenzMinuten: 30 });
  const tabelleDanach = ladeLernTabelle(SLUG);
  assert.equal(
    gelernterZuschlag(tabelleDanach, wt, fenster, "niedrig"),
    30,
    "ab der 5. Beobachtung greift der gelernte Wert",
  );
});

test("die Gewichtung ist bei 20 Beobachtungen gedeckelt", () => {
  const basis = { datum: "2026-09-20", uhrzeit: "18:30", auslastung: "niedrig" };
  for (let i = 0; i < 20; i += 1) {
    lerneAusBeobachtung(SLUG, { ...basis, differenzMinuten: 10 });
  }
  // Nach 20 stabilen Beobachtungen liegt der Wert bei 10. Eine 21. mit 30
  // Minuten Abweichung darf danach höchstens 1/20 Gewicht bekommen, nicht 1/21.
  const nach21 = lerneAusBeobachtung(SLUG, { ...basis, differenzMinuten: 30 });
  assert.equal(nach21.beobachtungen, 21);
  assert.equal(Math.round(nach21.zuschlagMinuten * 100) / 100, 10 + (30 - 10) / 20);
});

test("beobachteAbholung berechnet die Differenz aus Ist und versprochener Zeit", () => {
  const betrieb = betriebOhneTische();
  const bestellung = {
    nummer: "AB-1234",
    abholzeit: "18:00",
    bestaetigteAbholzeit: "18:30",
    eingegangen: "2026-09-20T10:00:00.000Z",
  };
  const versprochen = new Date("2026-09-20T18:30:00");
  const tatsaechlich = new Date(versprochen.getTime() + 12 * 60_000);

  beobachteAbholung(SLUG, betrieb, bestellung, tatsaechlich);

  const tabelle = ladeLernTabelle(SLUG);
  const eintrag = eintragFuer(tabelle, wochentag("2026-09-20"), zeitfenster("18:30"), "niedrig");
  assert.equal(eintrag.beobachtungen, 1);
  assert.equal(Math.round(eintrag.zuschlagMinuten), 12);
});

test("beobachteAbholung nutzt die versprochene, nicht die gewünschte Abholzeit", () => {
  const betrieb = betriebOhneTische();
  const bestellung = {
    abholzeit: "18:00", // Wunsch des Gastes
    bestaetigteAbholzeit: "18:30", // tatsächlich zugesagt
    eingegangen: "2026-09-20T10:00:00.000Z",
  };
  const tatsaechlich = new Date("2026-09-20T18:30:00");

  beobachteAbholung(SLUG, betrieb, bestellung, tatsaechlich);
  const eintrag = eintragFuer(
    ladeLernTabelle(SLUG),
    wochentag("2026-09-20"),
    zeitfenster("18:30"),
    "niedrig",
  );
  assert.equal(eintrag.beobachtungen, 1, "die Zelle für 18:30 (bestätigt), nicht 18:00 (Wunsch), wird aktualisiert");
});

test("verfuegbareAbholzeitenMitLernen liefert ohne Aktivierung exakt das bisherige Verhalten", () => {
  const betrieb = { ...betriebOhneTische(), wartezeitLernenAktiv: false };
  const jetzt = new Date(2026, 8, 20, 12, 3);

  // Auch mit reichlich gelernten Daten darf ohne Aktivierung nichts einfließen.
  for (let i = 0; i < 10; i += 1) {
    lerneAusBeobachtung(SLUG, { datum: "2026-09-20", uhrzeit: "12:00", auslastung: "niedrig", differenzMinuten: 45 });
  }

  const mitLernen = verfuegbareAbholzeitenMitLernen(SLUG, betrieb, jetzt);
  const ohneLernen = verfuegbareAbholzeiten(betrieb, jetzt);
  assert.deepEqual(mitLernen, ohneLernen);
});

test("verfuegbareAbholzeitenMitLernen schlägt den gelernten Zuschlag additiv auf die manuelle Zusatz-Wartezeit auf", () => {
  const jetzt = new Date(2026, 8, 20, 12, 3);
  const datum = jetzt.toISOString().slice(0, 10);
  const uhrzeit = "12:00";

  for (let i = 0; i < MINDEST_BEOBACHTUNGEN; i += 1) {
    lerneAusBeobachtung(SLUG, { datum, uhrzeit, auslastung: "niedrig", differenzMinuten: 20 });
  }

  const basis = { ...betriebOhneTische(), wartezeitLernenAktiv: true };
  const mitManuell = { ...basis, zusaetzlicheWartezeitMinuten: 10 };

  const nurBasis = verfuegbareAbholzeiten(betriebOhneTische(), jetzt)[0];
  const basisPlusLernen = verfuegbareAbholzeitenMitLernen(SLUG, basis, jetzt)[0];
  const allesZusammen = verfuegbareAbholzeitenMitLernen(SLUG, mitManuell, jetzt)[0];

  assert.notEqual(basisPlusLernen, nurBasis, "der gelernte Zuschlag muss wirken");
  assert.notEqual(allesZusammen, basisPlusLernen, "die manuelle Zusatz-Wartezeit muss zusätzlich wirken");
});

test("lernUebersicht listet nur Zellen mit Beobachtungen, sortiert", () => {
  lerneAusBeobachtung(SLUG, { datum: "2026-09-22", uhrzeit: "19:00", auslastung: "hoch", differenzMinuten: 5 });
  lerneAusBeobachtung(SLUG, { datum: "2026-09-20", uhrzeit: "12:00", auslastung: "niedrig", differenzMinuten: 3 });

  const uebersicht = lernUebersicht(SLUG);
  assert.equal(uebersicht.length, 2);
  assert.ok(uebersicht[0].wochentag <= uebersicht[1].wochentag);
  assert.equal(uebersicht[0].gelernt, false, "eine einzelne Beobachtung reicht noch nicht");
});
