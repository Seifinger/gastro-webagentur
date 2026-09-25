import { test } from "node:test";
import assert from "node:assert/strict";
import { baueSite } from "../v2/build/siteBuilder.js";
import { karteAusDaten, auswahlFuerStartseite, KARTE_PFAD } from "../v2/build/speisekarte.js";
import { pruefeFunktionsVertrag, menuForCuisine } from "../v2/build/v1Funktionen.js";
import { lint } from "../v2/build/antiSlopLint.js";
import { karteDesBetriebs } from "../v2/integration/demoBau.js";
import { DEMO_LEADS } from "../src/demoLeads.js";
import { italienischeBetriebskarte, grosseKarte } from "./hilfen/speisekarten.js";

// Eigene Speisekarten-Seite für Seiten mit Ausdruck (v2/build/speisekarte.js,
// sektionen/speisekarte.js). Browser-Abläufe: v2-speisekarte-browser.test.js.

const lead = (kueche) => DEMO_LEADS.find((l) => l.kueche === kueche);
const bau = (kueche = "italienisch", optionen = {}) =>
  baueSite({ lead: lead(kueche), kueche, optionen: { fiktiv: true, fontCss: "", ausdruck: "gesellig", ...optionen } });
const pageData = (html) => JSON.parse(html.match(/window\.PAGE_DATA = (\{.*?\});<\/script>/)[1]);
const kopf = (html) => html.slice(html.indexOf('<header class="kopf"'), html.indexOf("</header>", html.indexOf('<header class="kopf"')));

test("Startseite und Speisekarten-Seite entstehen für denselben Betrieb", () => {
  const { html, seiten, bericht } = bau();
  const karte = seiten[KARTE_PFAD];
  assert.ok(karte, "speisekarte/index.html fehlt");
  assert.equal(KARTE_PFAD, "speisekarte/index.html");
  for (const muster of [/<meta name="v2-designsystem" content="([^"]+)">/, /<meta name="v2-ausdruck" content="([^"]+)">/, /<a class="kopf-marke" href="[^"]*">([^<]+)<\/a>/]) {
    assert.equal(karte.match(muster)[1], html.match(muster)[1]);
  }
  assert.match(karte, /<title>Speisekarte – Trattoria Bella Vista<\/title>/);
  assert.match(karte, /<h1>Speisekarte<\/h1>/);
  assert.equal(pageData(karte).warenkorb.schluessel, pageData(html).warenkorb.schluessel, "ein Warenkorb für beide Seiten");
  assert.deepEqual(pageData(karte).warenkorb.karte, pageData(html).warenkorb.karte);
  assert.equal(bericht.speisekarte.pfad, KARTE_PFAD);
  // Beide Seiten bestehen Funktionsvertrag und Anti-Slop-Lint.
  assert.deepEqual(pruefeFunktionsVertrag(html, { hinzufuegen: false }), []);
  assert.deepEqual(pruefeFunktionsVertrag(karte, { seite: "karte" }), []);
  assert.equal(lint(karte).ok, true);
});

test("Seiten ohne Ausdruck bekommen keine zweite Seite (bleiben wie bisher)", () => {
  const { seiten, html } = baueSite({ lead: lead("italienisch"), kueche: "italienisch", optionen: { fiktiv: true, fontCss: "" } });
  assert.deepEqual(seiten, {});
  assert.ok(!html.includes("speisekarte/index.html"));
  assert.ok(!/"warenkorb":/.test(html));
});

