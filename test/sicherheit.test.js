import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { rmSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { connect } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Regressionstests zum Sicherheits-Audit (SECURITY-AUDIT.md). Jeder Test
// stellt einen nachgewiesenen Befund mit synthetischen Daten nach – nur
// lokal, gegen einen Testbetrieb.

const SLUG = "__test-sicherheit";
process.env.BETRIEB = SLUG;

const { handler, setzeBremsenZurueck } = await import("../src/wirtServer.js");
const store = await import("../src/betriebStore.js");
const schutz = await import("../src/anfrageSchutz.js");
const anmeldung = await import("../src/dashboardAnmeldung.js");
const { handler: dashboard } = await import("../src/dashboardServer.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);
const ENV = ["WIRT_PASSWORT", "WIRT_OEFFENTLICHE_URL", "VERTRAUTER_PROXY", "NODE_ENV", "DASHBOARD_TOKEN", "DASHBOARD_PASSWORT_HASH"];
const altEnv = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
const PASSWORT = "ein-langes-wirt-passwort";
const ANMELDUNG = `Basic ${Buffer.from(`wirt:${PASSWORT}`).toString("base64")}`;
const MORGEN = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

let server;
let basis;

before(async () => {
  server = createServer(handler);
  await new Promise((f) => server.listen(0, "127.0.0.1", f));
  basis = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  for (const k of ENV) delete process.env[k];
  setzeBremsenZurueck();
  anmeldung._zuruecksetzenFuerTests();
  store.speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], anzeigeName: "Testhaus", telefon: "030 1111111" });
  store.legeTischAn(SLUG, { name: "Tisch 1", plaetze: 8 });
});

after(async () => {
  await new Promise((f) => server.close(f));
  rmSync(DATEI, { force: true });
  for (const k of ENV) {
    if (altEnv[k] === undefined) delete process.env[k];
    else process.env[k] = altEnv[k];
  }
});

/** GET mit frei wählbarem Host-Kopf – fetch() lässt den Host-Kopf nicht zu. */
function mitHost(url, host) {
  return new Promise((fertig, fehler) => {
    const u = new URL(url);
    const anfrage = request({ host: u.hostname, port: u.port, path: u.pathname, headers: { Host: host } }, (antwort) => {
      let text = "";
      antwort.on("data", (t) => (text += t));
      antwort.on("end", () => fertig({ status: antwort.statusCode, text }));
    });
    anfrage.on("error", fehler);
    anfrage.end();
  });
}

function reservieren(extraKoepfe = {}, daten = {}) {
  return fetch(`${basis}/oeffentlich/reservierung`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraKoepfe },
    body: JSON.stringify({ datum: MORGEN, uhrzeit: "19:00", personen: 2, name: "Erika Beispiel", telefon: "0170 0000000", ...daten }),
  });
}

/* ---------- Wirt-Server: Zugang ohne Passwort ---------- */

