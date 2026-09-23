import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";

// Art-Direction-Runde: Briefing, Creative Direction, Bildplan, Komposition,
// Tauschprobe, Chat-Aufnahme, Dashboard-Routen.

const TMP = mkdtempSync(path.join(tmpdir(), "v2-art-"));
after(() => rmSync(TMP, { recursive: true, force: true }));

const { feld, unbekannt, pruefeBriefing, leiteBriefingAb, istTatsache, zeigbar, ladeBriefing, offenePunkte, istFreigegeben } = await import("../v2/briefing/briefing.js");
const { erzeugeCreativeDirection, belegPruefung, pruefeCreativeDirection, ladeCreativeDirection } = await import("../v2/creative/creativeDirection.js");
const { erstelleBildplan, stockEignung, bildMarkup } = await import("../v2/assets-pipeline/bildplan.js");
const { baueKomponierteSite } = await import("../v2/build/komposition/builder.js");
const { tausche, PILOTEN } = await import("../v2/build/tauschprobe.js");
const { briefingAusChat } = await import("../v2/briefing/chatIntake.js");
const { ladeDesignsystem } = await import("../v2/build/designsystemGenerator.js");
const { menuForCuisine } = await import("../v2/build/v1Funktionen.js");
const { strukturCluster } = await import("../v2/build/artDirectionAudit.js");

const lead = { slug: "test-lokal", name: "Gasthof Test", ort: "Mühldorf am Inn", adresse: "Stadtplatz 1, 84453 Mühldorf am Inn", telefon: "030 23125 999", rating: 4.5, anzahlBewertungen: 120, placeId: "t1" };
const bauen = (slug) => {
  const briefing = ladeBriefing(slug);
  return baueKomponierteSite({ briefing, cd: ladeCreativeDirection(slug) });
};

/* ---------------- Briefing ---------------- */

test("Briefing: unbekannt trägt keinen Wert, Tatsache nur bei bestätigt/übernommen", () => {
  assert.equal(feld(null).status, "unbekannt");
  assert.equal(unbekannt().wert, null);
  assert.equal(istTatsache(feld("x", "bestaetigt")), true);
  assert.equal(istTatsache(feld("x", "uebernommen")), true);
  assert.equal(istTatsache(feld("x", "vorschlag")), false);
  const b = { slug: "x", kueche: "italienisch", felder: { konzept: { usp: feld("Pasta", "vorschlag") } } };
  assert.deepEqual(zeigbar(b, "konzept.usp"), { wert: "Pasta", entwurf: true, status: "vorschlag" });
  assert.equal(zeigbar(b, "konzept.geschichte"), null);
});

test("Briefing: Prüfung erkennt Tippfehler-Felder, Wert bei „unbekannt“ und falsche Hauptaktion", () => {
  const fehler = pruefeBriefing({ slug: "x", kueche: "k", felder: { konzept: { uspp: feld("a") }, betrieb: { name: { wert: "A", status: "unbekannt" } }, aktion: { haupt: feld("tanzen", "bestaetigt") } } });
  assert.ok(fehler.some((f) => f.includes("unbekanntes Feld konzept.uspp")));
  assert.ok(fehler.some((f) => f.includes("betrieb.name")));
  assert.ok(fehler.some((f) => f.includes("aktion.haupt")));
});

test("Briefing aus vorhandenen Daten erfindet nichts", () => {
  const b = leiteBriefingAb({ lead, kueche: "bayerisch", stimmung: "wirtshaus", menu: menuForCuisine("bayerisch") });
  assert.deepEqual(pruefeBriefing(b), []);
  assert.equal(b.felder.betrieb.name.status, "uebernommen");
  for (const p of ["geschichte", "usp", "kurz", "belege"]) assert.equal(b.felder.konzept[p].status, "unbekannt", p);
  assert.equal(b.felder.betrieb.oeffnungszeiten.status, "unbekannt");
  assert.equal(b.felder.karte.speisekarte.status, "vorschlag", "Katalogkarte ist höchstens ein Vorschlag");
  assert.equal(istFreigegeben(b), false);
  assert.ok(offenePunkte(b).length > 20);
});

/* ---------------- Creative Direction ---------------- */

