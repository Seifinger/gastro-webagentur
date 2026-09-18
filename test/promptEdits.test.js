import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validiereVorschlag,
  parseRohAntwort,
  ERLAUBTE_FELDER,
  MAX_PROMPTS_PRO_STUNDE,
  pruefeRateLimit,
  merkeVorschlag,
  letzterVorschlag,
  vergissVorschlag,
  _zustandZuruecksetzenFuerTests,
} from "../src/promptEdits.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "..", "data", "output");
const landingPagesDir = path.join(__dirname, "..", "data", "landingpages");
const manifestPath = path.join(landingPagesDir, "entwuerfe.json");
const leadEditsDir = path.join(__dirname, "..", "data", "lead-edits");

const ERLAUBTE_IDS = new Set(["0-0", "0-1", "1-0"]);

/* ------------------------- validiereVorschlag ------------------------- */

test("eine gültige Antwort mit allen drei Feldern wird angenommen", () => {
  const roh = JSON.stringify({
    headline: "Beim Huber",
    schlagzeile: "Seit 1932 am Stadtplatz.",
    highlightBeschreibungen: { "0-0": "Zart geschmort, mit dunkler Soße." },
  });

  const ergebnis = validiereVorschlag(roh, { erlaubteGerichtIds: ERLAUBTE_IDS });

  assert.equal(ergebnis.ok, true);
  assert.deepEqual(ergebnis.vorschlag, {
    headline: "Beim Huber",
    schlagzeile: "Seit 1932 am Stadtplatz.",
    highlightBeschreibungen: { "0-0": "Zart geschmort, mit dunkler Soße." },
  });
});

test("eine Antwort mit nur einem der drei Felder wird angenommen", () => {
  const ergebnis = validiereVorschlag(JSON.stringify({ schlagzeile: "Neu formuliert." }), {
    erlaubteGerichtIds: ERLAUBTE_IDS,
  });

  assert.equal(ergebnis.ok, true);
  assert.deepEqual(ergebnis.vorschlag, { schlagzeile: "Neu formuliert." });
});

test("eine Antwort mit einem nicht erlaubten Feld wird abgelehnt", () => {
  const roh = JSON.stringify({ headline: "Beim Huber", preis: 99.9 });

  const ergebnis = validiereVorschlag(roh, { erlaubteGerichtIds: ERLAUBTE_IDS });

  assert.equal(ergebnis.ok, false);
  assert.match(ergebnis.fehler, /Nicht erlaubte Felder/);
  assert.match(ergebnis.fehler, /preis/);
});

test("eine Antwort mit einem HTML-Tag im Text wird abgelehnt", () => {
  const roh = JSON.stringify({ headline: "<b>Beim Huber</b>" });

  const ergebnis = validiereVorschlag(roh, { erlaubteGerichtIds: ERLAUBTE_IDS });

  assert.equal(ergebnis.ok, false);
  assert.match(ergebnis.fehler, /HTML/);
});

test("ein eingeschleustes <script> in einer Gerichtsbeschreibung wird abgelehnt", () => {
  const roh = JSON.stringify({
    highlightBeschreibungen: { "0-0": 'Lecker <script>alert(1)</script>' },
  });

  const ergebnis = validiereVorschlag(roh, { erlaubteGerichtIds: ERLAUBTE_IDS });

  assert.equal(ergebnis.ok, false);
  assert.match(ergebnis.fehler, /HTML/);
});

test("eine URL im Text wird abgelehnt", () => {
  const ergebnis = validiereVorschlag(JSON.stringify({ schlagzeile: "Mehr auf https://example.com" }), {
    erlaubteGerichtIds: ERLAUBTE_IDS,
  });

  assert.equal(ergebnis.ok, false);
  assert.match(ergebnis.fehler, /HTML oder eine URL/);
});

test("eine Gericht-ID, die es auf der Karte nicht gibt, wird abgelehnt", () => {
  const roh = JSON.stringify({ highlightBeschreibungen: { "9-9": "Frei erfunden" } });

  const ergebnis = validiereVorschlag(roh, { erlaubteGerichtIds: ERLAUBTE_IDS });

  assert.equal(ergebnis.ok, false);
  assert.match(ergebnis.fehler, /gibt es auf dieser Karte nicht/);
});

