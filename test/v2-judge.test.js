import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  bewerteFarben,
  bewerteTypografie,
  bewerteRhythmus,
  bewerteBilder,
  korrekturListe,
  beurteile,
  SCHWELLE_KRITERIUM,
} from "../v2/judge/designJudge.js";
import { baueImZyklus, schreibeJudgeProtokoll, MAX_RUNDEN } from "../v2/build/zyklus.js";
import { ladeDesignsystem } from "../v2/build/designsystemGenerator.js";
import { testLeadFuer } from "../v2/build/testLeads.js";
import { chromiumPfad, starteBrowser } from "../v2/build/browser.js";
import { hexToRgb } from "../src/colorMath.js";

const tmp = mkdtempSync(path.join(tmpdir(), "__test-v2-judge-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const ds = ladeDesignsystem("italienisch", "trattoria");
const rolle = (r) => ({ ...hexToRgb(ds.farben.rollen[r].hex), a: 1 });

const messung = (ueber = {}) => ({
  farben: [{ art: "text", wert: rolle("text"), flaeche: 0 }, { art: "grund", wert: rolle("grund"), flaeche: 1000 }],
  akzentFlaecheBasis: 100_000,
  kontrastFehler: [],
  zeilenLaengen: [60, 70],
  zeilenhoehe: 1.6,
  kleineZiele: 0,
  typo: { h1: 80, h2: 48, h3: 30, text: 18, familien: ["EB Garamond", "Karla"] },
  schriftenGeladen: [{ familie: "EB Garamond", geladen: true }],
  sektionen: [
    { oben: 128, unten: 128, hoehe: 900, grund: "a", zentriert: false },
    { oben: 128, unten: 128, hoehe: 600, grund: "b", zentriert: false },
    { oben: 160, unten: 160, hoehe: 1200, grund: "a", zentriert: false },
    { oben: 128, unten: 128, hoehe: 500, grund: "b", zentriert: false },
  ],
  heroBildAnteil: 0.6,
  bilder: [{ geladen: true, hochskaliert: false, alt: true, verzerrt: false, herkunft: "platzhalter" }],
  ueberlauf: false,
  ...ueber,
});

test("Farbdisziplin: fremde Farben und Akzentflut kosten Punkte", () => {
  assert.equal(bewerteFarben(messung(), ds).note, 10);
  const bunt = bewerteFarben(messung({ farben: [{ art: "text", wert: { r: 124, g: 58, b: 237, a: 1 }, flaeche: 0 }] }), ds);
  assert.ok(bunt.note < 10 && bunt.befunde[0].includes("außerhalb der Palette"));
  const flut = bewerteFarben(messung({ farben: [{ art: "grund", wert: rolle("akzent"), flaeche: 30_000 }] }), ds);
  assert.ok(flut.note < SCHWELLE_KRITERIUM, `Akzent auf 30 % der Fläche: ${flut.note}`);
});

test("Typografie: schwache Stufen, kleine Schrift, ungeladene Schrift", () => {
  assert.equal(bewerteTypografie(messung()).note, 10);
  const flach = bewerteTypografie(messung({ typo: { h1: 30, h2: 28, h3: 26, text: 15, familien: [] }, schriftenGeladen: [{ familie: "X", geladen: false }] }));
  assert.ok(flach.note < SCHWELLE_KRITERIUM);
  assert.ok(flach.befunde.some((b) => b.includes("16px")));
  assert.ok(flach.befunde.some((b) => b.includes("nicht geladen")));
});

test("Rhythmus: gleichförmige Sektionen und mobiler Überlauf fallen durch", () => {
  assert.equal(bewerteRhythmus(messung(), messung(), ds).note, 10);
  const gleich = messung({ sektionen: Array.from({ length: 6 }, () => ({ oben: 96, unten: 96, hoehe: 700, grund: "a", zentriert: true })) });
  const r = bewerteRhythmus(gleich, messung({ ueberlauf: true }), ds);
  assert.ok(r.note < SCHWELLE_KRITERIUM);
});

test("Bildintegration: kaputte und hochskalierte Bilder, schwaches Titelbild", () => {
  const b = bewerteBilder(messung({ heroBildAnteil: 0.05, bilder: [{ geladen: false }, { geladen: true, hochskaliert: true, alt: true }] }));
  assert.ok(b.note < SCHWELLE_KRITERIUM);
});

test("Korrekturliste: höchstens fünf Punkte im Vokabular des Builders", () => {
  const urteil = {
    kriterien: {
      farbdisziplin: { note: 5, befunde: ["Akzent"], werte: { akzentAnteil: 0.2 } },
      typografie: { note: 5, befunde: ["h1 nur"], werte: { verhaeltnisH1: 1.8 } },
      rhythmus: { note: 5, befunde: ["Alle Sektionen gleich gepolstert"], werte: {} },
      bildintegration: { note: 5, befunde: ["Titelbild"], werte: { heroBildAnteil: 0.05 } },
      verboteneMuster: { note: 5, befunde: ["drei-gleiche-karten"], werte: {} },
    },
  };
  const k = korrekturListe(urteil, ds);
  assert.ok(k.length <= 5);
  assert.deepEqual(k.map((x) => x.art).slice(0, 4), ["akzent-reduzieren", "typo-skala", "rhythmus", "hero-variante"]);
  assert.ok(k.every((x) => x.grund));
});

test("Zyklus: Korrekturen gehen zurück an den Builder, höchstens drei Runden, Abschluss mit Protokoll", async () => {
  const lead = { ...testLeadFuer("cafe", "third-wave"), slug: "__test-v2-zyklus" };
  const gesehen = [];
  // Ein Judge, der die Überschriften so lange zu klein findet, bis die Skala korrigiert wurde.
  const judge = async ({ html }) => {
    const h1 = Number(/--t-h1: clamp\([^,]+, [^,]+, ([\d.]+)rem\)/.exec(html)[1]) * 16;
    gesehen.push(h1);
    const ok = gesehen.length > 1 && h1 > gesehen[0];
    const typo = { note: ok ? 10 : 5, befunde: ok ? [] : ["h1 nur 2.1× Fließtext"], werte: { verhaeltnisH1: ok ? 3 : 2.1 } };
    const gut = { note: 10, befunde: [], werte: { akzentAnteil: 0, heroBildAnteil: 0.6 } };
    return { bestanden: ok, mittel: ok ? 10 : 9, kriterien: { farbdisziplin: gut, typografie: typo, rhythmus: gut, bildintegration: gut, verboteneMuster: gut } };
  };
  const { protokoll } = await baueImZyklus({ lead, kueche: "cafe", stimmung: "third-wave", zielDir: path.join(tmp, "sites"), slug: lead.slug, beurteileFn: judge, judgeDir: path.join(tmp, "judge"), offline: true, optionen: { fontCss: "" } });
  assert.equal(protokoll.runden.length, 2);
  assert.equal(protokoll.ergebnis, "bestanden");
  assert.deepEqual(protokoll.runden[1].angewandteKorrekturen, ["typo-skala"]);

  const nie = async () => ({ bestanden: false, mittel: 5, kriterien: { farbdisziplin: { note: 5, befunde: ["x"], werte: { akzentAnteil: 0.3 } }, typografie: { note: 5, befunde: ["h1 nur"], werte: { verhaeltnisH1: 1 } }, rhythmus: { note: 10, befunde: [], werte: {} }, bildintegration: { note: 10, befunde: [], werte: { heroBildAnteil: 1 } }, verboteneMuster: { note: 10, befunde: [], werte: {} } } });
  const zweiter = await baueImZyklus({ lead, kueche: "cafe", stimmung: "third-wave", zielDir: path.join(tmp, "sites"), slug: lead.slug, beurteileFn: nie, judgeDir: path.join(tmp, "judge"), offline: true, optionen: { fontCss: "" } });
  assert.equal(zweiter.protokoll.runden.length, MAX_RUNDEN);
  assert.equal(zweiter.protokoll.ergebnis, "abgeschlossen-mit-befunden");

  const log = path.join(tmp, "log.md");
  writeFileSync(log, "# Log\n");
  schreibeJudgeProtokoll([zweiter.protokoll], { logPfad: log, jsonPfad: path.join(tmp, "p.json") });
  schreibeJudgeProtokoll([zweiter.protokoll], { logPfad: log, jsonPfad: path.join(tmp, "p.json") });
  const text = readFileSync(log, "utf-8");
  assert.equal(text.split("judge-protokoll:start").length, 2, "Block wird ersetzt, nicht verdoppelt");
  assert.match(text, /__test-v2-zyklus .*abgeschlossen-mit-befunden/);
});

test("echter Judge im Browser: v2-Seite besteht", { skip: !chromiumPfad() && "kein Chromium" }, async () => {
  const lead = { ...testLeadFuer("japanisch", "washitsu"), slug: "__test-v2-browser" };
  const browser = await starteBrowser();
  try {
    const { protokoll } = await baueImZyklus({ lead, kueche: "japanisch", stimmung: "washitsu", zielDir: path.join(tmp, "sites"), slug: lead.slug, browser, judgeDir: path.join(tmp, "judge"), offline: true, optionen: { fontCss: "" } });
    const r = protokoll.runden.at(-1);
    assert.ok(r.noten.farbdisziplin >= SCHWELLE_KRITERIUM && r.noten.verboteneMuster >= SCHWELLE_KRITERIUM, JSON.stringify(r));
    assert.ok(r.mittel >= 7, JSON.stringify(r.befunde));
  } finally {
    await browser.close();
  }
  void beurteile;
});
