import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { richteTestLeadsEin } from "./hilfen/testLead.js";
import { pruefeOeffentlicheAusgabe, istFiktivesBeispiel, liegtInDocs, alteOeffentlicheDemo, slugHash, ladeAbgeschaltete } from "../src/oeffentlichkeit.js";
import { schalteAltbestandAb, hinweisSeite, leadOrdner } from "../scripts/demoMigration.mjs";
import { baueUndSchreibeEinzelnenEntwurf } from "../src/publishSite.js";
import { schreibeSeiten } from "../src/buildSite.js";
import { baueDemo } from "../v2/integration/demoBau.js";
import { baueSite } from "../v2/build/siteBuilder.js";
import { baueImZyklus } from "../v2/build/zyklus.js";
import { loeseMedien, medienStatus } from "../v2/assets-pipeline/mediaGenerator.js";
import { themeForLead } from "../src/landingPageGenerator.js";
import { ausdruckZumBauen, stimmungFuerSlug } from "../v2/build/ausdruck.js";
import { praesentationsHandler, startePraesentation, beendePraesentation, lanAdresse } from "../src/praesentation.js";
import { DEMO_LEADS } from "../src/demoLeads.js";
import { docsDir } from "../src/config.js";

// Öffentlich vs. lokal (src/oeffentlichkeit.js): Typ A (fiktive Beispiele)
// bleibt auf GitHub Pages, Typ B (Konzept-Demos echter Betriebe) nie.

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP = mkdtempSync(path.join(tmpdir(), "oeffentlichkeit-"));
const LEADS = [
  { slug: "testdemo-oeff-bayer-0q1", placeId: "ChIJtestOeffBay", name: "Gasthof Zur Probe", ort: "Mühldorf am Inn", adresse: "Stadtplatz 1, 84453 Mühldorf am Inn", rating: 4.6, anzahlBewertungen: 321 },
  { slug: "testdemo-oeff-ital-0q2", placeId: "ChIJtestOeffIta", name: "Pizzeria Probe", ort: "Altötting", adresse: "Kapellplatz 2, 84503 Altötting", rating: 4.1, anzahlBewertungen: 77 },
  { slug: "testdemo-oeff-thai-0q3", placeId: "ChIJtestOeffTha", name: "Bangkok Probe", ort: "Neuötting", adresse: "Ludwigstr. 3, 84524 Neuötting", rating: 4.8, anzahlBewertungen: 150 },
];
let umgebung;
before(() => { umgebung = richteTestLeadsEin(LEADS, "__test-oeffentlichkeit"); });
after(() => {
  umgebung.aufraeumen();
  rmSync(TMP, { recursive: true, force: true });
});

const alleDateien = (dir) => readdirSync(dir, { recursive: true }).map(String).filter((f) => statSync(path.join(dir, f)).isFile());

/* ---------- Ist-Zustand von docs/ ---------- */

test("docs/ enthält nur fiktive Beispiele, Übersicht, Assets und die neutrale 404-Seite – keine Lead-Demo", () => {
  const eintraege = readdirSync(docsDir).filter((e) => !e.startsWith("."));
  const unerwartet = eintraege.filter((e) => !istFiktivesBeispiel(e) && !["assets", "index.html", "404.html", "robots.txt"].includes(e));
  assert.deepEqual(unerwartet, []);
  assert.deepEqual(leadOrdner(docsDir), []);
  // Alle zwölf Beispiele bleiben öffentlich und sind in der Übersicht verlinkt.
  const uebersicht = readFileSync(path.join(docsDir, "index.html"), "utf-8");
  for (const l of DEMO_LEADS) {
    assert.ok(existsSync(path.join(docsDir, `beispiel-${l.kueche}`, "index.html")), l.kueche);
    assert.match(uebersicht, new RegExp(`href="\\./beispiel-${l.kueche}/"`));
  }
});