test("ein verschachteltes Objekt statt eines Strings bei headline wird abgelehnt", () => {
  const roh = JSON.stringify({ headline: { text: "Beim Huber" } });

  const ergebnis = validiereVorschlag(roh, { erlaubteGerichtIds: ERLAUBTE_IDS });

  assert.equal(ergebnis.ok, false);
  assert.match(ergebnis.fehler, /muss ein nicht-leerer Text sein/);
});

test("Text, der kein JSON ist, wird abgelehnt", () => {
  const ergebnis = validiereVorschlag("Klar, hier ist die neue Headline: Beim Huber!", {
    erlaubteGerichtIds: ERLAUBTE_IDS,
  });

  assert.equal(ergebnis.ok, false);
  assert.match(ergebnis.fehler, /kein gültiges JSON/);
});

test("eine JSON-Liste statt eines Objekts wird abgelehnt", () => {
  const ergebnis = validiereVorschlag(JSON.stringify([{ headline: "Beim Huber" }]), {
    erlaubteGerichtIds: ERLAUBTE_IDS,
  });

  assert.equal(ergebnis.ok, false);
  assert.match(ergebnis.fehler, /JSON-Objekt/);
});

test("eine leere Antwort ohne Änderung wird abgelehnt", () => {
  const ergebnis = validiereVorschlag(JSON.stringify({}), { erlaubteGerichtIds: ERLAUBTE_IDS });

  assert.equal(ergebnis.ok, false);
  assert.match(ergebnis.fehler, /keine Änderung/);
});

test("JSON in einem Markdown-Codeblock wird trotzdem geparst", () => {
  const roh = "```json\n" + JSON.stringify({ headline: "Beim Huber" }) + "\n```";

  const ergebnis = validiereVorschlag(roh, { erlaubteGerichtIds: ERLAUBTE_IDS });

  assert.equal(ergebnis.ok, true);
  assert.deepEqual(ergebnis.vorschlag, { headline: "Beim Huber" });
});

test("ERLAUBTE_FELDER benennt genau die drei Felder aus der Aufgabenstellung", () => {
  assert.deepEqual(ERLAUBTE_FELDER, ["headline", "schlagzeile", "highlightBeschreibungen"]);
});

test("parseRohAntwort gibt undefined für unparsbaren Text zurück", () => {
  assert.equal(parseRohAntwort("{ kaputt"), undefined);
});

/* ------------------------------ Rate-Limit ------------------------------ */

test("pruefeRateLimit lässt bis zu 10 Anfragen pro Stunde durch, die 11. nicht", () => {
  const slug = "test-prompt-ratelimit";
  _zustandZuruecksetzenFuerTests();

  for (let i = 0; i < MAX_PROMPTS_PRO_STUNDE; i += 1) {
    assert.doesNotThrow(() => pruefeRateLimit(slug));
  }
  assert.throws(() => pruefeRateLimit(slug), /Zu viele Vorschläge/);

  // Ein anderer Entwurf hat sein eigenes Kontingent.
  assert.doesNotThrow(() => pruefeRateLimit("test-prompt-ratelimit-anderer"));

  _zustandZuruecksetzenFuerTests();
});

/* ------------------------- ausstehende Vorschläge ------------------------ */

test("merkeVorschlag/letzterVorschlag/vergissVorschlag verwalten den Zwischenstand", () => {
  const slug = "test-prompt-zwischenstand";
  _zustandZuruecksetzenFuerTests();

  assert.equal(letzterVorschlag(slug), null);
  merkeVorschlag(slug, { headline: "Beim Huber" });
  assert.deepEqual(letzterVorschlag(slug).vorschlag, { headline: "Beim Huber" });

  vergissVorschlag(slug);
  assert.equal(letzterVorschlag(slug), null);

  _zustandZuruecksetzenFuerTests();
});

/* --------------------- Route: Ende-zu-Ende mit Fake-LLM --------------------- */

