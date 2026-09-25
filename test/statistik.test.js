import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Statistik im Wirt-Dashboard: Zählweise, Quellen, Zeiträume, Messquelle
// für Website-Aufrufe und Trennung der Betriebe.

const SLUG = "__test-statistik";
const FREMD = "__test-statistik-fremd";
process.env.BETRIEB = SLUG;
delete process.env.WIRT_PASSWORT;

const { handler, setzeBremsenZurueck } = await import("../src/wirtServer.js");
const store = await import("../src/betriebStore.js");
const { zeitraum, auswertung, heuteAnstehend, anfragenJe100Aufrufe } = await import("../src/statistik.js");
const { seitenaufrufe, zaehleAbruf, klassifiziereAbruf, SEITENAUFRUFE_DIR } = await import("../src/seitenaufrufe.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dateien = [SLUG, FREMD].map((s) => path.join(__dirname, "..", "data", "betrieb", `${s}.json`));
const aufrufDatei = path.join(SEITENAUFRUFE_DIR, `${SLUG}.json`);

// Donnerstag, 24.09.2026, 17:00 Berlin
const JETZT = new Date("2026-09-24T17:00:00+02:00");
const altUhr = store.uhrHook.jetzt;
store.uhrHook.jetzt = () => new Date(JETZT);

beforeEach(() => {
  setzeBremsenZurueck();
  store.speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [] });
  store.speichereBetrieb(FREMD, { tische: [], reservierungen: [], bestellungen: [] });
  for (let i = 1; i <= 8; i += 1) {
    store.legeTischAn(SLUG, { name: `T${i}`, plaetze: 6 });
    store.legeTischAn(FREMD, { name: `T${i}`, plaetze: 6 });
  }
  rmSync(aufrufDatei, { force: true });
});

