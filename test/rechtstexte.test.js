import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Rechtstexte je Restaurant, Bestätigungen am Formular und No-Show –
// technisch geprüft. Ob ein Text rechtlich trägt, prüft hier niemand.

const SLUG = "__test-rechtstexte";
process.env.BETRIEB = SLUG;
delete process.env.WIRT_PASSWORT;

const { handler, setzeBremsenZurueck } = await import("../src/wirtServer.js");
const store = await import("../src/betriebStore.js");
const { entwurfAusVorlage, ENTWURF_MARKE, oeffentlicheRechtslage } = await import("../src/rechtstexte.js");
const { gibFreigabeTextFrei, gibNoShowRegelFrei } = await import("./hilfen/rechtstexte.js");
const { buildLandingPage } = await import("../src/landingPageGenerator.js");
const { baueSite } = await import("../v2/build/siteBuilder.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);

const JETZT = new Date("2026-09-24T17:00:00+02:00");
let uhr = new Date(JETZT);
const altUhr = store.uhrHook.jetzt;
store.uhrHook.jetzt = () => new Date(uhr);

beforeEach(() => {
  uhr = new Date(JETZT);
  setzeBremsenZurueck();
  store.speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], anzeigeName: "Trattoria Testa" });
  for (let i = 1; i <= 6; i += 1) store.legeTischAn(SLUG, { name: `T${i}`, plaetze: 6 });
});

after(() => {
  rmSync(DATEI, { force: true });
  store.uhrHook.jetzt = altUhr;
});

async function mitServer(fn) {
  const server = createServer(handler);
  await new Promise((f) => server.listen(0, "127.0.0.1", f));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((f) => server.close(f));
  }
}

