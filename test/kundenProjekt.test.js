import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Kundenfassungen: Speicher, Felder, Medien, Speisekarte, Bau, Konsistenz mit
// Warenkorb und Server, Trennung der Kunden, Zugriffsschutz und der Weg über
// den Claude-Code-Chat (scripts/kunde.mjs) auf denselben Stand.

const BETRIEB = "__test-kundenprojekt";
process.env.BETRIEB = BETRIEB;
delete process.env.DASHBOARD_TOKEN;
delete process.env.DASHBOARD_PASSWORT_HASH;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const { handler: dashboard } = await import("../src/dashboardServer.js");
const { handler: wirt } = await import("../src/wirtServer.js");
const store = await import("../src/betriebStore.js");
const kp = await import("../src/kundenProjekt.js");
const { projektAusBeispiel, projektAusDemo, fuehreAktionAus, kundenAnsicht } = await import("../v2/integration/kundenDashboard.js");
const { baueKundenfassung, KUNDEN_AUSGABE, bestellkatalog } = await import("../v2/integration/kundenBau.js");
const { baueSite } = await import("../v2/build/siteBuilder.js");
const { richteTestLeadsEin } = await import("./hilfen/testLead.js");
const { png, webmKopf } = await import("./hilfen/bilder.js");

const angelegt = [];
const neu = (kueche = "italienisch") => {
  const p = projektAusBeispiel(kueche);
  angelegt.push(p.id);
  return p;
};

before(() => {
  store.speichereBetrieb(BETRIEB, { tische: [], reservierungen: [], bestellungen: [] });
  store.uhrHook.jetzt = () => new Date("2026-09-24T17:00:00+02:00");
});
after(() => {
  for (const id of angelegt) {
    rmSync(path.join(kp.KUNDEN_DIR, id), { recursive: true, force: true });
    rmSync(path.join(KUNDEN_AUSGABE, id), { recursive: true, force: true });
  }
  rmSync(path.join(REPO, "data", "betrieb", `${BETRIEB}.json`), { force: true });
});

async function mitServer(h, fn) {
  const s = createServer(h);
  await new Promise((f) => s.listen(0, "127.0.0.1", f));
  try {
    return await fn(`http://127.0.0.1:${s.address().port}`);
  } finally {
    await new Promise((f) => s.close(f));
  }
}

const aktion = (id, e, von = "Dashboard") => fuehreAktionAus(id, { revision: kp.ladeProjekt(id).revision, ...e }, { von }).projekt;
const hochladen = (id, rolle, puffer) => kp.aendereProjekt(id, undefined, (p, i) => kp.legeMediumVor(p, rolle, puffer, i)).projekt;
const erstesGericht = (id) => kp.ladeProjekt(id).speisekarte.kategorien[0].gerichte[0];
const hash = (datei) => createHash("sha256").update(readFileSync(datei)).digest("hex");

/* ---------- Anlegen und Trennung ---------- */

test("Kundenfassung aus Lead-Demo: Design übernommen, Demo unverändert, Google-Angaben als unbestätigt markiert", () => {
  const leads = richteTestLeadsEin([{ slug: "__test-kunde-demo", placeId: "kunde-demo-1", name: "Pizzeria Test", adresse: "Weg 1, 80331 München", ort: "München", telefon: "089 123" }], "__test-kunde-demo");
  try {
    const editsVorher = existsSync(path.join(REPO, "data", "lead-edits", "__test-kunde-demo.json"));
    const p = projektAusDemo("__test-kunde-demo");
    angelegt.push(p.id);
    assert.match(p.id, kp.KUNDEN_ID);
    assert.equal(p.herkunft.art, "lead-demo");
    assert.ok(p.design.kueche && p.design.farbschema && p.design.vorlage);
    assert.equal(p.felder.name.wert, "Pizzeria Test");
    assert.equal(p.felder.name.status, "entwurf");
    assert.match(p.felder.name.quelle, /Lead-Demo.*bestätigen/);
    aktion(p.id, { aktion: "feld", feld: "slogan", wert: "Nur für den Kunden" });
    assert.equal(existsSync(path.join(REPO, "data", "lead-edits", "__test-kunde-demo.json")), editsVorher, "die Demo bekommt keine Edits");
  } finally {
    leads.aufraeumen();
  }
});