test("keine internen Berichte unter docs/, keine Konzept-Demo, keine Place ID, keine echte Bestell-Adresse", () => {
  const dateien = alleDateien(docsDir);
  assert.deepEqual(dateien.filter((f) => /(^|\/)(bericht|zyklus)\.json$/.test(f)), []);
  for (const f of dateien.filter((d) => d.endsWith(".html"))) {
    const html = readFileSync(path.join(docsDir, f), "utf-8");
    assert.ok(!html.includes('name="demo-art" content="konzept"'), `Konzept-Demo in ${f}`);
    assert.ok(!/ChIJ[A-Za-z0-9_-]{10,}/.test(html), `Place ID in ${f}`);
    assert.ok(!/"apiUrl":"http/.test(html), `Bestell-Server in ${f}`);
  }
});

test("docs/404.html: neutraler Agentur-Hinweis, ohne Skript, ohne relative Pfade, nicht indexierbar", () => {
  const html = readFileSync(path.join(docsDir, "404.html"), "utf-8");
  assert.equal(html, hinweisSeite());
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /nicht mehr öffentlich verfügbar/);
  assert.match(html, /nie die Website eines Restaurants/);
  assert.ok(!/<script/i.test(html));
  assert.ok(!/(?:href|src)="(?!https?:)/.test(html), "nur absolute Links – die Seite erscheint unter beliebigen Adressen");
});

test("v2/abgeschaltete-demos.json: nur Hashes, keine Namen im öffentlichen Repo", () => {
  const liste = ladeAbgeschaltete();
  assert.ok(liste.slugHashes.length >= 74);
  for (const h of liste.slugHashes) assert.match(h, /^[0-9a-f]{64}$/);
  assert.ok(!/[a-z]+-[a-z0-9]{7}"/.test(readFileSync(path.join(REPO, "v2", "abgeschaltete-demos.json"), "utf-8")));
});

/* ---------- Sperren ---------- */

test("Kein Weg schreibt eine Lead-Demo nach docs/ (Standard-Build, --only, v1, Zyklus); Beispiele dürfen", async () => {
  assert.throws(() => pruefeOeffentlicheAusgabe(docsDir, LEADS[0].slug), /nicht mehr veröffentlicht/);
  assert.throws(() => pruefeOeffentlicheAusgabe(path.join(docsDir, ".bau-x"), LEADS[0].slug), /nicht mehr veröffentlicht/);
  assert.throws(() => pruefeOeffentlicheAusgabe(docsDir, "beispiel-erfunden"), /nicht mehr veröffentlicht/);
  assert.doesNotThrow(() => pruefeOeffentlicheAusgabe(docsDir, "beispiel-bayerisch"));
  assert.doesNotThrow(() => pruefeOeffentlicheAusgabe(TMP, LEADS[0].slug));
  assert.equal(liegtInDocs(path.join(docsDir, "a", "b")), true);
  assert.equal(liegtInDocs(`${docsDir}-kopie`), false);

  await assert.rejects(baueUndSchreibeEinzelnenEntwurf(LEADS[0].slug), /nicht mehr veröffentlicht/);
  await assert.rejects(baueDemo(LEADS[0].slug, { zielDir: docsDir, offline: true }), /nicht mehr veröffentlicht/);
  await assert.rejects(baueImZyklus({ lead: { name: "X", placeId: "x" }, kueche: "bayerisch", judge: false, offline: true, zielDir: docsDir, slug: "irgendwer-0x" }), /nicht mehr veröffentlicht/);
  assert.throws(() => schreibeSeiten([{ lead: LEADS[0], cuisine: "bayerisch", slug: LEADS[0].slug }], docsDir), /nicht mehr veröffentlicht/);
  assert.equal(existsSync(path.join(docsDir, LEADS[0].slug)), false);
});

/* ---------- Altbestand abschalten ---------- */

test("Altbestand: sichert jede Lead-Demo mit Liste, entfernt nur sie, legt 404 an, merkt Hashes", () => {
  const docs = path.join(TMP, "docs");
  const leg = (slug, dateien) => {
    mkdirSync(path.join(docs, slug), { recursive: true });
    for (const [f, inhalt] of Object.entries(dateien)) writeFileSync(path.join(docs, slug, f), inhalt);
  };
  leg("gasthof-alt-0aa1", { "index.html": '<meta name="engine" content="v2"><p>4,4 von 5 auf Google</p>', "bericht.json": "{}" });
  leg("pizzeria-alt-0aa2", { "index.html": "<html>" });
  leg("beispiel-bayerisch", { "index.html": "<html>Beispiel" });
  leg("assets", { "x.woff2": "f" });
  writeFileSync(path.join(docs, "index.html"), "Übersicht");
  const abgeschaltet = path.join(TMP, "abgeschaltet.json");
  const sicherung = path.join(TMP, "sicherung");

  const r = schalteAltbestandAb({ dir: docs, sicherungDir: sicherung, abgeschaltetPfad: abgeschaltet, jetzt: new Date("2026-09-25T08:00:00Z") });
  assert.equal(r.anzahl, 2);
  assert.deepEqual(readdirSync(docs).sort(), ["404.html", "assets", "beispiel-bayerisch", "index.html"]);
  const liste = JSON.parse(readFileSync(path.join(r.sicherung, "liste.json"), "utf-8"));
  assert.deepEqual(liste.demos.map((d) => d.slug), ["gasthof-alt-0aa1", "pizzeria-alt-0aa2"]);
  assert.match(liste.demos[0].url, /\/gasthof-alt-0aa1\/$/);
  assert.equal(liste.demos[0].googleNoteImHtml, true);
  assert.ok(existsSync(path.join(r.sicherung, "docs", "gasthof-alt-0aa1", "bericht.json")), "vollständig gesichert");
  const h = JSON.parse(readFileSync(abgeschaltet, "utf-8"));
  assert.deepEqual(h.slugHashes, [slugHash("gasthof-alt-0aa1"), slugHash("pizzeria-alt-0aa2")].sort());
  assert.ok(!JSON.stringify(h).includes("gasthof"), "keine Namen in der öffentlichen Liste");

  // Status für das Dashboard
  const optionen = { docs, liste: h };
  assert.deepEqual(alteOeffentlicheDemo("gasthof-alt-0aa1", optionen), { status: "abgeschaltet", seit: "2026-09-25" });
  assert.equal(alteOeffentlicheDemo("beispiel-bayerisch", optionen).status, "online");
  assert.equal(alteOeffentlicheDemo("nie-da-0zz", optionen).status, "nie");

  // Ein zweiter Lauf ist harmlos.
  assert.equal(schalteAltbestandAb({ dir: docs, sicherungDir: sicherung, abgeschaltetPfad: abgeschaltet }).anzahl, 0);
  assert.equal(JSON.parse(readFileSync(abgeschaltet, "utf-8")).slugHashes.length, 2);
});

/* ---------- Lead-Demo = Vorlage der Küche ---------- */

const merkmale = (html) => ({
  ausdruck: html.match(/<meta name="v2-ausdruck" content="([^"]+)">/)?.[1],
  designsystem: html.match(/<meta name="v2-designsystem" content="([^"]+)">/)?.[1],
  hero: html.match(/<meta name="v2-hero" content="([^"]+)">/)?.[1],
  kopf: /<header class="kopf" id="topbar"/.test(html),
  video: html.match(/<video class="buehne-video"[^>]*>/)?.[0].replace(/ data-src[^ >]*/g, "") ?? "",
  posterHoch: /<source media="\(max-width: 767px\)" srcset="medien\/heroMobil\./.test(html),
  abfolge: [...html.matchAll(/<section class="[^"]*" id="([a-z-]+)"/g)].map((m) => m[1]).join(","),
  skripte: [/kopf\.getAttribute\("data-ueber"\)/, /karten-sprung--fest/, /data-atmosphaere/].map((r) => r.test(html)),
});