async function post(basis, pfad, daten) {
  const antwort = await fetch(`${basis}${pfad}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten) });
  return { http: antwort.status, ...(await antwort.json()) };
}

const bestellung = (zusatz = {}) => ({ positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }], abholzeit: "18:30", name: "Gast", telefon: "0170 1", ...zusatz });
const reservierung = (zusatz = {}) => ({ datum: "2026-09-26", uhrzeit: "19:00", personen: 2, name: "Gast", telefon: "0170 1", ...zusatz });

/* ---------- Dokumente ---------- */

test("Vorlagen sind sichtbar als Entwurf markiert, gehören zum Restaurant und erfinden keine Angaben", () => {
  const imp = entwurfAusVorlage("impressum", { name: "Trattoria Testa" });
  assert.ok(imp.inhalt.startsWith(ENTWURF_MARKE));
  assert.match(imp.inhalt, /Trattoria Testa/);
  assert.match(imp.inhalt, /\[\[VOR- UND NACHNAME\]\]/);
  assert.doesNotMatch(imp.inhalt, /Gastro-Webagentur|DE\d{2}\s?\d{4}/i, "keine Agentur als Anbieter, keine erfundene Bankverbindung");
  const ns = entwurfAusVorlage("noshow-bestellung", { name: "X" });
  assert.match(ns.inhalt, /\[\[BETRAG\]\]/, "ohne Angabe kein Betrag");
  assert.match(ns.inhalt, /wesentlich geringerer Schaden/);
  assert.match(ns.inhalt, /nichts automatisch abgebucht/);
});

test("Freigabe nur ohne Platzhalter/Entwurfsvermerk und mit Freigabevermerk; danach unveränderlich", () => {
  const d = store.legeRechtsdokumentEntwurfAn(SLUG, "bestellbedingungen");
  assert.equal(d.status, "entwurf");
  assert.throws(() => store.gibRechtsdokumentFrei(SLUG, d.id, { freigegebenVon: "Wirt", pruefvermerk: "Kanzlei X", geprueftBestaetigt: true }), /Entwurfsvermerk.*Platzhalter/s);
  store.bearbeiteRechtsdokument(SLUG, d.id, { inhalt: "## Bedingungen\nVollständig ausgefüllter Text ohne Platzhalter für den Test." });
  assert.throws(() => store.gibRechtsdokumentFrei(SLUG, d.id, { freigegebenVon: "", pruefvermerk: "", geprueftBestaetigt: false }), /wer die Fassung.*geprüft.*ausdrücklich/s);
  const frei = store.gibRechtsdokumentFrei(SLUG, d.id, { freigegebenVon: "Maria Wirtin", pruefvermerk: "Kanzlei X, 20.09.2026", geprueftBestaetigt: true });
  assert.equal(frei.version, "v1");
  assert.equal(frei.betrieb, SLUG);
  assert.equal(frei.freigegebenVon, "Maria Wirtin");
  assert.equal(frei.freigegebenAm, JETZT.toISOString());
  assert.equal(frei.gueltigAb, JETZT.toISOString());
  assert.match(frei.inhaltHash, /^[0-9a-f]{64}$/);
  assert.throws(() => store.bearbeiteRechtsdokument(SLUG, d.id, { inhalt: "anders" }), /lassen sich nicht ändern/);
  assert.throws(() => store.loescheRechtsdokumentEntwurf(SLUG, d.id), /Nur Entwürfe/);
});

test("Entwürfe sind nie öffentlich; freigegebene Fassungen lesbar und speicherbar", async () => {
  store.legeRechtsdokumentEntwurfAn(SLUG, "impressum");
  await mitServer(async (basis) => {
    const ohne = await (await fetch(`${basis}/rechtstexte/impressum`)).text();
    assert.match(ohne, /noch keine freigegebene Fassung/);
    assert.doesNotMatch(ohne, /ENTWURF/);
    gibFreigabeTextFrei(SLUG, "impressum", { inhalt: "## Angaben\nTrattoria Testa, Musterweg 1, 12345 Musterstadt (Testangaben)." });
    const html = await (await fetch(`${basis}/rechtstexte/impressum`)).text();
    assert.match(html, /Fassung v1/);
    assert.match(html, /Drucken oder als PDF speichern/);
    const txt = await fetch(`${basis}/rechtstexte/impressum/v1.txt`);
    assert.match(txt.headers.get("content-disposition"), /attachment; filename="impressum-v1.txt"/);
    assert.match(await txt.text(), /SHA-256: [0-9a-f]{64}/);
    assert.equal((await fetch(`${basis}/rechtstexte/impressum/v9`)).status, 404);
  });
});

/* ---------- Bestätigungen ---------- */

test("ohne freigegebene Bedingungen: keine Pflichtbestätigung, Anfrage geht durch", async () => {
  await mitServer(async (basis) => {
    const lage = await post(basis, "/oeffentlich/rechtstexte", {});
    assert.equal(lage.bestellung.bedingungen, null);
    assert.equal(lage.bestellung.noShow, null);
    assert.equal(lage.reservierung.noShow, null);
    assert.equal((await post(basis, "/oeffentlich/bestellung", bestellung())).ok, true);
    assert.equal((await post(basis, "/oeffentlich/reservierung", reservierung())).ok, true);
  });
});

test("aktivierte Bedingungen: fehlende oder falsche Version wird serverseitig abgelehnt, richtige mit Nachweis gespeichert", async () => {
  const bed = gibFreigabeTextFrei(SLUG, "bestellbedingungen");
  const resBed = gibFreigabeTextFrei(SLUG, "reservierungsbedingungen");
  await mitServer(async (basis) => {
    const ohne = await post(basis, "/oeffentlich/bestellung", bestellung());
    assert.equal(ohne.http, 400);
    assert.match(ohne.fehler, /Bitte bestätigen Sie die Bestellbedingungen/);
    const falsch = await post(basis, "/oeffentlich/bestellung", bestellung({ bestaetigungen: { bedingungen: "v0" } }));
    assert.match(falsch.fehler, /inzwischen aktualisiert \(gültig ist Fassung v1\)/);
    assert.equal(store.ladeBetrieb(SLUG).bestellungen.length, 0, "abgelehnte Bestellungen werden nicht gespeichert");

    const ok = await post(basis, "/oeffentlich/bestellung", bestellung({ bestaetigungen: { bedingungen: "v1" } }));
    assert.equal(ok.ok, true);
    const b = store.ladeBetrieb(SLUG).bestellungen[0];
    assert.deepEqual(b.bestaetigungen, [{ art: "bestellbedingungen", dokumentId: bed.id, version: "v1", inhaltHash: bed.inhaltHash, zeitpunkt: JETZT.toISOString(), status: "bestaetigt" }]);
    assert.equal(b.quelle, "online");

    const r = await post(basis, "/oeffentlich/reservierung", reservierung());
    assert.match(r.fehler, /Reservierungsbedingungen/);
    assert.equal((await post(basis, "/oeffentlich/reservierung", reservierung({ bestaetigungen: { bedingungen: resBed.version } }))).ok, true);
    // Manuelle Einträge des Wirts brauchen keine Online-Bestätigung.
    assert.equal((await post(basis, "/api/reservierung", reservierung())).ok, true);
  });
});

test("später geänderte Bedingungen verändern alte Nachweise nicht; alte Fassung bleibt abrufbar", async () => {
  const v1 = gibFreigabeTextFrei(SLUG, "bestellbedingungen", { inhalt: "## Alt\nErste Fassung der Bestellbedingungen, ausreichend lang." });
  const alt = store.legeBestellungAn(SLUG, bestellung({ bestaetigungen: { bedingungen: "v1" } }));
  uhr = new Date(JETZT.getTime() + 60_000);
  const kopie = store.kopiereRechtsdokument(SLUG, v1.id);
  store.bearbeiteRechtsdokument(SLUG, kopie.id, { inhalt: "## Neu\nZweite Fassung der Bestellbedingungen, ausreichend lang." });
  store.gibRechtsdokumentFrei(SLUG, kopie.id, { freigegebenVon: "Wirtin", pruefvermerk: "Test", geprueftBestaetigt: true });

  const daten = store.ladeBetrieb(SLUG);
  const nachweis = daten.bestellungen.find((b) => b.id === alt.id).bestaetigungen[0];
  assert.equal(nachweis.version, "v1");
  assert.equal(nachweis.inhaltHash, v1.inhaltHash);
  assert.match(store.rechtsdokumentFassung(daten, "bestellbedingungen", "v1").inhalt, /Erste Fassung/);
  assert.throws(() => store.legeBestellungAn(SLUG, bestellung({ bestaetigungen: { bedingungen: "v1" } })), /gültig ist Fassung v2/);
  await mitServer(async (basis) => {
    const html = await (await fetch(`${basis}/rechtstexte/bestellbedingungen/v1`)).text();
    assert.match(html, /Erste Fassung/);
    assert.match(html, /nicht die aktuell gültige Fassung/);
  });
});

test("eine Fassung mit späterem Gültigkeitsdatum gilt erst ab dann", () => {
  gibFreigabeTextFrei(SLUG, "bestellbedingungen", { gueltigAb: "2026-10-01T00:00:00+02:00" });
  assert.equal(oeffentlicheRechtslage(store.ladeBetrieb(SLUG), JETZT).bestellung.bedingungen, null);
  assert.equal(oeffentlicheRechtslage(store.ladeBetrieb(SLUG), new Date("2026-10-02T12:00:00Z")).bestellung.bedingungen.version, "v1");
});

/* ---------- Formulare ---------- */

test("Formulare: Datenschutz-Hinweis mit Link, ohne Pflicht-Einwilligung; Bestätigungen nicht vorangekreuzt; Bestellknopf nennt die Zahlungspflicht", () => {
  const api = "https://wirt.beispiel.de";
  const v1 = buildLandingPage({ name: "Haus", kueche: "italienisch", adresse: "Weg 1, 80331 München" }, { fontCss: "", apiUrl: api });
  const v2 = baueSite({ lead: { name: "Haus", ort: "München" }, kueche: "italienisch", optionen: { fontCss: "", fiktiv: true, apiUrl: api } }).html;
  for (const [name, html] of [["v1", v1], ["v2", v2]]) {
    assert.match(html, /href="https:\/\/wirt\.beispiel\.de\/rechtstexte\/datenschutz"/, `${name}: Datenschutz-Link`);
    assert.match(html, /href="https:\/\/wirt\.beispiel\.de\/rechtstexte\/impressum"/, `${name}: Impressum im Footer`);
    assert.doesNotMatch(html, /willige[^<]{0,80}(Datenverarbeitung|Verarbeitung)/i, `${name}: keine Pflicht-Einwilligung`);
    assert.doesNotMatch(html, /name="datenschutz/i, `${name}: kein Datenschutz-Häkchen`);
    for (const id of ["ord-bedingungen", "ord-noshow", "res-bedingungen", "res-noshow"]) {
      const tag = html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`));
      assert.ok(tag, `${name}: ${id} vorhanden`);
      assert.doesNotMatch(tag[0], /checked|required/, `${name}: ${id} nicht vorangekreuzt`);
    }
    assert.match(html, />Zahlungspflichtig bestellen</, `${name}: Bestellknopf`);
    assert.match(html, /Reserviert ist der Tisch erst, wenn das Restaurant bestätigt/);
    // Die No-Show-Bestätigung steht getrennt von den Bedingungen und vor dem Knopf.
    const iBed = html.indexOf('id="ord-bedingungen-feld"');
    const iNoShow = html.indexOf('id="ord-noshow-feld"');
    const iKnopf = html.indexOf('id="order-submit"');
    assert.ok(iBed < iNoShow && iNoShow < iKnopf, `${name}: Reihenfolge Bedingungen → No-Show → Absenden`);
  }
});