test("ohne WIRT_PASSWORT: Gastdaten nur bei direktem Zugriff auf diesem Rechner", async () => {
  assert.equal((await reservieren()).status, 200);

  const direkt = await fetch(`${basis}/api/betrieb`);
  assert.equal(direkt.status, 200, "lokale Entwicklung bleibt wie bisher");

  // Hinter einem Reverse Proxy auf demselben Rechner (Caddy, nginx, Tunnel)
  // kommt die Verbindung auch von 127.0.0.1 – sie ist trotzdem öffentlich.
  for (const kopf of [{ "X-Forwarded-For": "203.0.113.7" }, { "X-Real-IP": "203.0.113.7" }, { Forwarded: "for=203.0.113.7" }]) {
    const r = await fetch(`${basis}/api/betrieb`, { headers: kopf });
    assert.equal(r.status, 403, JSON.stringify(kopf));
    assert.doesNotMatch(await r.text(), /Erika/);
  }
  // Proxy ohne Weiterleitungs-Köpfe, aber mit öffentlichem Host – oder
  // DNS-Rebinding über eine fremde Domain.
  const fremderHost = await mitHost(`${basis}/api/betrieb`, "wirt.beispiel.de");
  assert.equal(fremderHost.status, 403);
  assert.doesNotMatch(fremderHost.text, /Erika/);
  assert.equal((await mitHost(`${basis}/api/betrieb`, `localhost:${new URL(basis).port}`)).status, 200);
  const schreiben = await fetch(`${basis}/intern/bankverbindung`, { method: "POST", headers: { "X-Forwarded-For": "203.0.113.7" }, body: JSON.stringify({ bankverbindung: "DE00 fremd" }) });
  assert.equal(schreiben.status, 403);
  assert.equal(store.ladeBetrieb(SLUG).bankverbindung ?? "", "");

  // Öffentliche Adresse eingetragen oder Produktionsbetrieb: dann auch lokal gesperrt.
  process.env.WIRT_OEFFENTLICHE_URL = "https://wirt.beispiel.de";
  assert.equal((await fetch(`${basis}/api/betrieb`)).status, 403);
  delete process.env.WIRT_OEFFENTLICHE_URL;
  process.env.NODE_ENV = "production";
  assert.equal((await fetch(`${basis}/api/betrieb`)).status, 403);
  assert.match(await (await fetch(`${basis}/`)).text(), /WIRT_PASSWORT/);

  // Die Gastseite funktioniert weiter.
  const gast = await reservieren({ "X-Forwarded-For": "203.0.113.8" }, { uhrzeit: "12:00" });
  assert.equal(gast.status, 200, await gast.clone().text());
  assert.equal((await fetch(`${basis}/status`, { headers: { "X-Forwarded-For": "203.0.113.8" } })).status, 200);
});

/* ---------- Wirt-Server: CSRF ---------- */

test("Wirt-Aktionen, die eine fremde Seite im Browser auslöst, werden abgelehnt", async () => {
  process.env.WIRT_PASSWORT = PASSWORT;
  store.setzeBankverbindung(SLUG, "DE00 richtig");
  // Der Browser schickt gespeicherte Basic-Anmeldedaten auch bei einem
  // Formular von einer fremden Seite mit; text/plain braucht keinen Preflight.
  const angriffe = [
    { "Sec-Fetch-Site": "cross-site", Origin: "https://boese.example" },
    { "Sec-Fetch-Site": "same-site", Origin: "https://www.beispiel.de" },
    { Origin: "https://boese.example" },
    { Origin: "null" },
  ];
  for (const kopf of angriffe) {
    const r = await fetch(`${basis}/intern/bankverbindung`, {
      method: "POST",
      headers: { Authorization: ANMELDUNG, "Content-Type": "text/plain", ...kopf },
      body: JSON.stringify({ bankverbindung: "DE99 Angreifer" }),
    });
    assert.equal(r.status, 403, JSON.stringify(kopf));
  }
  assert.equal(store.ladeBetrieb(SLUG).bankverbindung, "DE00 richtig");

  // Das eigene Dashboard (gleiche Herkunft) und Werkzeuge ohne Browser gehen.
  const eigen = await fetch(`${basis}/intern/bankverbindung`, {
    method: "POST",
    headers: { Authorization: ANMELDUNG, "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin", Origin: basis },
    body: JSON.stringify({ bankverbindung: "DE11 neu" }),
  });
  assert.equal(eigen.status, 200);
  const ohneBrowser = await fetch(`${basis}/intern/wartezeit`, { method: "POST", headers: { Authorization: ANMELDUNG }, body: JSON.stringify({ minuten: 10 }) });
  assert.equal(ohneBrowser.status, 200);
  // Gastseiten auf anderer Domain dürfen weiter reservieren (CORS).
  assert.equal((await reservieren({ "Sec-Fetch-Site": "cross-site", Origin: "https://restaurant.example" })).status, 200);
});

test("Wirt-Dashboard: nicht einbettbar, nicht zwischengespeichert", async () => {
  for (const pfad of ["/", "/api/betrieb"]) {
    const r = await fetch(basis + pfad);
    assert.equal(r.headers.get("x-frame-options"), "DENY", pfad);
    assert.equal(r.headers.get("x-content-type-options"), "nosniff", pfad);
    assert.match(r.headers.get("cache-control") ?? "", /no-store/, pfad);
  }
});

/* ---------- Wirt-Server: Anmeldeversuche ---------- */

