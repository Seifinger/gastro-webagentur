import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Rabattaktionen: Rechnung in Cent, Überschneidung, Zeiten (Minute, Tageswechsel,
// Sommer-/Winterzeit), Prüfungen, Trennung der Betriebe, Server als
// Preis-Autorität, unveränderlicher Preisnachweis, Statistik und Rechnung.
// Den Durchlauf im Browser prüft rabattaktionen-browser.test.js.

const SLUG = "__test-rabatt-a";
const ANDERER = "__test-rabatt-b";
process.env.BETRIEB = SLUG;
delete process.env.V2_COPY_LLM;

const { handler } = await import("../src/wirtServer.js");
const store = await import("../src/betriebStore.js");
const r = await import("../src/rabattaktionen.js");
const { auswertung, zeitraum } = await import("../src/statistik.js");
const { erzeugeNoShowRechnung } = await import("../src/rechnungGenerator.js");
const { karteAusDaten } = await import("../v2/build/speisekarte.js");
const { empfehlungsProdukte } = await import("../src/empfehlungen.js");
const { menuForCuisine } = await import("../src/menuCatalog.js");
const { italienischeBetriebskarte } = await import("./hilfen/speisekarten.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATEI = (slug) => path.join(__dirname, "..", "data", "betrieb", `${slug}.json`);

// Donnerstag, 24.09.2026, 17:00 Berlin.
let uhr = new Date("2026-09-24T17:00:00+02:00");
store.uhrHook.jetzt = () => new Date(uhr);
const um = (text) => new Date(`${text}+02:00`);

/** Karte mit einem 12-€-Gericht für die Beispiele des Auftrags. */
function karte() {
  const menu = italienischeBetriebskarte();
  menu.kategorien.find((k) => k.name === "Pasta").gerichte.push({ name: "Lasagne", beschreibung: "Aus dem Ofen", preis: 12 }, { name: "Gnocchi", preis: 12.99 });
  return menu;
}

function hinterlege(slug, menu = karte()) {
  const k = karteAusDaten(menu);
  store.setzeBestellkarte(slug, { katalog: k.katalog, produkte: empfehlungsProdukte(k, { nurBestaetigt: false }), version: "t", quelle: "test" });
}

beforeEach(() => {
  uhr = new Date("2026-09-24T17:00:00+02:00");
  for (const slug of [SLUG, ANDERER]) store.speichereBetrieb(slug, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
  hinterlege(SLUG);
  hinterlege(ANDERER, { ...menuForCuisine("japanisch") });
});
after(() => {
  for (const slug of [SLUG, ANDERER]) rmSync(DATEI(slug), { force: true });
});

const abholung = (prozent, extra = {}) => ({ name: `${prozent} % auf Abholung`, art: "abholung", rabatt: { typ: "prozent", wert: prozent }, ...extra });
const gericht = (gerichte, rabatt, extra = {}) => ({ name: "Gericht der Woche", art: "gericht", gerichte, rabatt, ...extra });
const preis = (id, slug = SLUG) => {
  const d = store.ladeBetrieb(slug);
  return r.preisFuer(id, { bestellkarte: d.bestellkarte, aktionen: d.rabattaktionen ?? [], jetzt: store.uhrHook.jetzt() });
};
const bestellung = (positionen, extra = {}) => ({ positionen, abholzeit: "18:30", abholArt: "geplant", abholZeitpunkt: "2026-09-24T18:30:00+02:00", name: "Gast", telefon: "030 1", ...extra });

async function mitServer(fn) {
  const server = createServer(handler);
  await new Promise((f) => server.listen(0, "127.0.0.1", f));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((f) => server.close(f));
  }
}
const post = (url, daten) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten) }).then(async (a) => ({ status: a.status, ...(await a.json()) }));

/* ------------------------------------------------------------------ */
/* Rechnung                                                            */
/* ------------------------------------------------------------------ */

test("Standard: keine Aktion, reguläre Preise; die Seite bekommt keine Sonderpreise", () => {
  assert.deepEqual(store.rabattaktionen(store.ladeBetrieb(SLUG)), []);
  assert.equal(preis("lasagne").preisCent, 1200);
  assert.deepEqual(store.oeffentlicherPreisstand(store.ladeBetrieb(SLUG)).preise, {});
});