function csvZeile(felder) {
  return Object.values(felder)
    .map((wert) => (/[",\n]/.test(String(wert)) ? `"${String(wert).replace(/"/g, '""')}"` : wert))
    .join(",");
}

const CSV_HEADER =
  "name,adresse,telefon,website,hatWebsite,score,priorität,websiteErreichbar,hatBestellfunktion,hatReservierungsfunktion,mobilFreundlich,wirktVeraltet,rating,anzahlBewertungen,placeId,ort,fetchedAt";

/**
 * Legt einen minimalen Lead samt Manifest-Eintrag an, wie ihn "npm run pages"
 * normalerweise erzeugt – Grundlage für leadTextKontext() in
 * dashboardServer.js. Ohne diese Fixtur findet die Route den Lead nicht.
 */
function richteLeadEin(slug, placeId, name) {
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(landingPagesDir, { recursive: true });

  const csv = [
    CSV_HEADER,
    csvZeile({
      name,
      adresse: "Stadtpl. 1, 84453 Mühldorf am Inn, Germany",
      telefon: "08631 12345",
      website: "",
      hatWebsite: "false",
      score: "90",
      priorität: "Sehr hoch",
      websiteErreichbar: "",
      hatBestellfunktion: "",
      hatReservierungsfunktion: "",
      mobilFreundlich: "",
      wirktVeraltet: "",
      rating: "4.5",
      anzahlBewertungen: "100",
      placeId,
      ort: "Mühldorf am Inn",
      fetchedAt: new Date().toISOString(),
    }),
  ].join("\n");
  writeFileSync(path.join(outputDir, `${slug}.csv`), csv, "utf-8");

  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf-8")) : {};
  manifest[placeId] = slug;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

function raeumeLeadAuf(slug, placeId) {
  rmSync(path.join(outputDir, `${slug}.csv`), { force: true });
  rmSync(path.join(leadEditsDir, `${slug}.json`), { force: true });

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    delete manifest[placeId];
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  } catch {
    // Kein Manifest (z. B. wenn dieser Test als einziger lief) – nichts zu tun.
  }
}

async function mitServer(fn) {
  const { handler } = await import("../src/dashboardServer.js");
  const server = createServer(handler);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

async function mitGemocktemLlm(rueckgabe, fn) {
  const { llmAufrufHook } = await import("../src/promptEdits.js");
  const original = llmAufrufHook.aktuell;
  llmAufrufHook.aktuell = async () => (typeof rueckgabe === "function" ? rueckgabe() : rueckgabe);
  try {
    return await fn();
  } finally {
    llmAufrufHook.aktuell = original;
  }
}

test("POST /intern/lead/:slug/prompt: eine gültige gemockte Antwort führt zu einer übernehmbaren Vorschau", async (t) => {
  const slug = "test-prompt-gueltig";
  const placeId = "ChIJpromptgueltig";
  _zustandZuruecksetzenFuerTests();
  richteLeadEin(slug, placeId, "Gasthof Zur Post");
  t.after(() => {
    raeumeLeadAuf(slug, placeId);
    _zustandZuruecksetzenFuerTests();
  });

  const antwortJson = JSON.stringify({ headline: "Beim Postwirt", schlagzeile: "Frisch aus der Region." });

  await mitGemocktemLlm(antwortJson, () =>
    mitServer(async (basis) => {
      const antwort = await fetch(`${basis}/intern/lead/${slug}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wunsch: "Mach die Headline persönlicher." }),
      });
      const ergebnis = await antwort.json();

      assert.equal(antwort.status, 200);
      assert.equal(ergebnis.ok, true);
      assert.deepEqual(ergebnis.vorschlag, { headline: "Beim Postwirt", schlagzeile: "Frisch aus der Region." });
      assert.equal(ergebnis.vorschauUrl, `/intern/lead/${slug}/prompt/vorschau`);

      // Die Vorschau zeigt die neuen Texte, ohne dass etwas gespeichert wurde.
      const vorschau = await fetch(`${basis}${ergebnis.vorschauUrl}`);
      const html = await vorschau.text();
      assert.equal(vorschau.status, 200);
      assert.match(html, /Beim Postwirt/);
      assert.match(html, /Frisch aus der Region\./);

      const { loadLeadEdits } = await import("../src/leadEdits.js");
      assert.deepEqual(loadLeadEdits(slug), {});

      // Erst /uebernehmen speichert wirklich.
      const uebernommen = await fetch(`${basis}/intern/lead/${slug}/prompt/uebernehmen`, { method: "POST" });
      const uebernahmeErgebnis = await uebernommen.json();
      assert.equal(uebernommen.status, 200);
      assert.equal(uebernahmeErgebnis.ok, true);

      const gespeichert = loadLeadEdits(slug);
      assert.equal(gespeichert.texte.headline, "Beim Postwirt");
      assert.equal(gespeichert.texte.schlagzeile, "Frisch aus der Region.");

      // Nach dem Übernehmen ist kein Vorschlag mehr offen.
      const vorschauDanach = await fetch(`${basis}${ergebnis.vorschauUrl}`);
      assert.equal(vorschauDanach.status, 404);
    }),
  );
});