test("falsches WIRT_PASSWORT: nach 10 Fehlversuchen je Adresse gesperrt, andere Adressen nicht", async () => {
  process.env.WIRT_PASSWORT = PASSWORT;
  process.env.VERTRAUTER_PROXY = "1";
  const falsch = `Basic ${Buffer.from("wirt:falsch").toString("base64")}`;
  const angreifer = { "X-Forwarded-For": "203.0.113.66" };
  for (let i = 0; i < 10; i += 1) {
    assert.equal((await fetch(`${basis}/api/betrieb`, { headers: { ...angreifer, Authorization: falsch } })).status, 401);
  }
  assert.equal((await fetch(`${basis}/api/betrieb`, { headers: { ...angreifer, Authorization: ANMELDUNG } })).status, 429);
  const wirt = await fetch(`${basis}/api/betrieb`, { headers: { "X-Forwarded-For": "198.51.100.4", Authorization: ANMELDUNG } });
  assert.equal(wirt.status, 200);
});

test("kurzes WIRT_PASSWORT zählt in der Launch-Prüfung nicht als Schutz", async () => {
  process.env.WIRT_PASSWORT = "kurz";
  const d = await (await fetch(`${basis}/api/rechtstexte`, { headers: { Authorization: `Basic ${Buffer.from("x:kurz").toString("base64")}` } })).json();
  const punkt = d.launch.punkte.find((p) => /WIRT_PASSWORT/.test(p.punkt));
  assert.equal(punkt.ok, false);
  assert.match(punkt.punkt, /12 Zeichen/);
});

/* ---------- Wirt-Server: Bremsen hinter einem Proxy ---------- */

test("hinter vertrautem Proxy: Gäste teilen sich keine Bremse, gefälschte Köpfe helfen ohne Proxy nicht", async () => {
  // Ohne VERTRAUTER_PROXY zählt die Verbindung – eine erfundene
  // X-Forwarded-For-Zeile umgeht die Bremse nicht.
  for (let i = 1; i <= 20; i += 1) {
    assert.notEqual((await reservieren({ "X-Forwarded-For": `203.0.113.${i}` }, { personen: 0 })).status, 429);
  }
  assert.equal((await reservieren({ "X-Forwarded-For": "203.0.113.99" }, { personen: 0 })).status, 429);

  // Mit VERTRAUTER_PROXY=1 (Proxy auf demselben Rechner) zählt je Gast.
  setzeBremsenZurueck();
  process.env.VERTRAUTER_PROXY = "1";
  for (let i = 1; i <= 30; i += 1) {
    const r = await reservieren({ "X-Forwarded-For": `198.51.100.${i}` }, { personen: 0 });
    assert.notEqual(r.status, 429, `Gast ${i}`);
  }
  // Wer seine Kopfzeile selbst vorne ergänzt, bleibt trotzdem ein Gast.
  for (let i = 1; i <= 20; i += 1) {
    await reservieren({ "X-Forwarded-For": `10.9.9.${i}, 203.0.113.50` }, { personen: 0 });
  }
  assert.equal((await reservieren({ "X-Forwarded-For": "10.9.9.99, 203.0.113.50" }, { personen: 0 })).status, 429);
});

test("hinter vertrautem Proxy: falsche Status-Links eines Aufrufers sperren andere Gäste nicht", async () => {
  process.env.VERTRAUTER_PROXY = "1";
  const gast = { "X-Forwarded-For": "198.51.100.20" };
  const antwort = await (await reservieren(gast)).json();
  const token = antwort.reservierung.statusToken;
  assert.ok(token);
  const status = (kopf, t) => fetch(`${basis}/oeffentlich/status`, { method: "POST", headers: { "Content-Type": "application/json", ...kopf }, body: JSON.stringify({ token: t }) });
  for (let i = 0; i < 10; i += 1) await status({ "X-Forwarded-For": "203.0.113.44" }, "x".repeat(43));
  assert.equal((await status({ "X-Forwarded-For": "203.0.113.44" }, token)).status, 429);
  assert.equal((await status(gast, token)).status, 200);
});

/* ---------- Gasteingaben ---------- */