test("10 % allgemeiner Abholrabatt – in Cent, kaufmännisch gerundet je Stück", () => {
  store.legeRabattaktionAn(SLUG, abholung(10));
  assert.equal(preis("lasagne").preisCent, 1080);
  assert.equal(preis("gnocchi").preisCent, 1169, "12,99 € − 1,299 € → Rabatt 1,30 €");
  assert.equal(preis("margherita--26-cm").preisCent, 765, "auch Varianten");
  assert.equal(r.rabattCent(5, { typ: "prozent", wert: 10 }), 1, "0,5 Cent rundet auf");
  assert.equal(r.rabattCent(4, { typ: "prozent", wert: 10 }), 0);
  const e = r.preisermittlung([{ id: "gnocchi", menge: 3 }], { bestellkarte: store.ladeBetrieb(SLUG).bestellkarte, aktionen: store.rabattaktionen(store.ladeBetrieb(SLUG)), jetzt: uhr });
  assert.deepEqual([e.zwischensummeCent, e.ersparnisCent, e.endbetragCent], [3897, 390, 3507], "Positionswert = Stückpreis × Menge");
});

test("2 € Rabatt auf ein einzelnes Gericht – andere Gerichte unberührt", () => {
  store.legeRabattaktionAn(SLUG, gericht(["lasagne"], { typ: "betrag", wert: "2,00" }));
  assert.equal(preis("lasagne").preisCent, 1000);
  assert.equal(preis("diavola").preisCent, 1190);
});

test("zwei Regeln für dasselbe Gericht → nur die günstigere, nie addiert", () => {
  const a = store.legeRabattaktionAn(SLUG, abholung(10));
  const b = store.legeRabattaktionAn(SLUG, gericht(["lasagne"], { typ: "betrag", wert: 2 }));
  const p = preis("lasagne");
  assert.equal(p.preisCent, 1000, "10,00 € – nicht 9,00 €");
  assert.equal(p.aktion.id, b.id);
  assert.deepEqual(p.verworfen.map((v) => [v.aktion.id, v.preisCent]), [[a.id, 1080]]);
  // Ist der allgemeine Rabatt günstiger, gilt er.
  store.legeRabattaktionAn(SLUG, abholung(50, { name: "Halber Preis" }));
  assert.equal(preis("lasagne").preisCent, 600);
  assert.equal(preis("lasagne").aktion.name, "Halber Preis");
});

test("Gericht mit Varianten: Rabatt je Variante; fester Betrag nie über der kleinsten Variante; Extras ohne Preiswirkung", () => {
  store.legeRabattaktionAn(SLUG, gericht(["margherita"], { typ: "betrag", wert: 2 }));
  assert.equal(preis("margherita--26-cm").preisCent, 650);
  assert.equal(preis("margherita--32-cm").preisCent, 850);
  assert.throws(() => store.legeRabattaktionAn(SLUG, gericht(["margherita"], { typ: "betrag", wert: 9 })), /mehr als der Preis von „Margherita“ \(8,50 €\)/);
  // Extras stehen auf der Karte nur als Text; der Warenkorb kennt nur Gericht bzw. Variante.
  assert.ok(!Object.keys(store.ladeBetrieb(SLUG).bestellkarte.katalog).some((id) => /mozzarella|oel/.test(id)));
});