test("Felder: prüfen, speichern, bestätigen; HTML wird abgewiesen", () => {
  const p = neu();
  assert.throws(() => aktion(p.id, { aktion: "feld", feld: "slogan", wert: "<script>alert(1)</script>" }), /spitzen Klammern/);
  assert.throws(() => aktion(p.id, { aktion: "feld", feld: "slogan", wert: "x".repeat(61) }), /höchstens 60/);
  assert.throws(() => aktion(p.id, { aktion: "feld", feld: "unbekannt", wert: "x" }), /Unbekanntes Feld/);
  assert.throws(() => aktion(p.id, { aktion: "feld", feld: "apiUrl", wert: "javascript:alert(1)" }), /Format ungültig/);
  let q = aktion(p.id, { aktion: "feld", feld: "slogan", wert: "  Pasta   wie bei Nonna " });
  assert.deepEqual([q.felder.slogan.wert, q.felder.slogan.status, q.felder.slogan.quelle], ["Pasta wie bei Nonna", "entwurf", "Dashboard"]);
  q = aktion(p.id, { aktion: "feldBestaetigen", feld: "slogan" });
  assert.equal(q.felder.slogan.status, "bestaetigt");
  q = aktion(p.id, { aktion: "feld", feld: "slogan", wert: "Neu" });
  assert.equal(q.felder.slogan.status, "entwurf", "eine Änderung hebt die Bestätigung auf");
});

test("Dashboard und Chat teilen einen Stand: veraltete Revision → Konflikt statt Überschreiben", () => {
  const p = neu();
  const rev = kp.ladeProjekt(p.id).revision;
  // Chat (anderer Prozess) ändert zuerst …
  execFileSync(process.execPath, ["scripts/kunde.mjs", "feld", "--kunde", p.id, "--feld", "slogan", "--wert", "Aus dem Chat"], { cwd: REPO });
  // … das Dashboard speichert danach mit seiner alten Revision:
  assert.throws(() => fuehreAktionAus(p.id, { revision: rev, aktion: "feld", feld: "einladung", wert: "Vom Dashboard" }), (e) => e.konflikt === true);
  assert.equal(kp.ladeProjekt(p.id).felder.slogan.wert, "Aus dem Chat");
  assert.equal(kp.ladeProjekt(p.id).felder.slogan.quelle, "Chat (Claude Code)");
  // Nach dem Neuladen geht es weiter – beide Änderungen bleiben.
  aktion(p.id, { aktion: "feld", feld: "einladung", wert: "Vom Dashboard" });
  const stand = kp.ladeProjekt(p.id);
  assert.equal(stand.felder.slogan.wert, "Aus dem Chat");
  assert.equal(stand.felder.einladung.wert, "Vom Dashboard");
  assert.ok(stand.verlauf.some((v) => v.von === "Chat (Claude Code)"));
});

/* ---------- Medien ---------- */

