import { test } from "node:test";
import assert from "node:assert/strict";
import { baueSite, BuildAbbruch, waehleHeroVariante, wendeKorrekturenAn, pruefeHeroVarianten } from "../v2/build/siteBuilder.js";
import { lint } from "../v2/build/antiSlopLint.js";
import { seitenSkript, pruefeFunktionsVertrag, PFLICHT_IDS } from "../v2/build/v1Funktionen.js";
import { STIL } from "../v2/build/stil.js";
import { BEWEGUNG_CSS } from "../v2/build/bewegung.js";
import { ladeDesignsystem } from "../v2/build/designsystemGenerator.js";
import { testLeads, testLeadFuer } from "../v2/build/testLeads.js";
import { buildLandingPage } from "../src/landingPageGenerator.js";

const bau = (lead, optionen = {}) => baueSite({ lead, kueche: lead.kueche, stimmung: lead.stimmung, optionen: { fiktiv: true, fontCss: "", ...optionen } });

test("alle 36 Test-Leads bestehen alle Gates", () => {
  for (const lead of testLeads()) {
    const { html, bericht } = bau(lead);
    assert.match(html, /<meta name="engine" content="v2">/);
    assert.equal(bericht.designsystem, `${lead.kueche}--${lead.stimmung}`);
  }
});

test("das v1-Skript steckt Zeichen für Zeichen in der v2-Seite", () => {
  const v1 = buildLandingPage({ name: "Test", placeId: "x" });
  const skript = seitenSkript();
  assert.ok(v1.includes(`<script>${skript}</script>`), "Auslesen aus v1 stimmt nicht");
  const { html } = bau(testLeadFuer("italienisch", "trattoria"));
  assert.ok(html.includes(`<script>${skript}</script>`));
});

test("Funktionsvertrag: jede ID des v1-Skripts ist vorhanden, apiUrl landet in PAGE_DATA", () => {
  const { html } = bau(testLeadFuer("japanisch", "omakase"), { apiUrl: "http://localhost:3200/" });
  assert.deepEqual(pruefeFunktionsVertrag(html), []);
  for (const id of PFLICHT_IDS) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /"apiUrl":"http:\/\/localhost:3200"/);
  assert.ok(!html.includes("Entwurfsansicht:"), "mit Betriebsserver kein Entwurfshinweis");
});

test("WCAG-Gate bricht bei zu schwachem Kontrast ab", () => {
  const lead = testLeadFuer("italienisch", "trattoria");
  const ds = structuredClone(ladeDesignsystem("italienisch", "trattoria"));
  ds.farben.rollen.textLeise.hex = "#d9d4cc";
  assert.throws(() => bau(lead, { designsystem: ds }), (e) => e instanceof BuildAbbruch && e.gate === "wcag-aa");
});

test("Hero-Gate verlangt drei strukturell verschiedene Aufbauten", () => {
  const ds = structuredClone(ladeDesignsystem("italienisch", "trattoria"));
  ds.layout.heroVarianten = ["tafel", "spalte-bild"];
  assert.equal(pruefeHeroVarianten(ds).length, 1);
  assert.throws(() => bau(testLeadFuer("italienisch", "trattoria"), { designsystem: ds }), (e) => e.gate === "hero-varianten");
});

test("Hero-Wahl ist seed-deterministisch und nutzt über viele Leads mindestens drei Aufbauten", () => {
  const ds = ladeDesignsystem("bayerisch", "wirtshaus");
  const gesehen = new Set();
  for (let i = 0; i < 60; i += 1) {
    const lead = { name: `Gasthof ${i}`, placeId: `seed-${i}`, kueche: "bayerisch", stimmung: "wirtshaus" };
    const a = bau(lead).bericht.heroVariante;
    assert.equal(bau(lead).bericht.heroVariante, a, "gleicher Lead, gleicher Hero");
    gesehen.add(a);
  }
  assert.ok(gesehen.size >= 3, [...gesehen].join(","));
  assert.equal(waehleHeroVariante(ds, 0, "karte"), "karte");
});

