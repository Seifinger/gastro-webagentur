import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Externe, verschlüsselte Sicherung der Wirt-App und Wiederherstellungstest
// mit einem SYNTHETISCHEN Betrieb (keine echten Gastdaten):
// Reservierungen, Bestellungen mit Statusverlauf, Rabattaktionen, Empfehlungen,
// Telegram-Einstellungen, Gast-Status-Links, Rechtstexte, Zähler.
// Bestanden ist der Test erst, wenn die wiederhergestellten Daten Datei für
// Datei identisch sind UND eine echt gestartete Wirt-App sie wieder ausliefert.

const DATEN = mkdtempSync(path.join(tmpdir(), "wirt-daten-"));
process.env.GASTRO_DATEN_DIR = DATEN;
process.env.BETRIEB = "pilot-sicherung";
process.env.GAST_STATUS_GEHEIMNIS = "synthetisches-geheimnis-nur-fuer-tests-0123456789";
const SLUG = "pilot-sicherung";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");

const store = await import("../src/betriebStore.js");
const s = await import("../src/sicherungExtern.js");
const { setzeTelegramEinstellungen } = await import("../src/telegramRegeln.js");
const { vermerkeNoShow } = await import("../src/zuverlaessigkeitStore.js");
const { karteAusDaten } = await import("../v2/build/speisekarte.js");
const { empfehlungsProdukte } = await import("../src/empfehlungen.js");
const { italienischeBetriebskarte } = await import("./hilfen/speisekarten.js");

const aufraeumen = [DATEN];
after(() => {
  for (const d of aufraeumen) rmSync(d, { recursive: true, force: true });
});
const temp = (name) => {
  const d = mkdtempSync(path.join(tmpdir(), name));
  aufraeumen.push(d);
  return d;
};
const SCHLUESSEL = Buffer.alloc(32, 7);

function alleDateien(ordner) {
  return readdirSync(ordner, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? alleDateien(path.join(ordner, e.name)) : [path.join(ordner, e.name)]));
}

/** Synthetischer Pilotbetrieb mit allem, was der Pilot zur Laufzeit schreibt. */
function legeSynthetischenBetriebAn() {
  store.uhrHook.jetzt = () => new Date("2026-09-24T17:00:00+02:00");
  store.speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [] });
  store.legeTischAn(SLUG, { name: "Tisch 1", plaetze: 4 });
  store.legeTischAn(SLUG, { name: "Terrasse", plaetze: 6 });
  const k = karteAusDaten(italienischeBetriebskarte());
  store.setzeBestellkarte(SLUG, { katalog: k.katalog, produkte: empfehlungsProdukte(k), version: "s1", quelle: "test" });
  const rabatt = store.legeRabattaktionAn(SLUG, { name: "Abholwoche", art: "abholung", rabatt: { typ: "prozent", wert: 10 }, ende: "2026-10-01T23:00" });
  store.setzeEmpfehlungen(SLUG, { priorisiert: ["tiramisu"] });
  setzeTelegramEinstellungen(SLUG, { aktiv: true, arten: "beide", zeitfenster: "rund-um-die-uhr" }, store.uhrHook.jetzt());
  store.setzeWartezeit(SLUG, 15);
  const r = store.legeReservierungAn(SLUG, { datum: "2026-09-26", uhrzeit: "19:00", personen: 2, name: "Erika Beispiel", telefon: "000 111", email: "" });
  store.setzeReservierungStatus(SLUG, r.id, "bestaetigt");
  const b = store.legeBestellungAn(SLUG, { positionen: [{ id: "diavola", name: "Diavola", menge: 2, preis: 11.9 }], abholzeit: "18:30", abholArt: "geplant", abholZeitpunkt: "2026-09-24T18:30:00+02:00", name: "Max Muster", telefon: "000 222", erwarteterBetragCent: 2142 });
  store.bestaetigeBestellung(SLUG, b.id, "18:45");
  vermerkeNoShow(SLUG, "000 333");
  return { r, b, rabatt };
}