for (const [i, kueche] of [[0, "bayerisch"], [1, "italienisch"], [2, "thailaendisch"]]) {
  test(`${kueche}: lokale Lead-Demo nutzt dieselbe Vorlage wie die Beispielseite – nur Name, Angaben und Kennzeichnung unterscheiden sich`, async () => {
    const demo = DEMO_LEADS.find((l) => l.kueche === kueche);
    const slugBeispiel = `beispiel-${kueche}`;
    const { ausdruck } = ausdruckZumBauen(slugBeispiel, kueche);
    const stimmung = stimmungFuerSlug(slugBeispiel) ?? themeForLead(demo, kueche).stimmung;
    const gestaltung = themeForLead(demo, kueche, stimmung);
    const beispiel = baueSite({ lead: demo, kueche, stimmung, optionen: { fiktiv: true, fontCss: "", ausdruck, medien: loeseMedien({ slug: slugBeispiel, gestaltung, fiktiv: true, offline: true }) } }).html;
    const { ordner } = await baueDemo(LEADS[i].slug, { zielDir: path.join(TMP, "leads"), offline: true });
    const lead = readFileSync(path.join(ordner, "index.html"), "utf-8");
    assert.deepEqual(merkmale(lead), merkmale(beispiel));
    assert.match(merkmale(lead).video, /data-einmal/, "Wiedergabemodus aus dem Medienprofil");
    for (const datei of ["hero.jpg", "heroMobil.jpg", "heroVideo.mp4", "heroVideo.webm"]) assert.ok(existsSync(path.join(ordner, "medien", datei)), `${datei} mitkopiert`);
    // Konzeptmaterial sichtbar gekennzeichnet, keine Google-Note, nichts wird verschickt.
    assert.match(lead, /class="buehne-herkunft">Konzeptmaterial</);
    assert.ok(!/auf Google|Bewertungen/.test(lead.replace(/<script[\s\S]*?<\/script>/g, "")));
    assert.match(lead, /"apiUrl":""/);
    assert.match(lead, /Konzept-Demo – unverbindlicher Entwurf, nicht die offizielle Website von /);
    const bericht = JSON.parse(readFileSync(path.join(ordner, "bericht.json"), "utf-8"));
    assert.deepEqual(bericht.medienStatus.zeilen.map((z) => [z.rolle, z.vorhanden]), [["heroVideo", true], ["heroVideoMobil", false], ["hero", true], ["heroMobil", true]]);
    assert.match(bericht.medienStatus.fehlend.join(" "), /Video Mobil fehlt – auf dem Handy steht das Hochformat-Poster/);
  });
}