test("Korrekturen ändern nur die Kopie des Designsystems und werden protokolliert", () => {
  const original = ladeDesignsystem("cafe", "third-wave");
  const vorher = JSON.stringify(original);
  const { ds, protokoll } = wendeKorrekturenAn(original, [{ art: "typo-skala", faktor: 1.1 }, { art: "sektionsabstand", wert: "luftiger" }, { art: "akzent-reduzieren" }]);
  assert.equal(JSON.stringify(original), vorher);
  assert.equal(protokoll.length, 3);
  assert.ok(ds.typografie.skala.stufen.h1.px > original.typografie.skala.stufen.h1.px);
  assert.equal(ds.spacing.sektion.desktop % 8, 0);
  const { html } = bau(testLeadFuer("cafe", "third-wave"), { korrekturen: [{ art: "akzent-reduzieren" }] });
  assert.match(html, /class="[^"]*akzent-sparsam/);
});

test("Komponenten-CSS enthält keinen einzigen Farbwert", () => {
  for (const css of [STIL, BEWEGUNG_CSS]) assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(\s*\d/i);
});

test("Lint: findet verbotene Schrift, Mehrfarb-Verlauf, kleine Schrift, Rasterbruch, Glas, Glow, Emoji, Pillen-Knopf", () => {
  const html = `<html><head><style>
    :root { --s-3: 24px; }
    body { font-family: 'Inter', sans-serif; font-size: 14px; }
    .a { background: linear-gradient(90deg, #7c3aed, #2563eb); }
    .b { padding: 13px; }
    .c { backdrop-filter: blur(8px); }
    .d { text-shadow: 0 0 12px var(--x); }
    .btn { border-radius: 999px; }
  </style></head><body><p>Lecker 🍕</p></body></html>`;
  const regeln = new Set(lint(html).fehler.map((f) => f.regel));
  for (const r of ["generische-schrift", "mehrfarb-verlauf", "kleine-textschrift", "raster-bruch", "glasmorphismus", "leucht-schatten", "emoji-icons", "pillen-flut", "hartkodierte-farbe"]) {
    assert.ok(regeln.has(r), `${r} nicht erkannt`);
  }
});

test("Lint: ein Ton in mehreren Deckkräften ist kein Mehrfarb-Verlauf", () => {
  const html = `<style>:root{--t: 20,20,20;} body{font-size:17px} .x{background:linear-gradient(180deg, rgba(20,20,20,.1), rgba(20,20,20,.9))}</style>`;
  assert.ok(!lint(html).fehler.some((f) => f.regel === "mehrfarb-verlauf"));
});

test("Lint: drei gleiche Karten mit Bild und Überschrift, aber nicht bei verschiedenen Karten", () => {
  const karte = (k = "karte") => `<article class="${k}"><img src="a.jpg" alt=""><h3>X</h3><p>Y</p></article>`;
  const basis = "<style>body{font-size:17px}</style>";
  assert.ok(lint(`${basis}<div class="grid">${karte()}${karte()}${karte()}</div>`).fehler.some((f) => f.regel === "drei-gleiche-karten"));
  assert.ok(!lint(`${basis}<div class="grid">${karte("karte gross")}${karte()}${karte()}</div>`).fehler.some((f) => f.regel === "drei-gleiche-karten"));
});

test("Lint erkennt v1 als generisch (Inter) – v2 besteht", () => {
  const v1 = buildLandingPage({ name: "Test", placeId: "x" });
  assert.ok(lint(v1).fehler.some((f) => f.regel === "generische-schrift"));
  assert.equal(lint(bau(testLeadFuer("bayerisch", "wirtshaus")).html).ok, true);
});

test("fiktive Seiten tragen keinen Platzhalter-Hinweis in der Leiste, echte schon", () => {
  const lead = testLeadFuer("griechisch", "olivenhain");
  assert.ok(!/class="leiste-hinweis"/.test(bau(lead).html));
  assert.ok(/class="leiste-hinweis"/.test(bau(lead, { fiktiv: false }).html));
});