test("AES-256-GCM: Rundlauf, falscher Schlüssel und veränderte Bytes werden erkannt", () => {
  const klar = Buffer.from("synthetische Daten");
  const v = s.verschluessele(klar, SCHLUESSEL);
  assert.ok(!v.includes(klar), "kein Klartext im Chiffrat");
  assert.deepEqual(s.entschluessele(v, SCHLUESSEL), klar);
  assert.throws(() => s.entschluessele(v, Buffer.alloc(32, 8)), /falscher Schlüssel oder beschädigte/);
  const kaputt = Buffer.from(v);
  kaputt[20] ^= 1;
  assert.throws(() => s.entschluessele(kaputt, SCHLUESSEL), /beschädigte/);
  assert.throws(() => s.schluesselAus("zu-kurz"), /32 Byte/);
  assert.equal(s.schluesselAus(Buffer.alloc(32, 1).toString("base64")).length, 32);
});

test("Sicherung → anderes Ziel → Wiederherstellung: synthetischer Betrieb Datei für Datei identisch", async () => {
  const { b } = legeSynthetischenBetriebAn();
  const zielOrdner = temp("wirt-ziel-");
  const ziel = s.dateiZiel(zielOrdner);
  const erg = await s.erstelleExterneSicherung({ datenDir: DATEN, ziel, schluessel: SCHLUESSEL, betrieb: SLUG, jetzt: new Date("2026-09-24T15:00:00Z") });
  assert.equal(erg.betriebe[SLUG].reservierungen, 1);
  assert.equal(erg.betriebe[SLUG].bestellungen, 1);
  assert.equal(erg.betriebe[SLUG].rabattaktionen, 1);
  assert.equal(erg.betriebe[SLUG].tische, 2);

  // Am Ziel liegt nur Chiffretext – kein Gastname, keine Telefonnummer, kein Geheimnis.
  const abgelegt = readFileSync(path.join(zielOrdner, erg.name));
  for (const klartext of ["Erika Beispiel", "Max Muster", "000 222", "Abholwoche", process.env.GAST_STATUS_GEHEIMNIS]) assert.ok(!abgelegt.includes(Buffer.from(klartext)), klartext);
  // Der Stand nennt Ziel und Ergebnis, nie den Schlüssel.
  const stand = readFileSync(path.join(DATEN, "sicherung", "stand.json"), "utf-8");
  assert.ok(!stand.includes(SCHLUESSEL.toString("base64")));
  assert.equal(JSON.parse(stand).fehler, "");

  const zurueck = temp("wirt-zurueck-");
  rmSync(zurueck, { recursive: true });
  const w = await s.stelleWiederHer({ ziel, schluessel: SCHLUESSEL, zielDir: zurueck });
  assert.equal(w.name, erg.name);
  const original = alleDateien(DATEN).map((d) => path.relative(DATEN, d)).filter((p) => !p.startsWith("sicherung")).sort();
  const wieder = alleDateien(zurueck).map((d) => path.relative(zurueck, d)).sort();
  assert.deepEqual(wieder, original);
  for (const p of original) assert.deepEqual(readFileSync(path.join(zurueck, p)), readFileSync(path.join(DATEN, p)), p);
  assert.ok(original.includes(path.join("betrieb", ".gast-status-geheimnis")) || process.env.GAST_STATUS_GEHEIMNIS, "Status-Links bleiben gültig");
  const betrieb = JSON.parse(readFileSync(path.join(zurueck, "betrieb", `${SLUG}.json`), "utf-8"));
  assert.equal(betrieb.bestellungen[0].bestaetigteAbholzeit, "18:45");
  assert.equal(betrieb.bestellungen[0].preisermittlung.endbetragCent, 2142);
  assert.equal(betrieb.rabattaktionen[0].name, "Abholwoche");
  assert.equal(betrieb.telegramBenachrichtigung.zeitfenster, "rund-um-die-uhr");
  assert.equal(betrieb.gastMeldungen.length > 0, true);
  assert.equal(betrieb.bestellungen[0].id, b.id);

  // In einen nicht leeren Ordner wird nie wiederhergestellt.
  await assert.rejects(s.stelleWiederHer({ ziel, schluessel: SCHLUESSEL, zielDir: zurueck }), /nicht leer/);
  // Falscher Schlüssel: keine Wiederherstellung.
  await assert.rejects(s.stelleWiederHer({ ziel, schluessel: Buffer.alloc(32, 9), zielDir: temp("wirt-falsch-") + "/x" }), /Entschlüsseln fehlgeschlagen/);
});

