import { test } from "node:test";
import assert from "node:assert/strict";
import { baueSite } from "../v2/build/siteBuilder.js";
import { pruefeFunktionsVertrag } from "../v2/build/v1Funktionen.js";
import { lint } from "../v2/build/antiSlopLint.js";
import { DEMO_LEADS } from "../src/demoLeads.js";
import { testLeadFuer } from "../v2/build/testLeads.js";

const demo = DEMO_LEADS.find((l) => l.kueche === "bayerisch");
const bau = (optionen = {}, lead = demo) =>
  baueSite({ lead, kueche: lead.kueche, stimmung: lead.stimmung, optionen: { fiktiv: true, veroeffentlicht: true, fontCss: "", ausdruck: "gesellig", ...optionen } });
const idsInReihenfolge = (html) => [...html.matchAll(/<section class="[^"]*" id="([a-z-]+)"/g)].map((m) => m[1]).filter((id) => !id.startsWith("karte-"));

test("gesellig: Abfolge aus dem Profil, keine Gästestimmen, keine Häkchen", () => {
  const { html } = bau();
  assert.deepEqual(idsInReihenfolge(html), ["willkommen", "highlights", "karte", "ambiente", "reservierung", "kontakt"]);
  assert.ok(!html.includes('id="stimmen"'));
  assert.ok(!html.includes('class="pluspunkte"'));
  assert.ok(!html.includes('class="leiste"'));
  // Die Startseite legt nichts selbst in den Warenkorb – das geschieht auf der Speisekarte.
  assert.deepEqual(pruefeFunktionsVertrag(html, { hinzufuegen: false }), []);
  assert.equal(lint(html).ok, true);
});

test("Tisch: drei Gerichte als Collage, jedes führt zum Gericht auf der Speisekarte", () => {
  const { html } = bau();
  const tisch = html.slice(html.indexOf('id="highlights"'), html.indexOf('id="karte"'));
  for (const n of [1, 2, 3]) assert.ok(tisch.includes(`teller teller--${n}`), `teller--${n}`);
  assert.equal((tisch.match(/data-add="/g) || []).length, 0, "kein heimliches Hinzufügen");
  assert.equal((tisch.match(/href="speisekarte\/index\.html#gericht-[a-z0-9-]+"/g) || []).length, 3);
});

test("Einladung: rechts nur echte Angaben (Adresse, Route, Google-Note)", () => {
  const { html } = bau();
  const einladung = html.slice(html.indexOf('id="willkommen"'), html.indexOf('id="highlights"'));
  assert.match(einladung, /<address class="einladung-adresse">Musterstraße 1, 84453 Mühldorf am Inn<br><a href="https:\/\/www\.google\.com\/maps\/search\//);
  assert.match(einladung, /4,7<\/strong> von 5 auf Google/);
});

test("Haus-Band: Stock als 'unser Haus' nur auf Beispielseiten, SVG-Platzhalter nie", () => {
  const stock = { src: "https://images.unsplash.com/x", herkunft: "platzhalter", quelle: "stock:x" };
  const medien = (haus) => ({ hero: { src: "h.jpg", herkunft: "eigen" }, haus, team: null, bestseller: null, gericht: () => null });
  assert.match(bau({ medien: medien(stock) }).html, /<figure class="haus-band-bild">/);
  const echt = testLeadFuer("bayerisch", "wirtshaus");
  assert.ok(!bau({ fiktiv: false, medien: medien(stock) }, echt).html.includes('<figure class="haus-band-bild">'));
  const svg = { src: "data:image/svg+xml,x", herkunft: "platzhalter", quelle: "platzhalter:svg" };
  assert.match(bau({ medien: medien(svg) }).html, /haus-band haus-band--ohne-bild/);
  assert.ok(bau({ fiktiv: false, medien: medien({ src: "medien/haus.jpg", herkunft: "eigen", quelle: "dashboard-upload" }) }, echt).html.includes('<figure class="haus-band-bild">'));
});

test("Atmosphäre: Lindenblatt für die Alte Linde, dezent; keine bei handwerk", () => {
  const { html } = bau();
  assert.match(html, /<div class="atmosphaere" aria-hidden="true" style="--atmo-deckkraft: 0\.08"><svg viewBox="0 0 240 260"/);
  assert.equal((html.match(/id="[a-z]+" data-atmosphaere="an"/g) || []).length, 3);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\) \{\s*\.atmosphaere \{ display: none; \}/);
  assert.ok(!bau({ ausdruck: "handwerk" }).html.includes('class="atmosphaere"'));
});

test("alle vier Ausdrucksweisen bauen quer durch die Archetypen durch alle Gates", () => {
  for (const ausdruck of ["kino", "gesellig", "handwerk", "editorial"]) {
    for (const [kueche, stimmung] of [["bayerisch", "kellerstube"], ["italienisch", "costiera"], ["japanisch", "washitsu"], ["cafe", "third-wave"]]) {
      const lead = testLeadFuer(kueche, stimmung);
      const { html } = baueSite({ lead, kueche, stimmung, optionen: { fiktiv: true, fontCss: "", ausdruck } });
      assert.deepEqual(pruefeFunktionsVertrag(html, { hinzufuegen: false }), [], `${ausdruck} ${kueche}`);
    }
  }
});

test("AP7 Karte: Sprungleiste nur mit Ausdruck (jetzt auf der Speisekarten-Seite), Plus-Knöpfe mit vergrößerter Tippfläche", () => {
  const { html, seiten } = bau();
  assert.match(seiten["speisekarte/index.html"], /<nav class="karten-sprung karten-sprung--fest karten-sprung--seite" aria-label="Kategorien der Speisekarte"><a href="#kat-zum-anfangen">/);
  assert.match(html, /section\[id\^="karte-"\] \{ scroll-margin-top: calc\(var\(--kopf-ist/);
  assert.match(html, /\.mini-add::after \{ content: ""; position: absolute; inset: -4px; \}/);
  assert.match(html, /\.tippt \.mobilebar \{ opacity: 0;/);
  const ohne = baueSite({ lead: demo, kueche: "bayerisch", optionen: { fiktiv: true, fontCss: "" } }).html;
  assert.ok(!ohne.includes("karten-sprung--fest"));
});

test("AP8 Anfahrt und Fuß: Adresse als Schild, Zeitfenster untereinander, nur echte Kontaktwege", () => {
  const { html } = bau();
  const anfahrt = html.slice(html.indexOf('id="kontakt"'));
  assert.match(anfahrt, /<h2 class="anfahrt-adresse">Musterstraße 1<span>84453 Mühldorf am Inn<\/span><\/h2>/);
  assert.match(anfahrt, /<span class="fenster"><span>11:30 – 14:00<\/span><span>17:00 – 22:00<\/span><\/span>/);
  assert.ok(!/href="tel:/.test(anfahrt), "keine Filmnummer auf erfundenen Seiten");
  assert.match(html, /<footer class="fuss-haus auf-tint">/);
  const echt = testLeadFuer("bayerisch", "wirtshaus");
  const echtHtml = bau({ fiktiv: false }, { ...echt, telefon: "08631 12345" }).html;
  assert.match(echtHtml, /<p class="reservierung-telefon">Lieber anrufen\? <a href="tel:0863112345">08631 12345<\/a><\/p>/);
  assert.match(echtHtml.slice(echtHtml.indexOf('id="kontakt"')), /href="tel:0863112345"/);
  assert.match(echtHtml.slice(echtHtml.indexOf('id="kontakt"')), /Öffnungszeiten <span class="marke-klein marke-klein--signal">Platzhalter/);
});