test("Konzept-Demos und Entwürfe ohne Server: keine Bestätigungen, nichts wird verschickt", () => {
  const konzept = baueSite({ lead: { name: "Echtes Haus", ort: "Y", placeId: "p" }, kueche: "bayerisch", optionen: { fontCss: "", ausdruck: "gesellig", konzept: true, apiUrl: "https://wirt.beispiel.de" } }).html;
  assert.doesNotMatch(konzept, /wirt\.beispiel\.de/);
  assert.doesNotMatch(konzept, /id="ord-bedingungen"|id="res-noshow"|class="rechtliches"/);
  const entwurf = buildLandingPage({ name: "Entwurf", kueche: "italienisch", adresse: "Weg 1" }, { fontCss: "" });
  assert.doesNotMatch(entwurf, /class="rechtliches"/);
  // Ohne Server wird nichts bestellt – der Knopf kündigt keine Zahlungspflicht an.
  assert.match(entwurf, />Probebestellung absenden</);
  assert.doesNotMatch(entwurf, />Zahlungspflichtig bestellen</);
  assert.doesNotMatch(konzept, />Zahlungspflichtig bestellen</);
  assert.match(entwurf, /if \(!data\.apiUrl\) return Promise\.resolve\(\{ demo: true \}\);/);
  assert.match(entwurf, /function ladeRechtslage\(\) \{\s*if \(!data\.apiUrl\) return;/);
});

/* ---------- No-Show ---------- */

test("No-Show AUS (Standard): keine Pflichtbestätigung, keine Gebühr", async () => {
  const daten = store.ladeBetrieb(SLUG);
  assert.equal(daten.noShowSchutzAktiv, false);
  assert.equal(daten.reservierungNoShowAktiv, false);
  const b = store.legeBestellungAn(SLUG, bestellung());
  assert.equal(b.noShowZustimmung, null);
  assert.equal(b.noShowGebuehrBetragVereinbart, null);
  assert.throws(() => store.bestaetigeNoShow(SLUG, b.id, 5), /keine Zustimmung/);
});

test("No-Show einschalten nur mit freigegebener Regel; Betrag und Frist kommen aus der Regel", () => {
  assert.throws(() => store.setzeNoShowSchutz(SLUG, { aktiv: true, gebuehrBetrag: 10, stornofensterMinuten: 30 }), /erst einschalten, wenn eine No-Show-Regel/);
  gibNoShowRegelFrei(SLUG, { betrag: 8, stornofensterMinuten: 60 });
  assert.throws(() => store.setzeNoShowSchutz(SLUG, { aktiv: true, gebuehrBetrag: 15 }), /weicht von der freigegebenen No-Show-Regel v1 ab/);
  const e = store.setzeNoShowSchutz(SLUG, { aktiv: true });
  assert.equal(e.noShowGebuehrBetrag, 8);
  assert.equal(e.noShowStornofensterMinuten, 60);
  // Ein eingeschalteter Schalter ohne gültige Regel wirkt nicht (Altbestand).
  store.speichereBetrieb(SLUG, { ...store.ladeBetrieb(SLUG), rechtsdokumente: [] });
  assert.equal(store.legeBestellungAn(SLUG, bestellung()).noShowZustimmung, null);
});

test("No-Show AN: getrennte Bestätigung Pflicht, veraltete Version abgelehnt, minimaler Nachweis gespeichert", async () => {
  gibFreigabeTextFrei(SLUG, "bestellbedingungen");
  const regel = gibNoShowRegelFrei(SLUG, { betrag: 12.5, stornofensterMinuten: 45 });
  store.setzeNoShowSchutz(SLUG, { aktiv: true });
  await mitServer(async (basis) => {
    const lage = await post(basis, "/oeffentlich/rechtstexte", {});
    assert.equal(lage.bestellung.noShow.version, "v1");
    assert.equal(lage.bestellung.noShow.parameter.betrag, 12.5);
    assert.notEqual(lage.bestellung.noShow.pfad, lage.bestellung.bedingungen.pfad, "eigenes Dokument, getrennt von den Bedingungen");

    const nurBedingungen = await post(basis, "/oeffentlich/bestellung", bestellung({ bestaetigungen: { bedingungen: "v1" } }));
    assert.match(nurBedingungen.fehler, /Ausfallpauschale zu/);
    const altesHaekchen = await post(basis, "/oeffentlich/bestellung", bestellung({ bestaetigungen: { bedingungen: "v1" }, noShowZustimmung: true }));
    assert.match(altesHaekchen.fehler, /Ausfallpauschale zu/, "ein Häkchen ohne Version reicht nicht");
    const veraltet = await post(basis, "/oeffentlich/bestellung", bestellung({ bestaetigungen: { bedingungen: "v1", noShow: "v0" } }));
    assert.match(veraltet.fehler, /No-Show-Regel wurde inzwischen geändert/);

    const ok = await post(basis, "/oeffentlich/bestellung", bestellung({ bestaetigungen: { bedingungen: "v1", noShow: "v1" } }));
    assert.equal(ok.ok, true);
    const b = store.ladeBetrieb(SLUG).bestellungen.at(-1);
    const n = b.bestaetigungen.find((x) => x.art === "noshow-bestellung");
    assert.deepEqual(Object.keys(n).sort(), ["art", "betrag", "dokumentId", "inhaltHash", "status", "version", "zeitpunkt"].sort());
    assert.equal(n.betrag, 12.5);
    assert.equal(n.inhaltHash, regel.inhaltHash);
    assert.equal(b.noShowGebuehrBetragVereinbart, 12.5);
    assert.doesNotMatch(JSON.stringify(b), /127\.0\.0\.1|::ffff/, "keine IP-Adresse als Zustimmungsbeweis");

    // Bestandssystem: Wirt bestätigt manuell, nur nach unten korrigierbar, keine automatische Forderung.
    assert.equal(b.noShowBestaetigtAm, "");
    assert.throws(() => store.bestaetigeNoShow(SLUG, b.id, 20), /höchstens 12.50/);
    assert.equal(store.bestaetigeNoShow(SLUG, b.id, 10).noShowBetrag, 10);
  });
});

test("Zurückziehen der Regel schaltet den No-Show-Schutz sichtbar ab", () => {
  const regel = gibNoShowRegelFrei(SLUG);
  store.setzeNoShowSchutz(SLUG, { aktiv: true });
  store.zieheRechtsdokumentZurueck(SLUG, regel.id);
  assert.equal(store.ladeBetrieb(SLUG).noShowSchutzAktiv, false);
  assert.equal(store.rechtsdokumentFassung(store.ladeBetrieb(SLUG), "noshow-bestellung", "v1").status, "zurueckgezogen", "Fassung bleibt als Nachweis");
});

test("Reservierungs-No-Show: nie automatisch aktiv, nur mit Regel inkl. Nachweisweg einschaltbar", async () => {
  assert.throws(() => store.setzeReservierungsNoShow(SLUG, true), /erst einschalten, wenn eine Fassung freigegeben/);
  assert.throws(() => gibNoShowRegelFrei(SLUG, { art: "noshow-reservierung", betrag: 15, stornofensterMinuten: 1440 }), /Nachweisweg/);
  gibNoShowRegelFrei(SLUG, { art: "noshow-reservierung", betrag: 15, stornofensterMinuten: 1440, nachweisweg: "Tischplan und Anrufnotiz" });
  assert.equal(store.ladeBetrieb(SLUG).reservierungNoShowAktiv, false, "Freigabe schaltet nichts ein");
  await mitServer(async (basis) => {
    assert.equal((await post(basis, "/oeffentlich/rechtstexte", {})).reservierung.noShow, null);
    assert.equal((await post(basis, "/oeffentlich/reservierung", reservierung())).ok, true);
    store.setzeReservierungsNoShow(SLUG, true);
    assert.match((await post(basis, "/oeffentlich/reservierung", reservierung())).fehler, /Ausfallpauschale zu/);
    assert.equal((await post(basis, "/oeffentlich/reservierung", reservierung({ bestaetigungen: { noShow: "v1" } }))).ok, true);
    const r = store.ladeBetrieb(SLUG).reservierungen.at(-1);
    assert.equal(r.bestaetigungen[0].art, "noshow-reservierung");
    assert.equal(r.bestaetigungen[0].betrag, 15);
  });
});

test("Launch-Prüfliste nennt fehlendes Passwort, Impressum, Datenschutz, Allergene und AVV als Blocker", async () => {
  await mitServer(async (basis) => {
    const d = await (await fetch(`${basis}/api/rechtstexte`)).json();
    assert.equal(d.launch.startklar, false);
    const blocker = d.launch.punkte.filter((p) => p.blocker && !p.ok).map((p) => p.punkt).join(" | ");
    for (const m of [/WIRT_PASSWORT/, /Impressum/, /Datenschutzerklärung/, /Allergen/, /AVV/]) assert.match(blocker, m);
    await post(basis, "/intern/launch-vermerk", { punkt: "avv", vermerk: "AVV mit Host unterschrieben", von: "Test" });
    const d2 = await (await fetch(`${basis}/api/rechtstexte`)).json();
    assert.equal(d2.launch.punkte.find((p) => p.vermerk === "avv").ok, true);
  });
});