test("Medien: Bytes, Größe und Format werden geprüft; SVG und Fremdrollen abgelehnt", () => {
  const p = neu();
  const g = erstesGericht(p.id);
  assert.throws(() => hochladen(p.id, "hero", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")), /SVG ist aus Sicherheitsgründen nicht erlaubt/);
  assert.throws(() => hochladen(p.id, "hero", png(800, 450)), /mindestens 1200 px/);
  assert.throws(() => hochladen(p.id, "hero", png(1300, 1600)), /Querformat/);
  assert.throws(() => hochladen(p.id, "heroMobil", png(1300, 800)), /Hochformat/);
  assert.throws(() => hochladen(p.id, "heroVideo", png(1600, 900)), /Kein MP4- oder WebM-Video/);
  assert.throws(() => hochladen(p.id, "gericht:g-00000000", png(800, 600)), /Unbekannter Medienplatz/);
  assert.throws(() => hochladen(p.id, "../../etc", png(800, 600)), /Unbekannter Medienplatz/);
  hochladen(p.id, "heroVideo", webmKopf());
  hochladen(p.id, `gericht:${g.id}`, png(800, 600));
  const dateien = readdirSync(kp.medienOrdner(p.id));
  assert.ok(dateien.every((d) => /^[a-z0-9-]+\.(png|webm|jpg|webp|mp4)$/.test(d)), dateien.join(","));
  assert.equal(kp.mediumPfad(p.id, "../projekt.json"), null);
});

test("Ersetzen: Vorschlag ändert nichts, Übernehmen behält das alte bis zur Freigabe, Zurücksetzen und Abbrechen", () => {
  const p = neu();
  hochladen(p.id, "logo", png(400, 200, [10, 10, 10]));
  let m = kp.ladeProjekt(p.id).medien.logo;
  assert.equal(m.aktuell, null, "ein Upload ist erst ein Vorschlag");
  aktion(p.id, { aktion: "medium", rolle: "logo", medienAktion: "uebernehmen" });
  const erstes = kp.ladeProjekt(p.id).medien.logo.aktuell.datei;
  hochladen(p.id, "logo", png(420, 200, [200, 10, 10]));
  aktion(p.id, { aktion: "medium", rolle: "logo", medienAktion: "verwerfen" });
  assert.equal(kp.ladeProjekt(p.id).medien.logo.aktuell.datei, erstes, "Abbrechen lässt das alte stehen");
  hochladen(p.id, "logo", png(420, 200, [200, 10, 10]));
  aktion(p.id, { aktion: "medium", rolle: "logo", medienAktion: "uebernehmen" });
  m = kp.ladeProjekt(p.id).medien.logo;
  assert.notEqual(m.aktuell.datei, erstes);
  assert.equal(m.vorher.datei, erstes);
  assert.ok(kp.mediumPfad(p.id, erstes), "altes Medium liegt noch auf der Platte");
  aktion(p.id, { aktion: "medium", rolle: "logo", medienAktion: "zuruecksetzen" });
  assert.equal(kp.ladeProjekt(p.id).medien.logo.aktuell.datei, erstes);
});

test("Kunde A kann Medien und Einstellungen von Kunde B nicht verändern", () => {
  const a = neu();
  const b = neu();
  const vorherB = readFileSync(path.join(kp.KUNDEN_DIR, b.id, "projekt.json"), "utf-8");
  hochladen(a.id, "haus", png(1200, 800));
  aktion(a.id, { aktion: "medium", rolle: "haus", medienAktion: "uebernehmen" });
  const dateiA = kp.ladeProjekt(a.id).medien.haus.aktuell.datei;
  assert.equal(kp.mediumPfad(b.id, dateiA), null, "B sieht die Datei von A nicht");
  const gA = erstesGericht(a.id);
  assert.throws(() => aktion(b.id, { aktion: "gericht", id: gA.id, daten: { preis: 1 } }), /Gericht nicht gefunden/);
  assert.equal(readFileSync(path.join(kp.KUNDEN_DIR, b.id, "projekt.json"), "utf-8"), vorherB);
});

/* ---------- Speisekarte, Bau, Warenkorb, Server ---------- */

test("Speisekarte: stabile IDs; Name/Preis konsistent auf Startseite, Speisekarte, Warenkorb und Server", async () => {
  const p = neu();
  const g = erstesGericht(p.id);
  aktion(p.id, { aktion: "gericht", id: g.id, daten: { name: "Pizza Nonna Rosa", preis: "13,90" } });
  aktion(p.id, { aktion: "gerichtVerschieben", id: g.id, richtung: "runter" });
  aktion(p.id, { aktion: "feld", feld: "betriebSlug", wert: BETRIEB });
  aktion(p.id, { aktion: "feld", feld: "apiUrl", wert: "http://127.0.0.1:3200" });
  const nachher = kp.findeGericht(kp.ladeProjekt(p.id), g.id).gericht;
  assert.equal(nachher.id, g.id, "Umbenennen und Verschieben behalten die ID");
  assert.equal(nachher.preis, 13.9);

  const { sync } = await baueKundenfassung(p.id);
  assert.equal(sync.synchronisiert, true);
  const start = readFileSync(path.join(KUNDEN_AUSGABE, p.id, "index.html"), "utf-8");
  const karte = readFileSync(path.join(KUNDEN_AUSGABE, p.id, "speisekarte", "index.html"), "utf-8");
  assert.match(karte, new RegExp(`id="gericht-${g.id}"`), "Anker aus der stabilen ID");
  assert.match(karte, /Pizza Nonna Rosa/);
  assert.match(karte, /13,90/);
  // Warenkorb-Katalog in beiden Seiten = Katalog des Servers
  const katalogAusSeite = (html) => JSON.parse(/window\.PAGE_DATA = (\{.*?\});<\/script>/s.exec(html)[1]).warenkorb.karte;
  assert.deepEqual(katalogAusSeite(start)[g.id], ["Pizza Nonna Rosa", 13.9]);
  assert.deepEqual(katalogAusSeite(karte)[g.id], ["Pizza Nonna Rosa", 13.9]);
  assert.deepEqual(store.ladeBetrieb(BETRIEB).bestellkarte.katalog[g.id], ["Pizza Nonna Rosa", 13.9]);
  assert.deepEqual(bestellkatalog(kp.ladeProjekt(p.id)), store.ladeBetrieb(BETRIEB).bestellkarte.katalog);

  await mitServer(wirt, async (basis) => {
    const bestellen = (positionen) =>
      fetch(`${basis}/oeffentlich/bestellung`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ positionen, abholzeit: "18:30", name: "Gast", telefon: "0170 1" }) }).then((r) => r.json());
    const alt = await bestellen([{ id: g.id, name: g.name, menge: 2, preis: g.preis }]);
    assert.equal(alt.ok, false);
    assert.match(alt.fehler, /Preis für „Pizza Nonna Rosa“ hat sich geändert \(jetzt 13,90 €\)/);
    const ohneId = await bestellen([{ name: "Irgendwas", menge: 1, preis: 1 }]);
    assert.match(ohneId.fehler, /nicht mehr bestellbar/);
    const ok = await bestellen([{ id: g.id, name: "manipuliert", menge: 2, preis: 13.9 }]);
    assert.equal(ok.ok, true);
    assert.equal(ok.bestellung.gesamt, 27.8);
    assert.equal(store.ladeBetrieb(BETRIEB).bestellungen.at(-1).positionen[0].name, "Pizza Nonna Rosa", "Name kommt vom Server");
  });

  // Nicht verfügbar → verschwindet aus Warenkorb und Server-Katalog
  aktion(p.id, { aktion: "gericht", id: g.id, daten: { verfuegbar: false } });
  await baueKundenfassung(p.id);
  assert.equal(store.ladeBetrieb(BETRIEB).bestellkarte.katalog[g.id], undefined);
});