test("Konzept-Demo sendet auch mit bekanntem Betriebsserver nie eine Bestellung", () => {
  const { html } = baueSite({ lead: { name: "X", ort: "Y", placeId: "p" }, kueche: "bayerisch", optionen: { fontCss: "", ausdruck: "gesellig", konzept: true, apiUrl: "http://localhost:3200" } });
  assert.match(html, /"apiUrl":""/);
});

/* ---------- Medien ---------- */

const eigeneMit = (rollen) => ({ "beispiel-test": Object.fromEntries(rollen.map((r) => [r, { datei: `v2/medien/eigene/x/${r}${/Video/.test(r) ? ".mp4" : ".jpg"}`, herkunft: "ki", wiedergabe: /Video/.test(r) ? "einmal" : undefined }])) });
const loese = (rollen, konzeptVon = "beispiel-test") =>
  loeseMedien({ slug: "lead-x", gestaltung: themeForLead({ name: "X" }, "bayerisch"), fiktiv: false, offline: true, eigene: eigeneMit(rollen), leadEdits: {}, kiDir: TMP, konzeptVon });

test("Video Desktop, Video Mobil und beide Poster werden bei vorhandenem Material eingebunden", () => {
  const medien = loese(["hero", "heroMobil", "heroVideo", "heroVideoMobil"]);
  const html = baueSite({ lead: { name: "X", ort: "Y" }, kueche: "bayerisch", optionen: { fontCss: "", ausdruck: "gesellig", konzept: true, medien } }).html;
  const video = html.match(/<video class="buehne-video"[^>]*>/)[0];
  assert.match(video, /data-src="medien\/heroVideo\.mp4"/);
  assert.match(video, /data-src-mobil="medien\/heroVideoMobil\.mp4"/);
  assert.ok(!/data-nur-breit/.test(video), "mit Hochformat-Video läuft auch auf dem Handy ein Film");
  assert.match(html, /<source media="\(max-width: 767px\)" srcset="medien\/heroMobil\.jpg"><img class="buehne-poster" src="medien\/hero\.jpg"/);
  assert.deepEqual(medienStatus(medien).fehlend, []);
});

test("Fehlendes Video: Poster statt Ersatzvideo; fremde Küchen-Medien werden nie still eingesetzt", () => {
  const medien = loese(["hero", "heroMobil"]);
  assert.equal(medien.heroVideo, null);
  const html = baueSite({ lead: { name: "X", ort: "Y" }, kueche: "bayerisch", optionen: { fontCss: "", ausdruck: "gesellig", konzept: true, medien } }).html;
  assert.ok(!html.includes("<video"), "kein Video ohne passendes Material");
  assert.match(html, /<img class="buehne-poster" src="medien\/hero\.jpg"/);
  assert.match(medienStatus(medien).fehlend.join(" "), /Video Desktop fehlt – die Bühne zeigt das Poster \(kein Ersatzvideo\)/);
  // Konzeptmaterial kommt ausschließlich aus dem Beispiel der eigenen Küche.
  const fremd = loeseMedien({ slug: "lead-x", gestaltung: themeForLead({ name: "X" }, "bayerisch"), offline: true, eigene: { "beispiel-italienisch": eigeneMit(["heroVideo"])["beispiel-test"] }, leadEdits: {}, kiDir: TMP, konzeptVon: "beispiel-bayerisch" });
  assert.equal(fremd.heroVideo, null);
});