test("POST /intern/lead/:slug/prompt: eine Antwort mit verbotenem Feld wird abgelehnt und nichts gespeichert", async (t) => {
  const slug = "test-prompt-verboten";
  const placeId = "ChIJpromptverboten";
  _zustandZuruecksetzenFuerTests();
  richteLeadEin(slug, placeId, "Trattoria Napoli");
  t.after(() => {
    raeumeLeadAuf(slug, placeId);
    _zustandZuruecksetzenFuerTests();
  });

  const antwortJson = JSON.stringify({ headline: "Bei Franco", preis: 12.5 });

  await mitGemocktemLlm(antwortJson, () =>
    mitServer(async (basis) => {
      const antwort = await fetch(`${basis}/intern/lead/${slug}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wunsch: "Setz auch gleich einen neuen Preis." }),
      });
      const ergebnis = await antwort.json();

      assert.equal(antwort.status, 400);
      assert.equal(ergebnis.ok, false);
      assert.match(ergebnis.fehler, /Nicht erlaubte Felder/);

      const { loadLeadEdits } = await import("../src/leadEdits.js");
      assert.deepEqual(loadLeadEdits(slug), {});

      // Kein Vorschlag zum Übernehmen, weil die Validierung ihn verworfen hat.
      const uebernehmenVersuch = await fetch(`${basis}/intern/lead/${slug}/prompt/uebernehmen`, { method: "POST" });
      assert.equal(uebernehmenVersuch.status, 400);
    }),
  );
});

test("POST /intern/lead/:slug/prompt: eine Antwort mit HTML-Tag wird abgelehnt und nichts gespeichert", async (t) => {
  const slug = "test-prompt-html";
  const placeId = "ChIJprompthtml";
  _zustandZuruecksetzenFuerTests();
  richteLeadEin(slug, placeId, "Akropolis Grill");
  t.after(() => {
    raeumeLeadAuf(slug, placeId);
    _zustandZuruecksetzenFuerTests();
  });

  const antwortJson = JSON.stringify({ schlagzeile: '<img src=x onerror="alert(1)">Frisch vom Grill' });

  await mitGemocktemLlm(antwortJson, () =>
    mitServer(async (basis) => {
      const antwort = await fetch(`${basis}/intern/lead/${slug}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wunsch: "Mach die Schlagzeile auffälliger." }),
      });
      const ergebnis = await antwort.json();

      assert.equal(antwort.status, 400);
      assert.equal(ergebnis.ok, false);
      assert.match(ergebnis.fehler, /HTML/);

      const { loadLeadEdits } = await import("../src/leadEdits.js");
      assert.deepEqual(loadLeadEdits(slug), {});
    }),
  );
});

test("POST /intern/lead/:slug/prompt/verwerfen leert den Zwischenstand, ohne zu speichern", async (t) => {
  const slug = "test-prompt-verwerfen";
  const placeId = "ChIJpromptverwerfen";
  _zustandZuruecksetzenFuerTests();
  richteLeadEin(slug, placeId, "Café Sonnenschein");
  t.after(() => {
    raeumeLeadAuf(slug, placeId);
    _zustandZuruecksetzenFuerTests();
  });

  await mitGemocktemLlm(JSON.stringify({ headline: "Café Sonne" }), () =>
    mitServer(async (basis) => {
      await fetch(`${basis}/intern/lead/${slug}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wunsch: "Kürzer." }),
      });

      const verworfen = await fetch(`${basis}/intern/lead/${slug}/prompt/verwerfen`, { method: "POST" });
      assert.equal(verworfen.status, 200);

      const uebernehmenVersuch = await fetch(`${basis}/intern/lead/${slug}/prompt/uebernehmen`, { method: "POST" });
      assert.equal(uebernehmenVersuch.status, 400);

      const { loadLeadEdits } = await import("../src/leadEdits.js");
      assert.deepEqual(loadLeadEdits(slug), {});
    }),
  );
});