test("„Passt gut dazu“: Bau übergibt Produkte an den Wirt-Betrieb; Mustergerichte erst nach Bestätigung empfehlbar", async () => {
  const p = neu();
  aktion(p.id, { aktion: "feld", feld: "betriebSlug", wert: BETRIEB });
  aktion(p.id, { aktion: "feld", feld: "apiUrl", wert: "http://127.0.0.1:3200" });
  const projekt = kp.ladeProjekt(p.id);
  const alle = projekt.speisekarte.kategorien.flatMap((k) => k.gerichte);
  const dessert = alle.find((x) => x.name === "Tiramisù");
  aktion(p.id, { aktion: "gerichtBestaetigen", id: dessert.id });
  await baueKundenfassung(p.id);

  const produkte = store.ladeBetrieb(BETRIEB).bestellkarte.produkte;
  assert.deepEqual(produkte.map((x) => x.id).sort(), Object.keys(store.ladeBetrieb(BETRIEB).bestellkarte.katalog).sort(), "dieselbe Karte wie der Katalog");
  assert.equal(produkte.find((x) => x.id === dessert.id).rolle, "dessert", "Rolle aus der Musterkarte übernommen");
  assert.deepEqual(produkte.filter((x) => x.empfehlbar !== false).map((x) => x.name), ["Tiramisù"], "nur Bestätigtes");

  const seite = readFileSync(path.join(KUNDEN_AUSGABE, p.id, "speisekarte", "index.html"), "utf-8");
  const pd = JSON.parse(/window\.PAGE_DATA = (\{.*?\});<\/script>/s.exec(seite)[1]).passtDazu;
  assert.equal(pd.muster, false);
  assert.equal(pd.live, true);
  assert.deepEqual(pd.produkte.filter((x) => x.empfehlbar !== false).map((x) => x.name), ["Tiramisù"]);
});