test("Creative Direction: regelbasierter Entwurf ist reproduzierbar und gültig", () => {
  for (const slug of PILOTEN) {
    const b = ladeBriefing(slug);
    const ds = ladeDesignsystem(b.kueche, b.stimmung);
    const a = erzeugeCreativeDirection(b, ds);
    assert.deepEqual(a, erzeugeCreativeDirection(b, ds), slug);
    assert.deepEqual(pruefeCreativeDirection(a), [], slug);
  }
});

test("Creative Direction: gespeicherte Pilot-Fassungen sind vollständig (8 Teile) und begründet", () => {
  for (const slug of PILOTEN) {
    const cd = ladeCreativeDirection(slug);
    assert.deepEqual(pruefeCreativeDirection(cd), [], slug);
    for (const k of ["leitidee", "wirkung", "metapher", "bilder", "typografie", "seitenfolge", "signaturen", "verzicht"]) assert.ok(cd[k], `${slug}: ${k}`);
    assert.ok(cd.seitenfolge.every((a) => a.warum.length > 10), `${slug}: jede Position begründet`);
    assert.equal(cd.bearbeitet, true);
  }
});

test("Beleg-Prüfung: Signatur fällt weg, wenn das Briefing sie nicht trägt", () => {
  const cdTrattoria = ladeCreativeDirection("pilot-trattoria-nonna-lucia");
  assert.equal(belegPruefung(cdTrattoria, ladeBriefing("pilot-trattoria-nonna-lucia")).getragen, 1);
  const fremd = belegPruefung(cdTrattoria, ladeBriefing("pilot-izakaya-kurenai"));
  assert.equal(fremd.getragen, 0);
  assert.ok(fremd.verworfen.some((v) => v.includes("tageskarte")));
});

/* ---------------- Bildplan ---------------- */

test("Bildplan: Stockfoto muss das benannte Gericht zeigen, Haus-Plätze nehmen nie Stock", () => {
  const kueche = "italienisch";
  assert.equal(stockEignung("photo-1574071318508-1cdbab80d002", { slot: "hero", gericht: "Margherita" }, kueche), null);
  assert.match(stockEignung("photo-1565299624946-b28f40a0ae38", { slot: "g", gericht: "Quattro Stagioni" }, kueche), /Quattro Stagioni/);
  assert.match(stockEignung("photo-1554118811-1e0d58224f24", { slot: "haus", motiv: "Unser Haus" }, "cafe"), /nur eigene Fotos/);
  assert.match(stockEignung("photo-unbekannt", { slot: "hero" }, kueche), /nicht gesichtet/);
});

test("Bildplan: eigene Fotos haben Vorrang, ohne Freigabe werden sie gemeldet statt verwendet", () => {
  const briefing = { slug: "b", kueche: "italienisch", felder: { medien: { fotos: feld([{ datei: "uploads/margherita.jpg", herkunft: "eigen", freigabe: null, gericht: "Margherita", rolle: "gericht" }, { datei: "uploads/ragu.jpg", herkunft: "eigen", freigabe: "per Mail", gericht: "Tagliatelle al Ragù", rolle: "gericht" }], "uebernommen") } } };
  const cd = { bilder: { slots: [{ slot: "hero", gericht: "Margherita", motiv: "Margherita", kandidaten: ["photo-1574071318508-1cdbab80d002"] }, { slot: "t", gericht: "Tagliatelle al Ragù", motiv: "Ragù", kandidaten: [] }] } };
  const plan = erstelleBildplan({ briefing, cd });
  assert.equal(plan.plaetze[0].gewaehlt.herkunft, "stock", "ohne Freigabe fällt das eigene Foto auf das gesichtete Stockfoto zurück");
  assert.ok(plan.abgelehnt.some((a) => a.quelle === "uploads/margherita.jpg" && /freigabe/i.test(a.grund)));
  assert.equal(plan.plaetze[1].gewaehlt.herkunft, "eigen");
  assert.equal(plan.plaetze[1].gewaehlt.kennzeichnung, "eigenes Foto");
});

test("Bildplan: eigener Mobil-Ausschnitt bzw. eigenes Mobil-Motiv im Markup, Maße gegen Layoutsprünge", () => {
  const b = ladeBriefing("pilot-izakaya-kurenai");
  const plan = erstelleBildplan({ briefing: b, cd: ladeCreativeDirection("pilot-izakaya-kurenai") });
  const hero = plan.plaetze.find((p) => p.slot === "hero");
  assert.ok(hero.mobil, "Izakaya zeigt mobil die Laternen statt des Tresens");
  const html = bildMarkup(hero, { prioritaet: true });
  assert.match(html, /<source media="\(max-width: 767px\)" srcset="[^"]*photo-1672756214803/);
  assert.match(html, /width="1600" height="900"/);
  assert.match(html, /fetchpriority="high"/);
  assert.ok(plan.abgelehnt.some((a) => /Chashu/.test(a.grund)), "Ramen mit Garnelen abgelehnt");
});