after(() => {
  for (const d of dateien) rmSync(d, { force: true });
  rmSync(aufrufDatei, { force: true });
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

const post = (basis, pfad, daten) =>
  fetch(`${basis}${pfad}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten) }).then((r) => r.json());

const res = (zusatz = {}) => ({ datum: "2026-09-26", uhrzeit: "19:00", personen: 2, name: "Gast", telefon: "0170 1", ...zusatz });
const monat = () => zeitraum("monat", JETZT, "Europe/Berlin");

/* ---------- Quellen und Zählweise ---------- */

test("3 Online- und 2 manuelle Reservierungen → Online-Zähler 3, manuell 2 – über die echten Wege", async () => {
  await mitServer(async (basis) => {
    for (let i = 0; i < 3; i += 1) assert.equal((await post(basis, "/oeffentlich/reservierung", res({ personen: 2 }))).ok, true);
    for (let i = 0; i < 2; i += 1) assert.equal((await post(basis, "/api/reservierung", res({ personen: 4 }))).ok, true);
    const d = await (await fetch(`${basis}/api/statistik?zeitraum=monat`)).json();
    assert.equal(d.reservierungen.online.anzahl, 3);
    assert.equal(d.reservierungen.manuell.anzahl, 2);
    assert.equal(d.reservierungen.online.personen, 6);
    assert.equal(d.reservierungen.manuell.personen, 8);
    assert.equal(d.reservierungen.unbekannt.anzahl, 0);
  });
});

test("die Quelle bestimmt der Server, nie ein Wert aus dem Formular", async () => {
  await mitServer(async (basis) => {
    await post(basis, "/api/reservierung", res({ quelle: "online" }));
    await post(basis, "/oeffentlich/reservierung", res({ quelle: "manuell" }));
    const quellen = store.ladeBetrieb(SLUG).reservierungen.map((r) => r.quelle).sort();
    assert.deepEqual(quellen, ["manuell", "online"]);
    assert.throws(() => store.legeReservierungAn(SLUG, res(), "website"), /Unbekannte Quelle/);
  });
});

test("alte Vorgänge ohne gesicherte Quelle zählen als „unbekannt“, nicht als online", () => {
  const daten = {
    reservierungen: [
      { id: "a", datum: "2026-09-10", uhrzeit: "19:00", personen: 2, status: "neu", eingegangen: "2026-09-10T10:00:00Z" },
      { id: "b", datum: "2026-09-10", uhrzeit: "19:00", personen: 2, status: "neu", quelle: "telefon", eingegangen: "2026-09-10T10:00:00Z" },
      { id: "c", datum: "2026-09-10", uhrzeit: "19:00", personen: 2, status: "neu", quelle: "online", eingegangen: "2026-09-10T10:00:00Z" },
    ],
    bestellungen: [{ id: "x", status: "abgeholt", gesamt: 20, eingegangen: "2026-09-10T10:00:00Z" }],
  };
  const d = auswertung(daten, monat());
  assert.equal(d.reservierungen.unbekannt.anzahl, 2);
  assert.equal(d.reservierungen.online.anzahl, 1);
  assert.equal(d.bestellungen.online, 0);
  assert.equal(d.bestellungen.unbekannteQuelle, 1);
});

test("Statuswechsel zählen einen Vorgang nie doppelt", async () => {
  await mitServer(async (basis) => {
    const { reservierung: r } = await post(basis, "/oeffentlich/reservierung", res());
    await post(basis, "/api/reservierung/status", { id: r.id, status: "bestaetigt" });
    await post(basis, "/api/reservierung/status", { id: r.id, status: "abgesagt" });
    const { bestellung: b } = await post(basis, "/oeffentlich/bestellung", { positionen: [{ name: "Pizza", menge: 2, preis: 10 }], abholzeit: "18:30", name: "G", telefon: "1" });
    await post(basis, "/api/bestellung/bestaetigen", { id: b.id, abholzeit: "18:30" });
    await post(basis, "/api/bestellung/status", { id: b.id, status: "abgeholt" });
    const d = await (await fetch(`${basis}/api/statistik?zeitraum=heute`)).json();
    assert.equal(d.reservierungen.online.anzahl, 1);
    assert.equal(d.reservierungen.online.bestaetigt, 0);
    assert.equal(d.reservierungen.online.abgelehnt, 1);
    assert.equal(d.bestellungen.online, 1);
    assert.deepEqual(d.bestellungen.status, { neu: 0, bestaetigt: 0, bereit: 0, abgeholt: 1, abgelehnt: 0, storniert: 0, unbekannt: 0 });
    assert.equal(d.verlauf.punkte.reduce((s, p) => s + p.reservierungenOnline, 0), 1);
  });
});

test("Bestellwert heißt Bestellwert, nicht bezahlter Umsatz – und nennt die enthaltenen Status", () => {
  const daten = {
    reservierungen: [],
    bestellungen: [
      { status: "neu", gesamt: 100, quelle: "online", eingegangen: "2026-09-20T10:00:00Z" },
      { status: "bestaetigt", gesamt: 20, quelle: "online", eingegangen: "2026-09-20T10:00:00Z" },
      { status: "bestaetigt", kuechenStatus: "bereit", gesamt: 10, quelle: "online", eingegangen: "2026-09-20T10:00:00Z" },
      { status: "abgeholt", gesamt: 30, quelle: "online", eingegangen: "2026-09-20T10:00:00Z" },
      { status: "abgelehnt", gesamt: 50, quelle: "online", eingegangen: "2026-09-20T10:00:00Z" },
      { status: "storniert", gesamt: 70, quelle: "online", eingegangen: "2026-09-20T10:00:00Z" },
    ],
  };
  const w = auswertung(daten, monat()).bestellungen.bestellwert;
  assert.equal(w.bezeichnung, "Bestellwert");
  assert.doesNotMatch(w.bezeichnung, /Umsatz/);
  assert.match(w.erklaerung, /Kein bezahlter Umsatz/);
  assert.deepEqual(w.enthalteneStatus, ["bestaetigt", "bereit", "abgeholt"]);
  assert.equal(w.summe, 60);
  assert.equal(w.durchschnitt, 20);
  assert.equal(w.davonAbgeholt, 30);
  const html = readFileSync(path.join(__dirname, "..", "public", "wirt.html"), "utf-8");
  assert.match(html, /\(kein bezahlter Umsatz\)/);
  assert.doesNotMatch(html, /Umsatz<\/h3>/);
});

/* ---------- Zeiträume ---------- */

const iso = (d) => d.toISOString();

test("Tag/Woche/Monat/Quartal/Jahr in Europe/Berlin, Woche ab Montag", () => {
  assert.deepEqual([iso(zeitraum("heute", JETZT).von), iso(zeitraum("heute", JETZT).bis)], ["2026-09-23T22:00:00.000Z", "2026-09-24T22:00:00.000Z"]);
  const w = zeitraum("woche", JETZT);
  assert.equal(w.vonTag, "2026-09-21");
  assert.equal(w.bisTag, "2026-09-27");
  assert.equal(iso(w.von), "2026-09-20T22:00:00.000Z");
  const m = zeitraum("monat", JETZT);
  assert.deepEqual([iso(m.von), iso(m.bis)], ["2026-08-31T22:00:00.000Z", "2026-09-30T22:00:00.000Z"]);
  const q = zeitraum("quartal", JETZT);
  assert.deepEqual([q.vonTag, q.bisTag], ["2026-07-01", "2026-09-30"]);
  const j = zeitraum("jahr", JETZT);
  assert.deepEqual([iso(j.von), iso(j.bis)], ["2025-12-31T23:00:00.000Z", "2026-12-31T23:00:00.000Z"]);
  // Sonntag gehört noch zur laufenden Woche
  assert.equal(zeitraum("woche", new Date("2026-09-27T21:00:00+02:00")).vonTag, "2026-09-21");
});

test("Sommerzeit: Umstellungstage haben 23 bzw. 25 Stunden", () => {
  const herbst = zeitraum("heute", new Date("2026-10-25T12:00:00+01:00"));
  assert.equal((herbst.bis - herbst.von) / 3_600_000, 25);
  assert.equal(iso(herbst.von), "2026-10-24T22:00:00.000Z");
  const fruehling = zeitraum("heute", new Date("2026-03-29T12:00:00+02:00"));
  assert.equal((fruehling.bis - fruehling.von) / 3_600_000, 23);
  assert.equal(iso(fruehling.von), "2026-03-28T23:00:00.000Z");
  const q4 = zeitraum("quartal", new Date("2026-11-02T10:00:00+01:00"));
  assert.deepEqual([iso(q4.von), iso(q4.bis)], ["2026-09-30T22:00:00.000Z", "2026-12-31T23:00:00.000Z"]);
});

test("Monats-, Jahres- und Wochengrenze über Silvester", () => {
  const neujahr = new Date("2026-12-31T23:30:00Z"); // 01.01.2027, 00:30 Berlin
  assert.equal(zeitraum("heute", neujahr).vonTag, "2027-01-01");
  assert.equal(zeitraum("jahr", neujahr).vonTag, "2027-01-01");
  assert.equal(zeitraum("woche", neujahr).vonTag, "2026-12-28");
  const daten = {
    reservierungen: [
      { quelle: "online", status: "neu", personen: 2, eingegangen: "2026-12-31T22:59:00Z" }, // 23:59 Berlin, alt
      { quelle: "online", status: "neu", personen: 2, eingegangen: "2026-12-31T23:00:00Z" }, // 00:00 Berlin, neu
    ],
    bestellungen: [],
  };
  assert.equal(auswertung(daten, zeitraum("jahr", neujahr)).reservierungen.online.anzahl, 1);
  assert.equal(auswertung(daten, zeitraum("monat", new Date("2026-12-15T12:00:00Z"))).reservierungen.online.anzahl, 1);
  // Monatsgrenze 30.09./01.10.: 00:30 Berlin am 1.10. gehört in den Oktober
  const okt = { reservierungen: [{ quelle: "online", status: "neu", personen: 1, eingegangen: "2026-09-30T22:30:00Z" }], bestellungen: [] };
  assert.equal(auswertung(okt, monat()).reservierungen.online.anzahl, 0);
  assert.equal(auswertung(okt, zeitraum("monat", new Date("2026-10-05T12:00:00Z"))).reservierungen.online.anzahl, 1);
});

test("Zeitzone des Betriebs statt UTC", () => {
  const z = zeitraum("heute", new Date("2026-09-25T02:00:00Z"), "America/New_York");
  assert.equal(z.vonTag, "2026-09-24");
  assert.equal(iso(z.von), "2026-09-24T04:00:00.000Z");
});

test("eigener Zeitraum; ungültige Angaben werden abgelehnt", () => {
  const z = zeitraum("frei", JETZT, "Europe/Berlin", { von: "2026-09-01", bis: "2026-09-10" });
  assert.equal(z.bisTag, "2026-09-10");
  assert.equal(z.art, "frei");
  assert.throws(() => zeitraum("frei", JETZT, "Europe/Berlin", { von: "2026-09-10", bis: "2026-09-01" }), /vor dem Anfang/);
  assert.throws(() => zeitraum("frei", JETZT, "Europe/Berlin", { von: "x" }), /JJJJ-MM-TT/);
  assert.throws(() => zeitraum("gestern", JETZT), /Unbekannter Zeitraum/);
});

test("„Was steht heute an?“ gruppiert nach Besuchs-/Abholtag, getrennt von der Eingangs-Zählung", () => {
  const daten = {
    reservierungen: [
      { quelle: "online", status: "bestaetigt", personen: 3, datum: "2026-09-24", uhrzeit: "19:00", eingegangen: "2026-08-01T10:00:00Z" },
      { quelle: "online", status: "neu", personen: 2, datum: "2026-09-30", uhrzeit: "19:00", eingegangen: "2026-09-24T10:00:00Z" },
    ],
    bestellungen: [],
  };
  const h = heuteAnstehend(daten, JETZT);
  assert.equal(h.reservierungen, 1);
  assert.equal(h.personen, 3);
  assert.equal(auswertung(daten, zeitraum("heute", JETZT)).reservierungen.online.anzahl, 1, "nach Eingang zählt die andere");
});

/* ---------- Website-Aufrufe ---------- */

test("ohne Messquelle: „noch nicht messbar“ – keine 0, keine Schätzung", async () => {
  await mitServer(async (basis) => {
    const d = await (await fetch(`${basis}/api/statistik?zeitraum=monat`)).json();
    assert.equal(d.seitenaufrufe.status, "nicht-messbar");
    assert.equal(d.seitenaufrufe.text, "Website-Aufrufe: noch nicht messbar.");
    assert.equal("summe" in d.seitenaufrufe, false);
    assert.equal(d.verhaeltnis, null);
  });
});

test("aktive Messquelle ohne Aufrufe: 0; gezählt wird erst ab Aktivierung, nur aggregiert", () => {
  store.setzeSeitenaufrufMessung(SLUG, "host-aggregat");
  let daten = store.ladeBetrieb(SLUG);
  const leer = seitenaufrufe(SLUG, daten, zeitraum("heute", JETZT));
  assert.equal(leer.status, "aktiv");
  assert.equal(leer.summe, 0);
  assert.equal(leer.bezeichnung, "Seitenaufrufe (Seitenabrufe, keine Personen)");

  const browser = { "user-agent": "Mozilla/5.0 (iPhone)", "x-forwarded-for": "203.0.113.9" };
  assert.equal(zaehleAbruf(SLUG, daten, { pfad: "/", kopf: browser }, JETZT), true);
  assert.equal(zaehleAbruf(SLUG, daten, { pfad: "/speisekarte/", kopf: browser }, JETZT), true);
  for (const nicht of [
    { pfad: "/assets/bild.jpg", kopf: browser },
    { pfad: "/", kopf: { "user-agent": "Googlebot/2.1" } },
    { pfad: "/", kopf: {} },
    { pfad: "/gesund", kopf: browser },
    { pfad: "/?vorschau=1", kopf: browser },
    { pfad: "/", kopf: { ...browser, "sec-purpose": "prefetch" } },
    { pfad: "/", methode: "HEAD", kopf: browser },
    { pfad: "/", status: 404, kopf: browser },
  ]) assert.equal(zaehleAbruf(SLUG, daten, nicht, JETZT), false, JSON.stringify(nicht));
  // Vor der Aktivierung wird nichts gezählt
  assert.equal(zaehleAbruf(SLUG, daten, { pfad: "/", kopf: browser }, new Date("2020-01-01T00:00:00Z")), false);

  daten = store.ladeBetrieb(SLUG);
  const z = zeitraum("heute", JETZT);
  const a = seitenaufrufe(SLUG, daten, z);
  assert.equal(a.summe, 2);
  assert.deepEqual(a.jeTyp, { start: 1, speisekarte: 1, rechtliches: 0, sonstige: 0 });
  const roh = readFileSync(aufrufDatei, "utf-8");
  assert.doesNotMatch(roh, /203\.0\.113|Mozilla|iPhone/, "keine IP, kein User-Agent gespeichert");
  // Messung begann innerhalb des Monats → ehrlich als unvollständig markiert
  const m = seitenaufrufe(SLUG, daten, monat());
  assert.equal(m.vollstaendig, false);
  assert.equal(m.abTag, "2026-09-24");
  assert.equal(anfragenJe100Aufrufe(auswertung(daten, monat()), m), null, "kein Verhältnis aus unvollständigen Zahlen");
  const h = anfragenJe100Aufrufe({ reservierungen: { online: { anzahl: 1 } }, bestellungen: { online: 1 } }, a);
  assert.equal(h.wert, 100);
  assert.match(h.erklaerung, /keine Conversion-Rate von Personen/);
});

test("klassifiziereAbruf: Rechtstexte und Unterseiten", () => {
  const ua = { "user-agent": "Mozilla/5.0" };
  assert.equal(klassifiziereAbruf({ pfad: "/rechtstexte/impressum", kopf: ua }), "rechtliches");
  assert.equal(klassifiziereAbruf({ pfad: "/index.html", kopf: ua }), "start");
  assert.equal(klassifiziereAbruf({ pfad: "/api/betrieb", kopf: ua }), null);
});

/* ---------- Zugriff ---------- */

test("jeder Wirt-Server zeigt nur seinen Betrieb; Statistik ist nicht öffentlich", async () => {
  store.legeReservierungAn(FREMD, res(), "online");
  store.legeReservierungAn(FREMD, res(), "online");
  await mitServer(async (basis) => {
    store.legeReservierungAn(SLUG, res(), "online");
    const d = await (await fetch(`${basis}/api/statistik?zeitraum=monat&betrieb=${FREMD}`)).json();
    assert.equal(d.betrieb, SLUG);
    assert.equal(d.reservierungen.online.anzahl, 1);
    const stand = await (await fetch(`${basis}/api/betrieb?betrieb=${FREMD}`)).json();
    assert.equal(stand.reservierungen.length, 1);

    process.env.WIRT_PASSWORT = "geheim-genug";
    try {
      assert.equal((await fetch(`${basis}/api/statistik`)).status, 401);
      assert.equal((await fetch(`${basis}/api/rechtstexte`)).status, 401);
      const antwort = await fetch(`${basis}/oeffentlich/statistik`, { method: "POST", body: "{}" });
      assert.notEqual(antwort.status, 200);
    } finally {
      delete process.env.WIRT_PASSWORT;
    }
  });
});