test("Bau: nur Kundenmedien, keine Konzept-/Stockbilder, keine Editor-Spuren, Logo und Texte in vorhandenen Plätzen", async () => {
  const p = neu();
  hochladen(p.id, "logo", png(400, 160));
  aktion(p.id, { aktion: "medium", rolle: "logo", medienAktion: "uebernehmen" });
  aktion(p.id, { aktion: "medium", rolle: "logo", medienAktion: "beschreiben", alt: "Logo Trattoria" });
  aktion(p.id, { aktion: "feld", feld: "text.ambiente.text", wert: "Seit 1998 kochen wir in der Altstadt." });
  aktion(p.id, { aktion: "feld", feld: "slogan", wert: "Pasta wie bei Nonna" });
  await baueKundenfassung(p.id);
  const html = readFileSync(path.join(KUNDEN_AUSGABE, p.id, "index.html"), "utf-8");
  assert.match(html, /<img class="kopf-logo" src="medien\/logo\.png" alt="Trattoria Bella Vista"/);
  assert.match(html, /Seit 1998 kochen wir in der Altstadt\./);
  assert.match(html, /Pasta wie bei Nonna/);
  assert.doesNotMatch(html, /unsplash|Konzeptmaterial|Unverbindlicher Gestaltungsentwurf|Konzept-Demo/i);
  assert.doesNotMatch(html, /\/intern\/|bearbeiten\.html|kunden-panel|demo-panel|contenteditable|data-feld=/);
  assert.ok(existsSync(path.join(KUNDEN_AUSGABE, p.id, "medien", "logo.png")));
  const karte = readFileSync(path.join(KUNDEN_AUSGABE, p.id, "speisekarte", "index.html"), "utf-8");
  assert.match(karte, /src="\.\.\/medien\/logo\.png"/, "Logo auf der Unterseite mit richtigem Pfad");
});