/* ---------------- Komposition ---------------- */

test("Komposition: alle vier Piloten bestehen die Gates und sind reproduzierbar", () => {
  for (const slug of PILOTEN) {
    const a = bauen(slug);
    const b = bauen(slug);
    assert.equal(a.html, b.html, `${slug} identisch bei identischem Input`);
  }
});

test("Komposition: Struktur folgt der Creative Direction – vier verschiedene Heroes und Abschnittsfolgen", () => {
  const berichte = PILOTEN.map((s) => bauen(s).bericht);
  assert.equal(new Set(berichte.map((b) => b.hero)).size, 4);
  assert.equal(new Set(berichte.map((b) => b.abschnitte.join(">"))).size, 4);
  // Vorher: 36 Designsysteme, nur 3 Baupläne.
  assert.equal(strukturCluster().length, 3);
});

test("Komposition: Unbekanntes landet nicht auf der Seite (dünnes Briefing)", () => {
  const { html, bericht } = bauen("pilot-gasthaus-alte-linde");
  assert.doesNotMatch(html, /Seit Generationen|Metzger im Ort|Fleisch vom/, "keine Katalog-Geschichte oder -USP");
  assert.doesNotMatch(html, /11:30 – 14:00/, "keine erfundenen Öffnungszeiten");
  assert.match(html, /noch nicht bestätigt – bitte telefonisch erfragen/);
  assert.match(html, /Musterkarte aus unserem Katalog/);
  assert.match(html, /class="k-entwurf"/);
  assert.match(html, /id="offen"/);
  assert.equal(bericht.bildplan.plaetze.filter((p) => p.gewaehlt).length, 0, "ungeeignete Stockfotos werden nicht verwendet");
});

test("Komposition: keine fingierten Gästestimmen, Entwurfsleiste und noindex auf jeder Pilotseite", () => {
  for (const slug of PILOTEN) {
    const { html } = bauen(slug);
    assert.doesNotMatch(html, /vor \d+ (Woche|Wochen|Monat|Monaten)/, `${slug}: keine Katalog-Stimmen`);
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
    assert.match(html, /class="entwurf-hinweis"/);
    assert.match(html, /Beispielseite/);
  }
});

test("Komposition: Funktionsanker für v1-Skript, mobile Navigation und Aktionsleiste vorhanden", () => {
  for (const slug of PILOTEN) {
    const { html } = bauen(slug);
    for (const id of ["topbar", "karte", "reservation-form", "order-form", "drawer", "confirm", "bar-order", "mobilebar"]) assert.match(html, new RegExp(`id="${id}"`), `${slug}: ${id}`);
    assert.match(html, /<details class="k-menue">/, `${slug}: mobile Navigation`);
  }
});

test("Komposition: Signatur ohne Beleg wird verworfen statt gerendert", () => {
  const briefing = ladeBriefing("pilot-trattoria-nonna-lucia");
  briefing.felder.karte.besonderheiten = unbekannt();
  const { html, bericht } = baueKomponierteSite({ briefing, cd: ladeCreativeDirection("pilot-trattoria-nonna-lucia") });
  assert.doesNotMatch(html, /id="tageskarte"/);
  assert.ok(bericht.belege.verworfen.some((v) => v.includes("tageskarte")));
});

/* ---------------- Tauschprobe ---------------- */

test("Tauschprobe: Gestaltung von A mit Inhalten von B verliert A's Signatur", () => {
  for (const a of ["pilot-trattoria-nonna-lucia", "pilot-izakaya-kurenai", "pilot-roesterei-kornfeld"]) {
    for (const b of PILOTEN.filter((x) => x !== a)) {
      const r = tausche(a, b);
      assert.equal(r.signaturen.vorher, 1, a);
      assert.equal(r.signaturen.nachher, 0, `${a} ⟵ ${b}`);
    }
  }
});

/* ---------------- Chat-Aufnahme ---------------- */

