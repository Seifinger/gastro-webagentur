import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ladeStimmungsWahl,
  speichereStimmung,
  stimmungFuerLead,
} from "../src/stimmungsWahl.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wahlPfad = path.join(__dirname, "..", "data", "stimmungen.json");

const lead = { placeId: "place-taverna", name: "Taverna Mykonos" };

beforeEach(() => {
  rmSync(wahlPfad, { force: true });
});

after(() => {
  rmSync(wahlPfad, { force: true });
});

test("ohne Datei ist keine Stimmung gewählt", () => {
  assert.deepEqual(ladeStimmungsWahl(), {});
  assert.equal(stimmungFuerLead(lead, "griechisch"), undefined);
});

test("eine gewählte Stimmung wird gespeichert und wiedergefunden", () => {
  speichereStimmung(lead.placeId, "griechisch", "olivenhain");

  assert.equal(stimmungFuerLead(lead, "griechisch"), "olivenhain");
});

test("ein leerer Wert stellt auf automatische Auswahl zurück", () => {
  speichereStimmung(lead.placeId, "griechisch", "olivenhain");
  speichereStimmung(lead.placeId, "griechisch", "");

  assert.deepEqual(ladeStimmungsWahl(), {});
});

test("eine Stimmung aus einer anderen Küche wird abgewiesen", () => {
  // "trattoria" gibt es – aber bei Italienisch.
  assert.throws(() => speichereStimmung(lead.placeId, "griechisch", "trattoria"), /Stimmung/);
  assert.deepEqual(ladeStimmungsWahl(), {});
});

test("ohne placeId wird nichts gespeichert", () => {
  assert.throws(() => speichereStimmung("", "griechisch", "olivenhain"), /placeId/);
});

// Die Stimmung gehört zur Küche. Wird die Küche eines Leads später umgestellt,
// passt die alte Wahl nicht mehr – sie muss verfallen, statt die Seite in eine
// fremde Welt zu kippen.
test("nach einem Küchenwechsel verfällt die alte Stimmung", () => {
  speichereStimmung(lead.placeId, "griechisch", "olivenhain");

  assert.equal(stimmungFuerLead(lead, "italienisch"), undefined);
  assert.equal(stimmungFuerLead(lead, "griechisch"), "olivenhain");
});

test("eine von Hand verfremdete Datei schickt den Generator nicht in eine fremde Welt", () => {
  mkdirSync(path.dirname(wahlPfad), { recursive: true });
  writeFileSync(
    wahlPfad,
    JSON.stringify({
      "place-a": { kueche: "griechisch", stimmung: "gibt-es-nicht" },
      "place-b": { kueche: "erfundene-kueche", stimmung: "olivenhain" },
      "place-c": { kueche: "griechisch", stimmung: "olivenhain" },
    }),
  );

  assert.deepEqual(Object.keys(ladeStimmungsWahl()), ["place-c"]);
});

test("kaputtes JSON führt zu keiner Wahl statt zu einem Absturz", () => {
  mkdirSync(path.dirname(wahlPfad), { recursive: true });
  writeFileSync(wahlPfad, "{kein json");

  assert.deepEqual(ladeStimmungsWahl(), {});
});