test("Rabatt nie unter 0 €; Prüfungen der Eingabe", () => {
  store.legeRabattaktionAn(SLUG, gericht(["chinotto"], { typ: "prozent", wert: 100 }));
  assert.equal(preis("chinotto").preisCent, 0);
  store.legeRabattaktionAn(SLUG, gericht(["bruschetta"], { typ: "betrag", wert: "6,50" }));
  assert.equal(preis("bruschetta").preisCent, 0);
  assert.equal(r.rabattCent(300, { typ: "betrag", cent: 500 }), 300, "auch rechnerisch nie negativ");
  const fehler = [
    [abholung(-5), /nicht negativ/],
    [abholung(0), /0 ist keine Aktion/],
    [abholung(101), /Mehr als 100 %/],
    [abholung("abc"), /Rabattwert/],
    [{ ...abholung(10), rabatt: { typ: "betrag", wert: 2 } }, /nur bei Rabatten auf einzelne Gerichte/],
    [gericht(["lasagne"], { typ: "betrag", wert: 12.01 }), /mehr als der Preis/],
    [gericht([], { typ: "prozent", wert: 10 }), /mindestens ein Gericht/],
    [gericht(["gibt-es-nicht"], { typ: "prozent", wert: 10 }), /steht nicht \(mehr\) auf Ihrer bestellbaren Karte/],
    [gericht(["tartufo"], { typ: "prozent", wert: 10 }), /steht nicht \(mehr\)/],
    [abholung(10, { start: "2026-09-25T18:00", ende: "2026-09-25T18:00" }), /Ende muss nach dem Start/],
    [abholung(10, { start: "2026-09-20T18:00", ende: "2026-09-21T18:00" }), /Vergangenheit/],
    [abholung(10, { ende: "2026-13-01T10:00" }), /ungültig/],
    [abholung(10, { ausgenommeneKategorien: ["Sushi"] }), /nicht auf Ihrer Karte/],
    [{ ...abholung(10), name: "" }, /Namen/],
  ];
  for (const [eingabe, meldung] of fehler) assert.throws(() => store.legeRabattaktionAn(SLUG, eingabe), meldung, JSON.stringify(eingabe));
});

test("nicht freigegebene Gerichte sind keine Rabattziele; ohne Karte keine Aktion", () => {
  const k = karteAusDaten(karte());
  const produkte = empfehlungsProdukte(k, { nurBestaetigt: true }); // alles unbestätigt
  store.setzeBestellkarte(SLUG, { katalog: k.katalog, produkte, version: "u", quelle: "test" });
  assert.throws(() => store.legeRabattaktionAn(SLUG, gericht(["lasagne"], { typ: "prozent", wert: 10 })), /noch nicht freigegeben/);
  store.speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [] });
  assert.throws(() => store.legeRabattaktionAn(SLUG, abholung(10)), /keine Speisekarte hinterlegt/);
});

test("allgemeine Aktion kann Kategorien ausnehmen (z. B. Getränke)", () => {
  store.legeRabattaktionAn(SLUG, abholung(10, { ausgenommeneKategorien: ["Getränke"] }));
  assert.equal(preis("chinotto").preisCent, 390);
  assert.equal(preis("diavola").preisCent, 1071);
});

/* ------------------------------------------------------------------ */
/* Zeit                                                                */
/* ------------------------------------------------------------------ */

test("Start und Ende auf die Minute (Start inklusive, Ende exklusive), pausiert, beendet", () => {
  const a = store.legeRabattaktionAn(SLUG, abholung(10, { start: "2026-09-24T18:00", ende: "2026-09-24T20:00" }));
  const bei = (t) => { uhr = um(t); return preis("lasagne").preisCent; };
  assert.equal(bei("2026-09-24T17:59:59"), 1200);
  assert.equal(bei("2026-09-24T18:00:00"), 1080);
  assert.equal(bei("2026-09-24T19:59:59"), 1080);
  assert.equal(bei("2026-09-24T20:00:00"), 1200);
  uhr = um("2026-09-24T18:30:00");
  assert.equal(r.zustand(a, uhr), "aktiv");
  store.setzeRabattaktionStatus(SLUG, a.id, "pausiert");
  assert.equal(preis("lasagne").preisCent, 1200, "pausiert");
  store.setzeRabattaktionStatus(SLUG, a.id, "aktiv");
  assert.equal(preis("lasagne").preisCent, 1080, "fortgesetzt");
  store.setzeRabattaktionStatus(SLUG, a.id, "beendet");
  assert.equal(preis("lasagne").preisCent, 1200, "beendet");
  assert.throws(() => store.setzeRabattaktionStatus(SLUG, a.id, "aktiv"), /bereits vorbei/);
  const gespeichert = store.rabattaktionen(store.ladeBetrieb(SLUG))[0];
  assert.equal(gespeichert.ende, uhr.toISOString(), "Ende auf den Zeitpunkt des Beendens");
  assert.ok(gespeichert.beendetAm && gespeichert.geaendert > gespeichert.erstellt);
});