test("Chat: Hauptaktion, No-Gos und Slot-Zuordnung – Rückfragen nur bei Mehrdeutigkeit/Recht", () => {
  const { briefing, zuordnung, rueckfragen } = briefingAusChat({
    text: "Der Wirt will vor allem Reservierungen, abholen geht auch. Bitte keine Italienflagge. Die Fotos hat seine Tochter selbst fotografiert.",
    dateien: [{ pfad: "fassade.jpg" }, { pfad: "tagliatelle-ragu.jpg" }, { pfad: "IMG_2231.jpg", breite: 800, hoehe: 1200 }],
    lead,
    kueche: "italienisch",
    menu: menuForCuisine("italienisch"),
  });
  assert.equal(briefing.felder.aktion.haupt.wert, "reservieren");
  assert.equal(briefing.felder.aktion.haupt.status, "bestaetigt", "„Der Wirt will …“ gilt als Kundenaussage");
  assert.match(briefing.felder.stil.noGos.wert[0], /Italienflagge/);
  assert.equal(zuordnung[0].slot, "haus");
  assert.equal(zuordnung[1].gericht, "Tagliatelle al Ragù");
  assert.equal(zuordnung[2].slot, null);
  assert.ok(rueckfragen.some((r) => r.frage.includes("IMG_2231")));
  assert.ok(!rueckfragen.some((r) => r.feld === "aktion.haupt"));
  assert.deepEqual(pruefeBriefing(briefing), []);
});

test("Chat: Fotos aus dem Internet lösen eine rechtliche Rückfrage aus und werden nicht verwendet", () => {
  const { briefing, rueckfragen } = briefingAusChat({ text: "Die Bilder habe ich von Instagram heruntergeladen.", dateien: [{ pfad: "margherita.jpg" }], lead, kueche: "italienisch", menu: menuForCuisine("italienisch") });
  assert.ok(rueckfragen.some((r) => r.grund === "rechtlich ungeklärt"));
  const plan = erstelleBildplan({ briefing, cd: { bilder: { slots: [{ slot: "hero", gericht: "Margherita", motiv: "Margherita", kandidaten: [] }] } } });
  assert.equal(plan.plaetze[0].gewaehlt, null);
  assert.ok(plan.abgelehnt.some((a) => /Rechte/.test(a.grund)));
});

/* ---------------- Dashboard ---------------- */

test("Dashboard: Briefing und Creative Direction ansehen und bearbeiten", async () => {
  process.env.V2_BRIEFING_DIR = path.join(TMP, "briefings");
  process.env.V2_CD_DIR = path.join(TMP, "cd");
  process.env.V2_PILOT_DIR = path.join(TMP, "piloten");
  const { speichereBriefing } = await import("../v2/briefing/briefing.js");
  const { creativeHandler } = await import("../v2/integration/creativeDashboard.js");
  const quelle = JSON.parse(readFileSync(path.join("v2", "briefings", "pilot-roesterei-kornfeld.json"), "utf-8"));
  speichereBriefing({ ...quelle, slug: "dash-test" });
  const server = createServer(async (req, res) => {
    if (!(await creativeHandler(req, res, new URL(req.url, "http://x").pathname))) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const seite = await (await fetch(`${url}/v2/creative/dash-test`)).text();
    assert.match(seite, /vom Kunden bestätigt/);
    assert.match(seite, /regelbasierter Entwurf/);
    const { cd } = await (await fetch(`${url}/api/v2/creative/dash-test`)).json();
    cd.leitidee = "Geänderte Leitidee aus dem Dashboard.";
    const antwort = await fetch(`${url}/intern/v2/creative/dash-test`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cd }) });
    const j = await antwort.json();
    assert.equal(j.ok, true, j.fehler);
    const gespeichert = JSON.parse(readFileSync(path.join(TMP, "cd", "dash-test.json"), "utf-8"));
    assert.equal(gespeichert.leitidee, "Geänderte Leitidee aus dem Dashboard.");
    assert.equal(gespeichert.bearbeitet, true);
    assert.ok(existsSync(path.join(TMP, "piloten", "dash-test", "index.html")), "Seite neu gebaut");
    const kaputt = await fetch(`${url}/intern/v2/creative/dash-test`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cd: { ...cd, hero: { typ: "karussell" } } }) });
    assert.equal(kaputt.status, 400, "ungültige Creative Direction wird nicht gespeichert");
  } finally {
    await new Promise((r) => server.close(r));
    delete process.env.V2_BRIEFING_DIR;
    delete process.env.V2_CD_DIR;
    delete process.env.V2_PILOT_DIR;
  }
});