/* ---------- Präsentation im WLAN ---------- */

test("lanAdresse: private IPv4 des Rechners, nie localhost; überschreibbar", () => {
  const netz = { lo: [{ family: "IPv4", address: "127.0.0.1", internal: true }], wlan0: [{ family: "IPv6", address: "fe80::1", internal: false }, { family: "IPv4", address: "192.168.178.23", internal: false }] };
  assert.equal(lanAdresse(netz, {}), "192.168.178.23");
  assert.equal(lanAdresse({ lo: netz.lo }, {}), "");
  assert.equal(lanAdresse(netz, { PRAESENTATION_HOST: "10.0.0.5" }), "10.0.0.5");
});

test("Präsentation: genau eine Demo unter Zufallspfad, keine Berichte, kein Ausbruch aus dem Ordner, endet sauber", async () => {
  const leadsDir = path.join(TMP, "praes-leads");
  mkdirSync(path.join(leadsDir, "gasthof-p-0p1", "medien"), { recursive: true });
  mkdirSync(path.join(leadsDir, "andere-0p2"), { recursive: true });
  writeFileSync(path.join(leadsDir, "gasthof-p-0p1", "index.html"), "<p>Demo P</p>");
  writeFileSync(path.join(leadsDir, "gasthof-p-0p1", "bericht.json"), "{}");
  writeFileSync(path.join(leadsDir, "gasthof-p-0p1", "medien", "hero.jpg"), "bild");
  writeFileSync(path.join(leadsDir, "andere-0p2", "index.html"), "<p>Andere</p>");
  await assert.rejects(startePraesentation("fehlt-0p3", { leadsDir, host: "127.0.0.1", port: 0, binden: "127.0.0.1" }), /noch keine Konzept-Demo lokal gebaut/);
  await assert.rejects(startePraesentation("gasthof-p-0p1", { leadsDir, host: "", port: 0, binden: "127.0.0.1" }), /Keine WLAN-Adresse/);
  const s = await startePraesentation("gasthof-p-0p1", { leadsDir, host: "127.0.0.1", port: 0, binden: "127.0.0.1", dauerMin: 5 });
  try {
    assert.match(s.url, /^http:\/\/127\.0\.0\.1:\d+\/[A-Za-z0-9_-]{16}\/$/);
    const r = await fetch(s.url);
    assert.equal(r.status, 200);
    assert.equal(await r.text(), "<p>Demo P</p>");
    assert.equal(r.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal((await fetch(`${s.url}medien/hero.jpg`)).status, 200);
    const basis = s.url.replace(/[^/]+\/$/, "");
    for (const pfad of [`${s.url}bericht.json`, `${basis}andere-0p2/`, `${s.url}../andere-0p2/index.html`, `${s.url}%2e%2e/andere-0p2/index.html`, `${basis}falsch/`, basis]) {
      assert.equal((await fetch(pfad)).status, 404, pfad);
    }
    assert.equal((await fetch(s.url, { method: "POST" })).status, 404);
  } finally {
    await beendePraesentation();
  }
  await assert.rejects(fetch(s.url));
});

test("Präsentations-Handler ohne laufende Präsentation: alles 404", async () => {
  const server = createServer(praesentationsHandler({ leadsDir: TMP }));
  await new Promise((f) => server.listen(0, "127.0.0.1", f));
  try {
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/irgendwas/`)).status, 404);
  } finally {
    await new Promise((f) => server.close(f));
  }
});

test("Oberfläche nennt die WLAN-Vorschau nicht „privat“ und erklärt ihre Grenzen", () => {
  const panel = readFileSync(path.join(REPO, "v2", "integration", "demoPanel.browser.js"), "utf-8");
  const dashboard = readFileSync(path.join(REPO, "public", "dashboard.html"), "utf-8");
  for (const text of [panel, dashboard]) assert.ok(!/privat/i.test(text), "keine Behauptung „privat“");
  assert.match(panel, /nicht im Internet, ohne Passwort, nur solange sie läuft/);
  assert.match(dashboard, /Nur im selben WLAN/);
});