test("Tageswechsel und Sommer-/Winterzeit in der Zeitzone des Betriebs", () => {
  // Mitternacht: 00:00 Berlin im Sommer = 22:00 UTC am Vortag.
  assert.equal(new Date(r.ausWanduhr("2026-09-25T00:00")).toISOString(), "2026-09-24T22:00:00.000Z");
  // Winterzeit: 00:00 Berlin = 23:00 UTC.
  assert.equal(new Date(r.ausWanduhr("2026-11-02T00:00")).toISOString(), "2026-11-01T23:00:00.000Z");
  // 29.03.2026: 02:00–03:00 gibt es nicht.
  assert.throws(() => r.ausWanduhr("2026-03-29T02:30"), /gibt es wegen der Zeitumstellung nicht/);
  // 25.10.2026: 02:30 gibt es zweimal – es gilt das erste Mal (Sommerzeit, 00:30 UTC).
  assert.equal(new Date(r.ausWanduhr("2026-10-25T02:30")).toISOString(), "2026-10-25T00:30:00.000Z");
  // Eine Aktion über die Umstellung: exakt 25 Stunden lang.
  uhr = um("2026-09-24T17:00:00");
  const a = store.legeRabattaktionAn(SLUG, abholung(10, { start: "2026-10-24T12:00", ende: "2026-10-25T12:00" }));
  assert.equal(Date.parse(a.ende) - Date.parse(a.start), 25 * 3600000);
  uhr = new Date("2026-10-25T10:59:00Z"); // 11:59 Winterzeit
  assert.equal(preis("lasagne").preisCent, 1080);
  uhr = new Date("2026-10-25T11:00:00Z"); // 12:00 Winterzeit
  assert.equal(preis("lasagne").preisCent, 1200);
  assert.equal(r.zeitText(Date.parse("2026-10-25T11:00:00Z")), "So. 25.10.2026, 12:00 Uhr");
});

/* ------------------------------------------------------------------ */
/* Server: Autorität, Nachweis, Trennung                               */
/* ------------------------------------------------------------------ */

test("Server ist Preis-Autorität: manipulierte Preise, falscher Endbetrag, Nachweis an der Bestellung", async () => {
  const aktion = store.legeRabattaktionAn(SLUG, gericht(["lasagne"], { typ: "betrag", wert: 2 }));
  await mitServer(async (url) => {
    // Regulärer Preis manipuliert → abgelehnt.
    const billig = await post(`${url}/oeffentlich/bestellung`, bestellung([{ id: "lasagne", name: "Lasagne", menge: 1, preis: 1 }], { erwarteterBetragCent: 100 }));
    assert.equal(billig.ok, false);
    assert.match(billig.fehler, /Preis für „Lasagne“ hat sich geändert \(jetzt 12,00 €\)/);
    // Rabatt als verbindlich vorgegeben (zu niedriger Endbetrag, erfundene Felder) → 409, nichts gespeichert.
    const erfunden = await post(`${url}/oeffentlich/bestellung`, bestellung([{ id: "lasagne", name: "Lasagne", menge: 2, preis: 12, regulaerPreis: 12, aktion: { id: "x" }, rabatt: 12 }], { erwarteterBetragCent: 1 }));
    assert.equal(erfunden.status, 409);
    assert.equal(erfunden.code, "PREIS_GEAENDERT");
    assert.match(erfunden.fehler, /jetzt 20,00 € statt 0,01 €/);
    assert.equal(erfunden.preisstand.preise.lasagne.p, 1000, "der neue Stand für den Warenkorb");
    assert.equal(store.ladeBetrieb(SLUG).bestellungen.length, 0);
    // Richtiger Endbetrag → angenommen, mit Preisnachweis.
    const ok = await post(`${url}/oeffentlich/bestellung`, bestellung([
      { id: "lasagne", name: "Lasagne", menge: 2, preis: 12 },
      { id: "chinotto", name: "Chinotto", menge: 1, preis: 3.9 },
    ], { erwarteterBetragCent: 2390 }));
    assert.equal(ok.ok, true, ok.fehler);
    assert.equal(ok.bestellung.gesamt, 23.9);
    assert.equal(ok.bestellung.ersparnis, 4);
    const [b] = store.ladeBetrieb(SLUG).bestellungen;
    assert.deepEqual(b.positionen, [
      { id: "lasagne", name: "Lasagne", menge: 2, preis: 10, regulaerPreis: 12, aktion: { id: aktion.id, name: "Gericht der Woche", text: "−2,00 €" } },
      { id: "chinotto", name: "Chinotto", menge: 1, preis: 3.9 },
    ]);
    assert.equal(b.gesamt, 23.9);
    assert.deepEqual(b.preisermittlung, {
      zeitpunkt: uhr.toISOString(),
      zeitzone: "Europe/Berlin",
      zwischensummeCent: 2790,
      ersparnisCent: 400,
      endbetragCent: 2390,
      positionen: [
        { id: "lasagne", menge: 2, regulaerCent: 1200, preisCent: 1000, rabattCent: 200, aktion: { id: aktion.id, name: "Gericht der Woche", art: "gericht", rabatt: { typ: "betrag", cent: 200 }, text: "−2,00 €" } },
        { id: "chinotto", menge: 1, regulaerCent: 390, preisCent: 390, rabattCent: 0, aktion: null },
      ],
    });
  });
});