test("überlange Gasteingaben werden abgelehnt, normale nicht", async () => {
  const lang = await reservieren({}, { name: "E".repeat(5000) });
  assert.equal(lang.status, 400);
  assert.match((await lang.json()).fehler, /Name.*zu lang/);
  assert.equal((await reservieren({}, { wunsch: "W".repeat(5000) })).status, 400);
  assert.equal((await reservieren({}, { wunsch: "Fensterplatz, ein Kinderstuhl bitte." })).status, 200);

  const bestellung = (daten) => fetch(`${basis}/oeffentlich/bestellung`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Max", telefon: "0170 1", abholzeit: "19:30", positionen: [{ name: "Pizza", menge: 1, preis: 9 }], ...daten }),
  });
  assert.equal((await bestellung({ hinweis: "H".repeat(5000) })).status, 400);
  assert.equal((await bestellung({ positionen: Array.from({ length: 101 }, () => ({ name: "Brot", menge: 1, preis: 1 })) })).status, 400);
  assert.equal((await bestellung({ positionen: [{ name: "P".repeat(500), menge: 1, preis: 9 }] })).status, 400);
  assert.equal((await bestellung({ telefon: "1".repeat(100) })).status, 400);
});

/* ---------- Gemeinsame Bausteine ---------- */

test("clientAdresse: Weiterleitungs-Köpfe nur von einem vertrauten, lokalen Proxy", () => {
  const anfrage = (remoteAddress, headers = {}) => ({ socket: { remoteAddress }, headers });
  assert.equal(schutz.clientAdresse(anfrage("127.0.0.1", { "x-forwarded-for": "203.0.113.1" }), {}), "127.0.0.1");
  assert.equal(schutz.clientAdresse(anfrage("127.0.0.1", { "x-forwarded-for": "1.1.1.1, 203.0.113.1" }), { VERTRAUTER_PROXY: "1" }), "203.0.113.1");
  assert.equal(schutz.clientAdresse(anfrage("10.0.0.2", { "x-forwarded-for": "203.0.113.1, 172.16.0.9" }), { VERTRAUTER_PROXY: "2" }), "203.0.113.1");
  // Direkt aus dem Internet: Kopfzeilen zählen nie, auch mit VERTRAUTER_PROXY.
  assert.equal(schutz.clientAdresse(anfrage("198.51.100.3", { "x-forwarded-for": "203.0.113.1" }), { VERTRAUTER_PROXY: "1" }), "198.51.100.3");
  assert.equal(schutz.clientAdresse(anfrage("fdaa::5", { "fly-client-ip": "203.0.113.2" }), { VERTRAUTER_PROXY: "fly" }), "203.0.113.2");
  assert.equal(schutz.clientAdresse(anfrage("fdaa::5", { "fly-client-ip": "kein-ip" }), { VERTRAUTER_PROXY: "fly" }), "fdaa::5");
  assert.equal(schutz.clientAdresse(anfrage("::ffff:127.0.0.1"), {}), "127.0.0.1");
});

test("Bremse: begrenzt die Zahl gemerkter Adressen", () => {
  const b = new schutz.Bremse({ fensterMs: 60_000, maxSchluessel: 100 });
  for (let i = 0; i < 1000; i += 1) b.zaehle(`2001:db8::${i.toString(16)}`, 1000 + i);
  assert.ok(b.groesse <= 100, `gemerkt: ${b.groesse}`);
  assert.equal(b.zaehle("2001:db8::3e7", 2000), 2, "die zuletzt aktiven bleiben erhalten");
});

/* ---------- Agentur-Dashboard ---------- */

async function mitDashboard(fn) {
  const s = createServer(dashboard);
  await new Promise((f) => s.listen(0, "127.0.0.1", f));
  try {
    return await fn(`http://127.0.0.1:${s.address().port}`);
  } finally {
    await new Promise((f) => s.close(f));
  }
}

test("Dashboard lokal ohne Anmeldung: Schreibaktionen einer fremden Seite und fremde Host-Köpfe abgelehnt", async () => {
  await mitDashboard(async (d) => {
    const fremd = await fetch(`${d}/api/kueche`, {
      method: "POST",
      headers: { "Content-Type": "text/plain", "Sec-Fetch-Site": "cross-site", Origin: "https://boese.example" },
      body: JSON.stringify({ placeId: "ChIJsicherheit", kueche: "" }),
    });
    assert.equal(fremd.status, 403);
    // DNS-Rebinding: eine fremde Domain, die auf 127.0.0.1 zeigt.
    assert.equal((await mitHost(`${d}/api/leads`, "boese.example")).status, 421);
    assert.equal((await fetch(`${d}/api/leads`)).status, 200);
  });
});