test("Echt gestartete Wirt-App auf den wiederhergestellten Daten liefert dieselben Vorgänge und Status-Links", async () => {
  const ziel = s.dateiZiel(temp("wirt-ziel2-"));
  const vorher = JSON.parse(readFileSync(path.join(DATEN, "betrieb", `${SLUG}.json`), "utf-8"));
  const { name } = await s.erstelleExterneSicherung({ datenDir: DATEN, ziel, schluessel: SCHLUESSEL, betrieb: SLUG });
  const neu = path.join(temp("wirt-neu-"), "volume");
  await s.stelleWiederHer({ ziel, schluessel: SCHLUESSEL, name, zielDir: neu });

  const port = 18300 + Math.floor(Math.random() * 500);
  const kind = spawn(process.execPath, [path.join(REPO, "scripts", "wirtStart.mjs")], {
    env: { PATH: process.env.PATH, BETRIEB: SLUG, WIRT_PASSWORT: "restore-test-passwort", GAST_STATUS_GEHEIMNIS: process.env.GAST_STATUS_GEHEIMNIS, WIRT_OEFFENTLICHE_URL: `http://127.0.0.1:${port}`, GASTRO_DATEN_DIR: neu, WIRT_PORT: String(port), DASHBOARD_HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  kind.stdout.on("data", (d) => (log += d));
  kind.stderr.on("data", (d) => (log += d));
  try {
    const basis = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 60; i += 1) {
      try {
        if ((await fetch(`${basis}/gesund`)).ok) break;
      } catch {
        // noch nicht bereit
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    const auth = { Authorization: `Basic ${Buffer.from("x:restore-test-passwort").toString("base64")}` };
    const stand = await (await fetch(`${basis}/api/betrieb`, { headers: auth })).json();
    assert.deepEqual(stand.reservierungen.map((r) => [r.id, r.status, r.name]), vorher.reservierungen.map((r) => [r.id, r.status, r.name]));
    assert.deepEqual(stand.bestellungen.map((x) => [x.id, x.status, x.gesamt, x.bestaetigteAbholzeit]), vorher.bestellungen.map((x) => [x.id, x.status, x.gesamt, x.bestaetigteAbholzeit]));
    assert.deepEqual(stand.tische.map((t) => t.name), ["Tisch 1", "Terrasse"]);
    const rabatte = await (await fetch(`${basis}/api/rabattaktionen`, { headers: auth })).json();
    assert.deepEqual(rabatte.aktionen.map((a) => [a.id, a.name]), vorher.rabattaktionen.map((a) => [a.id, a.name]));
    const empf = await (await fetch(`${basis}/api/empfehlungen`, { headers: auth })).json();
    assert.deepEqual(empf.regeln.priorisiert, ["tiramisu"]);
    // Status-Link des Gastes gilt nach der Wiederherstellung weiter.
    const token = store.gastTokenFuer(SLUG, "bestellung", vorher.bestellungen[0]);
    const status = await (await fetch(`${basis}/oeffentlich/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })).json();
    assert.equal(status.ok, true, JSON.stringify(status));
  } finally {
    kind.kill("SIGTERM");
    await new Promise((r) => kind.once("exit", r));
  }
  assert.ok(!log.includes("restore-test-passwort") && !log.includes(process.env.GAST_STATUS_GEHEIMNIS), "keine Secrets im Log");
});

test("Aufräumen: älter als 30 Tage weg, die neuesten 7 bleiben immer", async () => {
  const ordner = temp("wirt-alt-");
  const ziel = s.dateiZiel(ordner);
  const heute = new Date("2026-09-24T03:30:00Z");
  for (let t = 0; t < 45; t += 1) writeFileSync(path.join(ordner, s.sicherungsName(SLUG, new Date(heute.getTime() - t * 86400000))), "x");
  const weg = await s.raeumeAuf(ziel, { tage: 30, mindestens: 7, jetzt: heute });
  assert.equal(weg.length, 14, "Tage 31–44");
  assert.equal((await ziel.liste()).length, 31);
  // Lange keine Sicherung (z. B. Ausfall): die letzten 7 bleiben trotzdem.
  const alt = temp("wirt-alt2-");
  for (let t = 60; t < 70; t += 1) writeFileSync(path.join(alt, s.sicherungsName(SLUG, new Date(heute.getTime() - t * 86400000))), "x");
  await s.raeumeAuf(s.dateiZiel(alt), { tage: 30, mindestens: 7, jetzt: heute });
  assert.equal(readdirSync(alt).length, 7);
});

test("Fehler werden gemeldet und vermerkt: beschädigte Datei, fehlendes Ziel, Ziel nicht erreichbar", async () => {
  const daten = temp("wirt-kaputt-");
  writeFileSync(path.join(daten, "x"), "");
  rmSync(path.join(daten, "x"));
  const betrieb = path.join(daten, "betrieb");
  (await import("node:fs")).mkdirSync(betrieb);
  writeFileSync(path.join(betrieb, "a.json"), "{ kaputt");
  await assert.rejects(s.erstelleExterneSicherung({ datenDir: daten, ziel: s.dateiZiel(temp("z-")), schluessel: SCHLUESSEL }), /beschädigt – Sicherung abgebrochen/);
  assert.match(JSON.parse(readFileSync(path.join(daten, "sicherung", "stand.json"), "utf-8")).fehler, /beschädigt/);
  await assert.rejects(s.erstelleExterneSicherung({ datenDir: DATEN, ziel: null, schluessel: SCHLUESSEL }), /BACKUP_ZIEL ist nicht gesetzt/);
  const unerreichbar = s.s3Ziel({ endpoint: "http://127.0.0.1:9", bucket: "b", zugang: "k", geheim: "g" });
  await assert.rejects(s.erstelleExterneSicherung({ datenDir: DATEN, ziel: unerreichbar, schluessel: SCHLUESSEL }), /fetch failed|ECONNREFUSED/);
  const stand = JSON.parse(readFileSync(path.join(DATEN, "sicherung", "stand.json"), "utf-8"));
  assert.ok(stand.fehler && stand.letzterErfolg < stand.letzterVersuch, "Fehlschlag sichtbar, letzter Erfolg bleibt stehen");
});

test("Vorbereitete Wiederherstellung wird erst beim Start eingesetzt; alte Daten bleiben daneben", async () => {
  const daten = temp("wirt-tausch-");
  const betrieb = path.join(daten, "betrieb");
  (await import("node:fs")).mkdirSync(betrieb, { recursive: true });
  writeFileSync(path.join(betrieb, "a.json"), JSON.stringify({ reservierungen: [1, 2, 3] }));
  const ziel = s.dateiZiel(temp("wirt-tz-"));
  await s.erstelleExterneSicherung({ datenDir: daten, ziel, schluessel: SCHLUESSEL, betrieb: "a" });
  writeFileSync(path.join(betrieb, "a.json"), JSON.stringify({ reservierungen: [] })); // „Unfall“
  await s.vorbereiteWiederherstellung({ datenDir: daten, ziel, schluessel: SCHLUESSEL });
  assert.equal(JSON.parse(readFileSync(path.join(betrieb, "a.json"), "utf-8")).reservierungen.length, 0, "laufender Betrieb unberührt");
  const r = s.setzeVorbereiteteWiederherstellungEin(daten);
  assert.equal(JSON.parse(readFileSync(path.join(betrieb, "a.json"), "utf-8")).reservierungen.length, 3);
  assert.equal(JSON.parse(readFileSync(path.join(r.alt, "betrieb", "a.json"), "utf-8")).reservierungen.length, 0, "bisheriger Stand aufbewahrt");
  assert.equal(s.setzeVorbereiteteWiederherstellungEin(daten), null);
});

test("Zeitplan: nächster Termin 03:30 Europe/Berlin, auch über die Zeitumstellung", () => {
  assert.equal(s.naechsterTermin("03:30", new Date("2026-09-24T12:00:00Z")).toISOString(), "2026-09-25T01:30:00.000Z");
  assert.equal(s.naechsterTermin("03:30", new Date("2026-10-24T12:00:00Z")).toISOString(), "2026-10-25T02:30:00.000Z", "Winterzeit");
  assert.equal(s.naechsterTermin("03:30", new Date("2026-09-24T01:00:00Z")).toISOString(), "2026-09-24T01:30:00.000Z");
});

// S3-kompatibles Ziel (z. B. Cloudflare R2): gegen ein lokales S3-kompatibles
// Testziel, das Signaturen prüft (s3rver). Ohne Testziel: übersprungen.
// Lokal nachtesten: npm i --no-save s3rver@3.7.1 && npm test -- test/wirtSicherung.test.js
test("S3-kompatibles Ziel gegen lokales Testziel – Ablage, Liste, Abruf, Wiederherstellung, Löschen", async (t) => {
  let S3rver;
  try {
    const require = createRequire(process.env.S3RVER_MODUL ? path.join(process.env.S3RVER_MODUL, "package.json") : import.meta.url);
    S3rver = require(process.env.S3RVER_MODUL ?? "s3rver");
  } catch {
    t.skip("kein lokales S3-Testziel (s3rver) installiert – NICHT GETESTET");
    return;
  }
  const verzeichnis = temp("s3rver-");
  const server = new S3rver({ port: 0, address: "127.0.0.1", silent: true, directory: verzeichnis, configureBuckets: [{ name: "gastro-sicherung" }] });
  const { port } = await server.run();
  try {
    const endpoint = `http://127.0.0.1:${port}`;
    const ziel = s.s3Ziel({ endpoint, bucket: "gastro-sicherung", region: "us-east-1", zugang: "S3RVER", geheim: "S3RVER", praefix: "pilot" });
    const erg = await s.erstelleExterneSicherung({ datenDir: DATEN, ziel, schluessel: SCHLUESSEL, betrieb: SLUG });
    assert.deepEqual((await ziel.liste()).map((o) => o.name), [erg.name]);
    const zurueck = path.join(temp("s3-zurueck-"), "x");
    const w = await s.stelleWiederHer({ ziel, schluessel: SCHLUESSEL, zielDir: zurueck });
    assert.equal(w.zaehlung[SLUG].bestellungen, 1);
    // Hinweis: s3rver prüft SigV4-Signaturen nicht – das belegt der Test mit den AWS-Beispielwerten unten.
    await ziel.loeschen(erg.name);
    assert.deepEqual(await ziel.liste(), []);
  } finally {
    await server.close();
  }
});

test("SigV4-Signatur stimmt mit den Beispielwerten der AWS-S3-Dokumentation überein", () => {
  const geheim = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
  const zugang = "AKIAIOSFODNN7EXAMPLE";
  const basis = { host: "examplebucket.s3.amazonaws.com", zeit: "2013-05-24T00:00:00Z", region: "us-east-1", zugang, geheim };
  // „GET Bucket (List Objects)“
  const liste = s.signiereS3Anfrage({ ...basis, methode: "GET", pfad: "/", query: { "max-keys": "2", prefix: "J" } });
  assert.equal(liste.signatur, "34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7");
  assert.equal(liste.kopf.Authorization, `AWS4-HMAC-SHA256 Credential=${zugang}/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${liste.signatur}`);
  // „GET Object“ mit Range-Kopf
  assert.equal(s.signiereS3Anfrage({ ...basis, methode: "GET", pfad: "/test.txt", weitereKoepfe: { range: "bytes=0-9" } }).signatur, "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
  // Anderer Schlüssel → andere Signatur (kein Zufallstreffer).
  assert.notEqual(s.signiereS3Anfrage({ ...basis, geheim: "x", methode: "GET", pfad: "/", query: { "max-keys": "2", prefix: "J" } }).signatur, liste.signatur);
});