test("Rabatt ändert sich vor dem Checkout: nicht still angenommen, neuer Stand, bewusste Bestätigung", async () => {
  const a = store.legeRabattaktionAn(SLUG, abholung(10));
  await mitServer(async (url) => {
    const stand = await post(`${url}/oeffentlich/preise`, {});
    assert.equal(stand.preise.lasagne.p, 1080);
    assert.equal(stand.preise.lasagne.n, "10 % auf Abholung");
    // Der Wirt pausiert, während der Gast den Warenkorb offen hat.
    await post(`${url}/intern/rabattaktionen/status`, { id: a.id, status: "pausiert" });
    const alt = await post(`${url}/oeffentlich/bestellung`, bestellung([{ id: "lasagne", name: "Lasagne", menge: 1, preis: 12 }], { erwarteterBetragCent: 1080 }));
    assert.equal(alt.status, 409);
    assert.match(alt.fehler, /jetzt 12,00 € statt 10,80 €/);
    assert.deepEqual(alt.preisstand.preise, {}, "Warenkorb zeigt wieder den regulären Preis");
    assert.equal(store.ladeBetrieb(SLUG).bestellungen.length, 0);
    // Der Gast schickt mit dem neuen Betrag erneut ab.
    const neu = await post(`${url}/oeffentlich/bestellung`, bestellung([{ id: "lasagne", name: "Lasagne", menge: 1, preis: 12 }], { erwarteterBetragCent: 1200 }));
    assert.equal(neu.ok, true);
    assert.equal(store.ladeBetrieb(SLUG).bestellungen[0].gesamt, 12);
  });
});

test("Seite ohne bestätigten Aktionspreis (Live-Dienst nicht erreicht, ältere Seite): kein stiller Rabatt", async () => {
  store.legeRabattaktionAn(SLUG, abholung(10));
  await mitServer(async (url) => {
    // Die Seite hat nur reguläre Preise gezeigt (ohne Angabe oder mit regulärem Betrag).
    for (const extra of [{}, { erwarteterBetragCent: 1200 }]) {
      const antwort = await post(`${url}/oeffentlich/bestellung`, bestellung([{ id: "lasagne", name: "Lasagne", menge: 1, preis: 12 }], extra));
      assert.equal(antwort.status, 409);
      assert.equal(antwort.preisstand.preise.lasagne.p, 1080);
    }
    assert.equal(store.ladeBetrieb(SLUG).bestellungen.length, 0);
  });
});