test("Dashboard-Anmeldung: erfundene X-Forwarded-For-Zeilen umgehen die Fehlversuch-Sperre nicht", async () => {
  process.env.DASHBOARD_PASSWORT_HASH = anmeldung.erzeugePasswortHash("ein-sehr-langes-passwort");
  await mitDashboard(async (d) => {
    const versuch = (xff, passwort = "falsch-falsch") => fetch(`${d}/anmelden`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: d, "X-Forwarded-For": xff },
      body: new URLSearchParams({ passwort }).toString(),
    });
    for (let i = 0; i < 10; i += 1) assert.equal((await versuch(`203.0.113.${i}`)).status, 401);
    assert.equal((await versuch("203.0.113.200", "ein-sehr-langes-passwort")).status, 429);
  });
});

/* ---------- Stabilität ---------- */

/** Schickt eine Anfrage Byte für Byte – so, wie sie fetch() nie erzeugen würde. */
function rohAnfrage(url, text) {
  return new Promise((fertig) => {
    const u = new URL(url);
    const sock = connect(Number(u.port), u.hostname, () => sock.end(text));
    let antwort = "";
    sock.on("data", (d) => (antwort += d));
    sock.on("close", () => fertig(antwort));
    sock.on("error", () => fertig(antwort));
  });
}

test("kaputte Adresse oder kaputter Host-Kopf beendet den Server nicht", async () => {
  for (const zeilen of ["GET //[ HTTP/1.1\r\nHost: 127.0.0.1\r\n", "POST //[ HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 0\r\n", "GET / HTTP/1.1\r\nHost: [\r\n"]) {
    const antwort = await rohAnfrage(basis, `${zeilen}Connection: close\r\n\r\n`);
    assert.match(antwort, /^HTTP\/1\.1 4\d\d/, JSON.stringify(zeilen));
  }
  assert.equal((await reservieren()).status, 200, "der Server nimmt weiter Reservierungen an");

  const { handler: resonanz } = await import("../src/resonanzServer.js");
  const { erzeugeHandlerV2 } = await import("../v2/integration/wirtServerV2.js");
  for (const h of [resonanz, await erzeugeHandlerV2({ slug: SLUG, v1TelegramErsetzen: false })]) {
    const s = createServer(h);
    await new Promise((f) => s.listen(0, "127.0.0.1", f));
    const url = `http://127.0.0.1:${s.address().port}`;
    assert.match(await rohAnfrage(url, "GET //[ HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n"), /^HTTP\/1\.1 4\d\d/);
    assert.match(await rohAnfrage(url, "GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n"), /^HTTP\/1\.1 \d{3}/, "läuft weiter");
    await new Promise((f) => s.close(f));
  }
});

test("beschädigte Betriebsdatei wird nie still als leer behandelt oder überschrieben", async () => {
  assert.equal((await reservieren()).status, 200);
  const vollstaendig = readFileSync(DATEI, "utf-8");
  const halb = vollstaendig.slice(0, Math.floor(vollstaendig.length / 2)); // wie nach Absturz mitten im Schreiben
  writeFileSync(DATEI, halb);

  const gast = await reservieren({}, { uhrzeit: "12:00" });
  assert.notEqual(gast.status, 200);
  assert.match((await gast.json()).fehler, /telefonisch/);
  const wirt = await fetch(`${basis}/api/betrieb`);
  assert.equal(wirt.status, 503);
  assert.equal(readFileSync(DATEI, "utf-8"), halb, "nichts überschrieben – die Datei bleibt für die Wiederherstellung");

  writeFileSync(DATEI, vollstaendig);
  assert.equal(store.ladeBetrieb(SLUG).reservierungen.length, 1);
});

test("Betriebsdatei wird atomar und nur für den Besitzer lesbar geschrieben", () => {
  store.legeTischAn(SLUG, { name: "Tisch 2", plaetze: 4 });
  const ordner = path.dirname(DATEI);
  assert.deepEqual(readdirSync(ordner).filter((d) => d.startsWith(`${SLUG}.json.`)), [], "keine Zwischendatei bleibt liegen");
  if (process.platform !== "win32") assert.equal(statSync(DATEI).mode & 0o777, 0o600);
});