test("Header: Speisekarte führt zur neuen Seite, von dort zurück zur Startseite (relativ)", () => {
  const { html, seiten } = bau();
  assert.match(kopf(html), /<nav class="kopf-nav" aria-label="Hauptnavigation"><a href="speisekarte\/index\.html">Speisekarte<\/a>/);
  const k = kopf(seiten[KARTE_PFAD]);
  assert.match(k, /<a class="kopf-marke" href="\.\.\/index\.html">/);
  assert.match(k, /<a href="\.\/index\.html" aria-current="page">Speisekarte<\/a><a href="\.\.\/index\.html">Startseite<\/a><a href="\.\.\/index\.html#reservierung">Reservieren<\/a>/);
  // Keine absoluten Pfade: funktioniert lokal, unter /<repo>/<slug>/ und auf einer eigenen Domain.
  for (const seite of [html, seiten[KARTE_PFAD]]) {
    assert.ok(!/\b(?:href|src)="\/(?!\/)/.test(seite), "absoluter Pfad gefunden");
  }
});

test("Bestellen: live → 'Bestellen' zur Karte; Vorschau → ehrlich 'Probebestellung'; aus → kein Bestellknopf, Karte erreichbar", () => {
  const live = bau("italienisch", { apiUrl: "http://localhost:3200" });
  assert.match(kopf(live.html), /href="speisekarte\/index\.html" data-aktion="bestellen">Bestellen<\/a>/);
  assert.equal(pageData(live.html).karteUrl, KARTE_PFAD);
  assert.ok(!live.seiten[KARTE_PFAD].includes('<p class="karte-probe">Probebestellung'));

  const vorschau = bau();
  assert.match(kopf(vorschau.html), /data-aktion="bestellen">Probebestellung<\/a>/);
  assert.ok(!/data-aktion="bestellen">Bestellen</.test(vorschau.html));
  assert.match(vorschau.seiten[KARTE_PFAD], /<p class="karte-probe">Probebestellung: [^<]*verschickt wird nichts\.<\/p>/);

  const aus = bau("italienisch", { bestellung: false, apiUrl: "http://localhost:3200" });
  assert.ok(!aus.html.includes('data-aktion="bestellen"'), "kein Bestellknopf ohne Bestellweg");
  assert.ok(!aus.html.includes('id="bar-order"'));
  assert.match(aus.html, /<a class="btn btn-ghost" href="speisekarte\/index\.html">Speisekarte<\/a>/, "Karte bleibt erreichbar");
  const karteAus = aus.seiten[KARTE_PFAD];
  assert.ok(!karteAus.includes("data-add="), "keine Hinzufügen-Knöpfe");
  assert.ok(!/"warenkorb":/.test(karteAus) && !/"karteUrl":/.test(aus.html));
  assert.match(karteAus, /Bestellungen nehmen wir telefonisch oder vor Ort an\./);
  assert.equal(aus.bericht.speisekarte.bestellung, "aus");
  assert.deepEqual(pruefeFunktionsVertrag(karteAus, { seite: "karte", hinzufuegen: false }), []);
});

test("Plus auf der Startseite: Link zum Gericht auf der Speisekarte, kein Hinzufügen", () => {
  const { html, seiten } = bau();
  assert.ok(!html.includes("data-add="), "die Startseite legt nichts in den Warenkorb");
  const links = [...html.matchAll(/href="speisekarte\/index\.html#(gericht-[a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(links.length >= 4, `zu wenige Gericht-Links: ${links.length}`);
  for (const id of links) assert.match(seiten[KARTE_PFAD], new RegExp(`<li class="karte-gericht[^"]*" id="${id}">`), id);
  assert.match(html, /<a class="mini-add" href="speisekarte\/index\.html#gericht-[a-z0-9-]+" aria-label="[^"]+ auf der Speisekarte ansehen">/);
  assert.match(html, /<a class="btn btn-primary auswahl-ganz" href="speisekarte\/index\.html">Gesamte Speisekarte ansehen<\/a>/);
  // Das angesprungene Gericht ist auch ohne Skript markiert und landet unter der Kopfzeile.
  assert.match(seiten[KARTE_PFAD], /\.karte-gericht:target \{/);
  assert.match(seiten[KARTE_PFAD], /\[id\^="kat-"\], \[id\^="gericht-"\] \{ scroll-margin-top: calc\(var\(--kopf-ist/);
});

test("Startseite: kleine Auswahl statt ganzer Karte, Anker und QR-Ziele bleiben", () => {
  const { html, bericht } = bau();
  const menu = menuForCuisine("italienisch");
  const alle = menu.kategorien.reduce((s, k) => s + k.gerichte.length, 0);
  const zeilen = (html.match(/<li class="karten-zeile">/g) || []).length;
  assert.ok(zeilen >= 3 && zeilen <= 5, `Auswahl ${zeilen}`);
  assert.ok(zeilen < alle);
  // Tisch-Gerichte kommen in der Auswahl nicht noch einmal vor.
  const tisch = [...html.slice(html.indexOf('id="highlights"'), html.indexOf('id="karte"')).matchAll(/#gericht-([a-z0-9-]+)/g)].map((m) => m[1]);
  assert.equal(tisch.length, 3);
  for (const s of tisch) assert.ok(!bericht.speisekarte.startseite.includes(s));
  // Die Startseite bleibt index.html; bisherige Anker (#karte, #reservierung, #kontakt) gibt es weiter.
  for (const anker of ["karte", "reservierung", "kontakt"]) assert.match(html, new RegExp(`id="${anker}"`));
});

test("Kategorien kommen aus den Daten: italienische Betriebskarte mit Pizza/Pasta, leere Kategorie fehlt", () => {
  const menu = italienischeBetriebskarte();
  const karte = karteAusDaten(menu);
  assert.deepEqual(karte.kategorien.map((k) => k.name), ["Vorspeisen", "Pizza", "Pasta", "Fleisch", "Desserts", "Getränke"]);
  assert.ok(!karte.gerichte.some((g) => g.name === "Pizza des Monats"), "nicht freigegeben");
  const getraenke = karte.kategorien.find((k) => k.name === "Getränke");
  assert.deepEqual(getraenke.gruppen.map((g) => g.name), ["Alkoholfrei", "Wein"], "Gruppe ohne aktive Gerichte fehlt");
  // Varianten: jede einzeln bestellbar, Preis aus der Karte
  assert.deepEqual(karte.katalog["margherita--26-cm"], ["Margherita (Ø 26 cm)", 8.5]);
  assert.deepEqual(karte.katalog["margherita--32-cm"], ["Margherita (Ø 32 cm)", 10.5]);
  assert.equal(karte.katalog.margherita, undefined);
  // Ausverkauft: sichtbar, aber nicht im Warenkorb-Katalog
  assert.ok(karte.gerichte.some((g) => g.name === "Tartufo" && g.ausverkauft));
  assert.equal(karte.katalog.tartufo, undefined);

  const { html, seiten } = bau("italienisch", { menu });
  const k = seiten[KARTE_PFAD];
  assert.deepEqual([...k.matchAll(/<h2 id="kat-[a-z0-9-]+-titel">([^<]+)<\/h2>/g)].map((m) => m[1]), ["Vorspeisen", "Pizza", "Pasta", "Fleisch", "Desserts", "Getränke"]);
  assert.ok(!k.includes(">Fisch<"), "leere Kategorie erscheint nicht");
  assert.match(k, /<nav class="karten-sprung karten-sprung--fest karten-sprung--seite" aria-label="Kategorien der Speisekarte"><a href="#kat-vorspeisen">Vorspeisen<span class="anzahl">2<\/span><\/a><a href="#kat-pizza">Pizza<span class="anzahl">3<\/span>/);
  assert.match(k, /<h3 class="karte-gruppe-name">Alkoholfrei<\/h3>/);
  assert.match(k, /<span class="karte-variante-name">Ø 26 cm<\/span><span class="menue-punkte" aria-hidden="true"><\/span><span class="preis">8,50 €<\/span><button class="mini-add" type="button" data-add="margherita--26-cm" data-name="Margherita \(Ø 26 cm\)" data-preis="8.5"/);
  assert.match(k, /<p class="karte-extras"><span>Extras:<\/span> Büffelmozzarella \(\+ 2,50 €\) · Scharfes Öl<\/p>/);
  const tartufo = k.slice(k.indexOf('id="gericht-tartufo"'), k.indexOf("</li>", k.indexOf('id="gericht-tartufo"')));
  assert.match(tartufo, /Heute ausverkauft/);
  assert.ok(!tartufo.includes("data-add"), "ausverkauft: nicht bestellbar");
  // Ohne Fotos in der Karte: kein Bild, kein leerer Bildrahmen
  assert.ok(!k.includes(`<figure class="karte-kategorie-bild">`));
  // Signatur-Gericht steht in der Auswahl der Startseite (mit "ab"-Preis)
  assert.match(html, /<span class="karten-name">Margherita<\/span>.*?<span class="preis">ab 8,50 €<\/span>/s);
  assert.equal(lint(k).ok, true);
});

test("Anders strukturierte Küche: japanische Musterkarte flach, mit ihren eigenen Kategorien", () => {
  const { seiten, bericht } = bau("japanisch", { ausdruck: "kino" });
  assert.deepEqual(bericht.speisekarte.kategorien.map((k) => k.name), menuForCuisine("japanisch").kategorien.map((k) => k.name));
  assert.ok(!seiten[KARTE_PFAD].includes('<div class="karte-gruppe">'), "flache Karte bleibt flach");
  assert.ok(!bericht.speisekarte.kategorien.some((k) => /Pizza|Pasta/.test(k.name)));
});

test("Stabile Gericht-Kennungen: Umsortieren und Ergänzen ändert keinen Link", () => {
  const menu = italienischeBetriebskarte();
  const vorher = Object.fromEntries(karteAusDaten(menu).gerichte.map((g) => [g.name, g.anker]));
  const umgebaut = structuredClone(menu);
  umgebaut.kategorien[1].gerichte.reverse();
  umgebaut.kategorien.unshift({ name: "Neu", gerichte: [{ name: "Focaccia", preis: 4 }] });
  const nachher = Object.fromEntries(karteAusDaten(umgebaut).gerichte.map((g) => [g.name, g.anker]));
  for (const [name, anker] of Object.entries(vorher)) assert.equal(nachher[name], anker, name);
  // Gleiche Namen bekommen eindeutige Kennungen, eigene id gewinnt
  const doppelt = karteAusDaten({ kategorien: [{ name: "A", gerichte: [{ name: "Salat", preis: 5 }, { name: "Salat", preis: 6 }, { name: "X", id: "haus-salat", preis: 7 }] }] });
  assert.deepEqual(doppelt.gerichte.map((g) => g.schluessel), ["salat", "salat-2", "haus-salat"]);
  // Zweimal gebaut: identische Links
  assert.equal(bau().seiten[KARTE_PFAD], bau().seiten[KARTE_PFAD]);
});

test("Auswahl der Startseite: Signatur zuerst, dann reihum je Kategorie, nie Ausverkauftes", () => {
  const karte = karteAusDaten(italienischeBetriebskarte());
  const auswahl = auswahlFuerStartseite(karte, { anzahl: 4 });
  assert.equal(auswahl[0].name, "Margherita");
  assert.deepEqual(auswahl.map((g) => g.kategorie), ["Pizza", "Vorspeisen", "Pasta", "Fleisch"]);
  assert.ok(!auswahlFuerStartseite(karte, { anzahl: 50 }).some((g) => g.ausverkauft));
});

test("Konzept-Demo: Musterkarte klar gekennzeichnet, nie eine echte Bestellung", () => {
  const echt = { name: "Pizzeria Beispielhaft", ort: "Altötting", adresse: "", telefon: "", placeId: "ChIJtest" };
  const { html, seiten, bericht } = baueSite({ lead: echt, kueche: "italienisch", optionen: { fontCss: "", ausdruck: "gesellig", konzept: true, fiktiv: false, veroeffentlicht: true, apiUrl: "http://localhost:3200" } });
  const k = seiten[KARTE_PFAD];
  assert.equal(pageData(html).apiUrl, "", "Konzept-Demo sendet nichts an einen Betriebsserver");
  assert.equal(pageData(k).apiUrl, "");
  assert.match(k, /<meta name="demo-art" content="konzept">/);
  assert.match(k, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(k, /Konzept-Demo – unverbindlicher Entwurf, nicht die offizielle Website von Pizzeria Beispielhaft\./);
  assert.match(k, /<h1>So könnte die Speisekarte aussehen<\/h1>/);
  assert.match(k, /Beispielgerichte und Beispielpreise der Küchenrichtung – nicht die Karte von Pizzeria Beispielhaft\./);
  assert.match(k, /<p class="karte-fuss">Musterkarte: Gerichte und Preise sind Beispiele der Küchenrichtung, nicht das Angebot von Pizzeria Beispielhaft\.<\/p>/);
  assert.match(html, /Ganze Musterkarte ansehen/);
  assert.equal(bericht.speisekarte.quelle, "musterkarte");
  assert.equal(bericht.speisekarte.bestellung, "vorschau");

  // Mit Karte des Betriebs: keine "Musterkarte"-Behauptung, Demo-Kennzeichnung bleibt.
  const mitKarte = baueSite({ lead: echt, kueche: "italienisch", optionen: { fontCss: "", ausdruck: "gesellig", konzept: true, fiktiv: false, menu: italienischeBetriebskarte() } });
  assert.ok(!/Musterkarte/.test(mitKarte.seiten[KARTE_PFAD]));
  assert.match(mitKarte.seiten[KARTE_PFAD], /Konzept-Demo – unverbindlicher Entwurf/);
  assert.equal(mitKarte.bericht.speisekarte.quelle, "betrieb");
});

test("demoBau: Karte des Betriebs aus lead-edits, sonst Musterkarte", () => {
  assert.equal(karteDesBetriebs({}, "italienisch"), null);
  assert.equal(karteDesBetriebs({ speisekarte: { kategorien: [] } }, "italienisch"), null);
  const k = karteDesBetriebs({ speisekarte: { kategorien: italienischeBetriebskarte().kategorien } }, "italienisch");
  assert.equal(k.quelle, "betrieb");
  assert.equal(k.label, menuForCuisine("italienisch").label);
});

test("Große Karte (12 × 20): baut durch alle Gates, Navigation mobil scrollbar mit großen Tippflächen", () => {
  const { seiten, bericht } = bau("bayerisch", { menu: grosseKarte() });
  const k = seiten[KARTE_PFAD];
  assert.equal(bericht.speisekarte.gerichte, 240);
  assert.equal((k.match(/<nav class="karten-sprung[^"]*"[^>]*>(.*?)<\/nav>/s)[1].match(/<a /g) || []).length, 12);
  assert.equal((k.match(/data-add="/g) || []).length, 240);
  assert.match(k, /\.karten-sprung--fest \{ position: sticky; top: var\(--kopf-ist, var\(--kopf-hoehe-mobil\)\); z-index: 30; flex-wrap: nowrap; overflow-x: auto;/);
  assert.match(k, /\.karten-sprung--seite a \{ gap: var\(--s-1\); min-height: var\(--s-6\); \}/);
  assert.match(k, /\.karte-gericht-kopf h3 \{[^}]*overflow-wrap: anywhere;/, "lange Namen brechen um");
  assert.equal(lint(k).ok, true);
  assert.deepEqual(pruefeFunktionsVertrag(k, { seite: "karte" }), []);
});

test("Bilder auf der Speisekarte: höchstens eines je Kategorie, nur zulässige, Pfade eine Ebene tiefer", () => {
  const gerichtBild = (g) => (g?.id === "1-0" ? { src: "medien/gericht-1-0.jpg", datei: "/x/g.jpg", herkunft: "eigen", quelle: "dashboard-upload" }
    : g?.id === "1-1" ? { src: "medien/gericht-1-1.jpg", herkunft: "eigen" }
    : g?.id === "0-0" ? { src: "https://images.unsplash.com/x", herkunft: "platzhalter", quelle: "stock:x" }
    : g?.id === "2-0" ? { src: "data:image/svg+xml,x", herkunft: "platzhalter", quelle: "platzhalter:svg" } : null);
  const medien = { hero: { src: "h.jpg", herkunft: "eigen" }, haus: null, team: null, bestseller: null, gericht: gerichtBild };
  const echt = { name: "Pizzeria Foto", ort: "Burghausen", placeId: "p1" };
  const { seiten, dateien } = baueSite({ lead: echt, kueche: "italienisch", optionen: { fontCss: "", ausdruck: "gesellig", fiktiv: false, medien } });
  const k = seiten[KARTE_PFAD];
  assert.equal((k.match(/<figure class="karte-kategorie-bild">/g) || []).length, 1, "Stock auf echter Seite und SVG-Platzhalter nie");
  assert.match(k, /<figure class="karte-kategorie-bild"><img src="\.\.\/medien\/gericht-1-0\.jpg" alt="Margherita"/);
  assert.ok(dateien.some((d) => d.src === "medien/gericht-1-0.jpg"), "Bild wird mitkopiert");
  // Auf erfundenen Beispielseiten darf das Stockfoto stehen.
  const fiktiv = bau("italienisch", { medien });
  assert.equal((fiktiv.seiten[KARTE_PFAD].match(/<figure class="karte-kategorie-bild">/g) || []).length, 2);
});

test("Schriften der Speisekarte liegen eine Ebene tiefer (../)", () => {
  const { seiten, html } = baueSite({ lead: lead("italienisch"), kueche: "italienisch", optionen: { fiktiv: true, ausdruck: "gesellig", fontsPfad: "../assets/fonts" } });
  const pfadStart = html.match(/url\(['"]?([^'")]+\.woff2)/)?.[1];
  const pfadKarte = seiten[KARTE_PFAD].match(/url\(['"]?([^'")]+\.woff2)/)?.[1];
  if (!pfadStart) return; // ohne lokale Schriftdateien nichts zu prüfen
  assert.ok(pfadStart.startsWith("../assets/fonts/"));
  assert.equal(pfadKarte, `../${pfadStart}`);
});