test("zwei Bestellungen vor und nach Aktionsende; die Abholzeit aktiviert keinen beendeten Rabatt", async () => {
  store.legeRabattaktionAn(SLUG, abholung(10, { start: "2026-09-24T16:00", ende: "2026-09-24T17:30" }));
  await mitServer(async (url) => {
    uhr = um("2026-09-24T17:29:00");
    const vorher = await post(`${url}/oeffentlich/bestellung`, bestellung([{ id: "lasagne", name: "Lasagne", menge: 1, preis: 12 }], { erwarteterBetragCent: 1080, abholzeit: "18:30" }));
    assert.equal(vorher.ok, true, vorher.fehler);
    uhr = um("2026-09-24T17:30:00");
    const nachher = await post(`${url}/oeffentlich/bestellung`, bestellung([{ id: "lasagne", name: "Lasagne", menge: 1, preis: 12 }], { erwarteterBetragCent: 1080 }));
    assert.equal(nachher.status, 409, "Abholung 18:30 liegt nach dem Ende – bestellt wurde auch nach dem Ende");
    const regulaer = await post(`${url}/oeffentlich/bestellung`, bestellung([{ id: "lasagne", name: "Lasagne", menge: 1, preis: 12 }], { erwarteterBetragCent: 1200 }));
    assert.equal(regulaer.ok, true);
  });
  assert.deepEqual(store.ladeBetrieb(SLUG).bestellungen.map((b) => b.gesamt), [10.8, 12]);
});

test("alter Preisnachweis bleibt nach späterer Regeländerung erhalten – auch in Statistik und No-Show-Rechnung", async () => {
  const a = store.legeRabattaktionAn(SLUG, abholung(10));
  store.legeBestellungAn(SLUG, bestellung([{ id: "lasagne", name: "Lasagne", menge: 2, preis: 12 }], { erwarteterBetragCent: 2160 }), uhr);
  const vorher = structuredClone(store.ladeBetrieb(SLUG).bestellungen[0]);
  uhr = um("2026-09-24T17:10:00");
  store.setzeRabattaktionStatus(SLUG, a.id, "beendet");
  store.legeRabattaktionAn(SLUG, abholung(50, { name: "Neue Aktion" }));
  const nachher = store.ladeBetrieb(SLUG).bestellungen[0];
  assert.deepEqual(nachher, vorher, "nichts rückwirkend geändert");
  assert.equal(nachher.preisermittlung.positionen[0].aktion.id, a.id);

  // Statistik: vereinbarter Betrag nach Rabatt; „vor Rabatt“ nur zur Einordnung.
  store.setzeBestellungStatus(SLUG, nachher.id, "bestaetigt");
  const w = auswertung(store.ladeBetrieb(SLUG), zeitraum("monat", uhr, "Europe/Berlin")).bestellungen.bestellwert;
  assert.equal(w.summe, 21.6);
  assert.equal(w.vorRabatt, 24);
  assert.equal(w.rabatt, 2.4);
  assert.match(w.erklaerung, /nach Abzug von Rabattaktionen/);
  assert.match(w.erklaerung, /Kein bezahlter Umsatz/);

  // Rechnung liest die gespeicherten Preise, nicht die aktuellen Aktionen.
  const pdf = await erzeugeNoShowRechnung({ betrieb: SLUG, bestellung: nachher, betrag: 10, bankverbindung: "" });
  assert.ok(pdf.length > 500);
});

test("Abholzeit und Bestellprüfung funktionieren weiterhin mit Aktion", () => {
  store.legeRabattaktionAn(SLUG, abholung(10));
  assert.throws(() => store.legeBestellungAn(SLUG, bestellung([{ id: "lasagne", name: "Lasagne", menge: 1, preis: 12 }], { erwarteterBetragCent: 1080, abholzeit: "17:02", abholZeitpunkt: "2026-09-24T17:02:00+02:00" }), uhr), /nicht mehr möglich|bieten wir keine Abholung/);
  assert.throws(() => store.legeBestellungAn(SLUG, bestellung([{ id: "tartufo", name: "Tartufo", menge: 1, preis: 16.9 }], { erwarteterBetragCent: 1521 }), uhr), /nicht mehr bestellbar/);
  const b = store.legeBestellungAn(SLUG, bestellung([{ id: "lasagne", name: "Lasagne", menge: 1, preis: 12 }], { erwarteterBetragCent: 1080, abholArt: "asap", abholZeitpunkt: "2026-09-24T17:20:00+02:00" }), uhr);
  assert.equal(b.abholArt, "asap");
  assert.equal(b.gesamt, 10.8);
});