test("Standardlayout bleibt strukturell gleich: dieselben Sektionen wie die Beispielseite derselben Vorlage", async () => {
  const p = neu();
  const g = erstesGericht(p.id);
  hochladen(p.id, `gericht:${g.id}`, png(800, 600));
  aktion(p.id, { aktion: "medium", rolle: `gericht:${g.id}`, medienAktion: "uebernehmen" });
  hochladen(p.id, "haus", png(1200, 800));
  aktion(p.id, { aktion: "medium", rolle: "haus", medienAktion: "uebernehmen" });
  await baueKundenfassung(p.id);
  const kunde = readFileSync(path.join(KUNDEN_AUSGABE, p.id, "index.html"), "utf-8");
  const pr = kp.ladeProjekt(p.id);
  const beispiel = baueSite({ lead: { name: "X", ort: "Y", placeId: "p" }, kueche: "italienisch", stimmung: pr.design.farbschema, optionen: { fontCss: "", fiktiv: true, ausdruck: pr.design.vorlage } }).html;
  const skelett = (h) => [...h.matchAll(/<(section|header|footer|nav|main)\b[^>]*?(?:\sid="([^"]+)")?[^>]*>/g)].map((m) => `${m[1]}#${m[2] ?? ""}`);
  assert.deepEqual(skelett(kunde), skelett(beispiel));
});

/* ---------- Status und Freigabe ---------- */

test("Stufen: Entwurf → gebaut → freigegeben; Änderungen machen Bau und Freigabe veraltet; kein Veröffentlichen", async () => {
  const p = neu();
  let s = kundenAnsicht(p.id).stufen;
  assert.deepEqual([s.lokalGebaut.erreicht, s.freigegeben.erreicht, s.deploymentReady.erreicht, s.live.erreicht], [false, false, false, false]);
  assert.throws(() => kp.aendereProjekt(p.id, undefined, (x, i) => kp.gibFrei(x, { von: "Kunde" }, { jetzt: i.jetzt })), /Erst den aktuellen Stand lokal bauen/);
  await baueKundenfassung(p.id);
  assert.equal(kundenAnsicht(p.id).stufen.lokalGebaut.erreicht, true);
  assert.throws(() => kp.aendereProjekt(p.id, undefined, (x, i) => kp.gibFrei(x, { von: "Kunde" }, { jetzt: i.jetzt })), /Noch nicht freigabefähig/);

  // Alles Nötige ergänzen und bestätigen
  const id = p.id;
  for (const [feld, wert] of [["einladung", "Frisch, jeden Tag."], ["text.ambiente.text", "Unsere Geschichte."], ["text.kicker", "Trattoria · Altötting"]]) aktion(id, { aktion: "feld", feld, wert });
  for (const feld of ["name", "adresse", "telefon", "einladung", "text.ambiente.text", "text.kicker"]) {
    if (!kp.ladeProjekt(id).felder[feld].wert) aktion(id, { aktion: "feld", feld, wert: "089 1234567" });
    aktion(id, { aktion: "feldBestaetigen", feld });
  }
  hochladen(id, "hero", png(1600, 900));
  aktion(id, { aktion: "medium", rolle: "hero", medienAktion: "uebernehmen" });
  aktion(id, { aktion: "medium", rolle: "hero", medienAktion: "bestaetigen" });
  for (const k of kp.ladeProjekt(id).speisekarte.kategorien) for (const g of k.gerichte) {
    aktion(id, { aktion: "gericht", id: g.id, daten: { allergene: "A, G" } });
    aktion(id, { aktion: "gerichtBestaetigen", id: g.id });
  }
  aktion(id, { aktion: "oeffnungszeiten", zeilen: [{ tage: "Di–So", zeiten: "11:30–14:00 & 17:30–22:00" }, { tage: "Mo", zeiten: "Ruhetag" }] });
  aktion(id, { aktion: "oeffnungszeitenBestaetigen" });
  assert.deepEqual(kundenAnsicht(id).stufen.bereitschaft.inhalt, []);
  await baueKundenfassung(id);
  kp.aendereProjekt(id, undefined, (x, i) => kp.gibFrei(x, { von: "Frau Rossi" }, { jetzt: i.jetzt }));
  s = kundenAnsicht(id).stufen;
  assert.equal(s.freigegeben.erreicht, true);
  assert.equal(s.freigegeben.von, "Frau Rossi");
  assert.equal(s.deploymentReady.erreicht, false, "ohne Bestellserver, Impressum, Datenschutz nicht bereit");
  assert.ok(s.deploymentReady.fehlend.some((x) => /Impressum/.test(x)));
  assert.equal(s.live.text, "noch nie veröffentlicht");
  assert.equal(kundenAnsicht(id).plan.moeglich, false);
  assert.equal(kundenAnsicht(id).felder.find((f) => f.id === "name").status, "freigegeben");

  aktion(id, { aktion: "feld", feld: "slogan", wert: "Etwas Neues" });
  s = kundenAnsicht(id).stufen;
  assert.equal(s.freigegeben.erreicht, false);
  assert.equal(s.freigegeben.veraltet, true);
  assert.equal(s.lokalGebaut.veraltet, true);
});

/* ---------- HTTP und Schutz ---------- */

test("Dashboard-Routen: nur mit Token; Vorschau ohne Pfadausbruch; kein Veröffentlichen-Endpunkt", async () => {
  const p = neu();
  await baueKundenfassung(p.id);
  await mitServer(dashboard, async (basis) => {
    process.env.DASHBOARD_TOKEN = "geheim";
    try {
      for (const pfad of [`/intern/kunde/${p.id}`, `/intern/kunde/${p.id}/vorschau/`, "/intern/kunden"]) {
        assert.equal((await fetch(`${basis}${pfad}`)).status, 401, pfad);
      }
      const kopf = { "X-Dashboard-Token": "geheim" };
      const ansicht = await (await fetch(`${basis}/intern/kunde/${p.id}`, { headers: kopf })).json();
      assert.equal(ansicht.kunde.id, p.id);
      const vorschau = await fetch(`${basis}/intern/kunde/${p.id}/vorschau/`, { headers: kopf });
      assert.equal(vorschau.status, 200);
      assert.equal(vorschau.headers.get("x-robots-tag"), "noindex, nofollow");
      assert.equal((await fetch(`${basis}/intern/kunde/${p.id}/vorschau/..%2F..%2F..%2Fpackage.json`, { headers: kopf })).status, 404);
      assert.equal((await fetch(`${basis}/intern/kunde/${p.id}/datei/..%2Fprojekt.json`, { headers: kopf })).status, 404);
      assert.equal((await fetch(`${basis}/intern/kunde/k-0000000000`, { headers: kopf })).status, 400);
      assert.equal((await fetch(`${basis}/intern/kunde/${p.id}/veroeffentlichen`, { method: "POST", headers: kopf })).status, 404);
      // Upload über den vorhandenen multipart-Weg
      const f = new FormData();
      f.set("rolle", "haus");
      f.set("revision", String(kp.ladeProjekt(p.id).revision));
      f.set("datei", new Blob([png(1200, 800)]), "../../boese.png");
      const up = await (await fetch(`${basis}/intern/kunde/${p.id}/medium`, { method: "POST", headers: kopf, body: f })).json();
      assert.equal(up.ok, true);
      assert.match(up.kunde.medien.find((m) => m.rolle === "haus").vorschlag.datei, /^haus-[a-z0-9]{8}\.png$/, "Dateiname bestimmt der Server");
      // Veraltete Revision → 409
      const alt = await fetch(`${basis}/intern/kunde/${p.id}/aktion`, { method: "POST", headers: { ...kopf, "Content-Type": "application/json" }, body: JSON.stringify({ revision: 1, aktion: "feld", feld: "slogan", wert: "x" }) });
      assert.equal(alt.status, 409);
    } finally {
      delete process.env.DASHBOARD_TOKEN;
    }
  });
});

test("Gespeichertes übersteht Neuladen und neuen Prozess (neuer Chat): Preis im Dashboard + Hero im Chat → beide im Bau", async () => {
  const p = neu();
  const g = erstesGericht(p.id);
  aktion(p.id, { aktion: "gericht", id: g.id, daten: { preis: "21,00" } });
  const bild = path.join(kp.KUNDEN_DIR, p.id, "chat-hero.png");
  (await import("node:fs")).writeFileSync(bild, png(1600, 900, [20, 120, 60]));
  execFileSync(process.execPath, ["scripts/kunde.mjs", "medium", "--kunde", p.id, "--rolle", "hero", "--datei", bild, "--uebernehmen"], { cwd: REPO });
  rmSync(bild);
  execFileSync(process.execPath, ["scripts/kunde.mjs", "bauen", "--kunde", p.id], { cwd: REPO });
  const stand = kp.ladeProjekt(p.id);
  assert.equal(kp.findeGericht(stand, g.id).gericht.preis, 21);
  assert.ok(stand.medien.hero.aktuell);
  const karte = readFileSync(path.join(KUNDEN_AUSGABE, p.id, "speisekarte", "index.html"), "utf-8");
  assert.match(karte, /21,00/);
  assert.equal(hash(path.join(KUNDEN_AUSGABE, p.id, "medien", `hero.png`)), stand.medien.hero.aktuell.sha256);
});