test("Restaurant A und B strikt getrennt: sehen, anlegen, ändern", async () => {
  const b = store.legeRabattaktionAn(ANDERER, abholung(20, { name: "Aktion von B" }));
  await mitServer(async (url) => {
    // Der Server von A kennt nur A.
    const liste = await (await fetch(`${url}/api/rabattaktionen`)).json();
    assert.deepEqual(liste.aktionen, []);
    assert.ok(!liste.produkte.some((p) => p.kategorie === "Sushi"));
    const fremd = await post(`${url}/intern/rabattaktionen/status`, { id: b.id, status: "beendet" });
    assert.equal(fremd.ok, false);
    assert.match(fremd.fehler, /nicht gefunden/);
    const sushi = store.ladeBetrieb(ANDERER).bestellkarte.produkte.find((p) => p.kategorie === "Sushi").id;
    const fremdesGericht = await post(`${url}/intern/rabattaktionen`, gericht([sushi], { typ: "prozent", wert: 10 }));
    assert.equal(fremdesGericht.ok, false);
    assert.deepEqual((await post(`${url}/oeffentlich/preise`, {})).preise, {}, "B’s Aktion wirkt nicht bei A");
  });
  assert.equal(store.rabattaktionen(store.ladeBetrieb(ANDERER))[0].status, "aktiv");
});

test("Dashboard-API: Übersicht mit Zustand, Vorschau alt/neu mit offener Überschneidung; nach Neustart erhalten", async () => {
  await mitServer(async (url) => {
    const gespeichert = await post(`${url}/intern/rabattaktionen`, { ...abholung(10), start: "2026-09-24T17:00", ende: "2026-09-27T23:59" });
    assert.equal(gespeichert.ok, true, gespeichert.fehler);
    const vorschau = await post(`${url}/api/rabattaktionen/vorschau`, gericht(["lasagne"], { typ: "betrag", wert: "2" }));
    assert.deepEqual(vorschau.zeilen.map((z) => [z.name, z.regulaer, z.mitAktion, z.tatsaechlich]), [["Lasagne", 12, 10, 10]]);
    const ueberschneidung = await post(`${url}/api/rabattaktionen/vorschau`, gericht(["chinotto"], { typ: "prozent", wert: 5 }));
    assert.match(ueberschneidung.zeilen[0].stattdessen, /günstigere Aktion „10 % auf Abholung“/);
    assert.equal(store.ladeBetrieb(SLUG).rabattaktionen.length, 1, "Vorschau speichert nichts");
    const ansicht = await (await fetch(`${url}/api/rabattaktionen`)).json();
    const [a] = ansicht.aktionen;
    assert.equal(a.zustandText, "gilt jetzt");
    assert.equal(a.zeitraumText, "Do. 24.09.2026, 17:00 Uhr – So. 27.09.2026, 23:59 Uhr");
    assert.match(a.giltFuer, /alle online bestellbaren Produkte der Karte – nur Abholbestellungen, nicht Reservierungen/);
  });
  const roh = JSON.parse(readFileSync(DATEI(SLUG), "utf-8"));
  assert.equal(roh.rabattaktionen[0].name, "10 % auf Abholung");
  assert.equal(roh.rabattaktionen[0].zeitzone, "Europe/Berlin");
  assert.match(roh.rabattaktionen[0].id, /^ra-[0-9a-f]{10}$/);
});

test("Wirt-Dashboard hat den Reiter „Rabattaktionen“ mit dokumentierter Überschneidungsregel", () => {
  const html = readFileSync(path.join(__dirname, "..", "public", "wirt.html"), "utf-8");
  assert.match(html, /<button data-tab="rabattaktionen">Rabattaktionen<\/button>/);
  assert.match(html, /Rabatte werden nicht addiert[\s\S]*12,00 € – allgemein 10 % → 10,80 €,\s*Gericht-Rabatt 2,00 € → 10,00 €\. Der Gast zahlt 10,00 € \(nicht 9,00 €\)/);
  for (const id of ["ra-form", "ra-name", "ra-typ", "ra-wert", "ra-start", "ra-ende", "ra-ziel", "ra-vorschau", "ra-liste", "ra-archiv"]) assert.match(html, new RegExp(`id="${id}"`));
});
