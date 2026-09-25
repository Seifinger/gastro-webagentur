import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  smsHook,
  emailHook,
  fetchHook,
  emailEinrichtung,
  gastEmailEinrichtung,
  versendeUeberResend,
  stelleGastMeldungenZu,
  versucheGastMeldungErneut,
  versendeRechnung,
} from "../src/kundenBenachrichtigung.js";
import {
  speichereBetrieb,
  ladeBetrieb,
  legeTischAn,
  legeBestellungAn,
  setzeBestellungStatus,
  bestaetigeBestellung,
  uhrHook,
} from "../src/betriebStore.js";

// Zustellung der Gastmeldungen direkt am Modul, ohne HTTP. Die Hooks und
// Umgebungsvariablen sind Modul-Singletons bzw. global – jeder Testfall setzt
// sie selbst und stellt den Ausgangszustand danach wieder her.

const SLUG = "__test-kunden-benachrichtigung";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);

const JETZT = new Date("2026-09-24T17:00:00+02:00");
const altUhr = uhrHook.jetzt;
uhrHook.jetzt = () => new Date(JETZT);

const ENV = ["RESEND_API_KEY", "GAST_EMAIL_ABSENDER", "WIRT_OEFFENTLICHE_URL", "GAST_EMAIL_ANTWORT_AN"];
const altEnv = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));

beforeEach(() => {
  for (const k of ENV) delete process.env[k];
  smsHook.aktuell = null;
  emailHook.aktuell = null;
  fetchHook.aktuell = () => {
    throw new Error("Im Test darf kein echter Netzwerkaufruf passieren.");
  };
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], anzeigeName: "Trattoria Test", telefon: "030 1234567" });
  legeTischAn(SLUG, { name: "T1", plaetze: 4 });
});

after(() => {
  rmSync(DATEI, { force: true });
  uhrHook.jetzt = altUhr;
  for (const k of ENV) {
    if (altEnv[k] === undefined) delete process.env[k];
    else process.env[k] = altEnv[k];
  }
  smsHook.aktuell = null;
  emailHook.aktuell = null;
});

function bestellung(zusatz = {}) {
  return legeBestellungAn(SLUG, {
    positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }],
    abholzeit: "18:30",
    name: "Erika Gast",
    telefon: "0170 1234567",
    email: "erika@beispiel.de",
    ...zusatz,
  });
}

const meldungen = () => ladeBetrieb(SLUG).gastMeldungen;

test("Einrichtung: ohne Hook und ohne Resend-Umgebung ist E-Mail ehrlich „nicht eingerichtet“", () => {
  assert.deepEqual(emailEinrichtung(), { eingerichtet: false, grund: "E-Mail nicht eingerichtet: RESEND_API_KEY fehlt." });
  process.env.RESEND_API_KEY = "re_test";
  assert.match(emailEinrichtung().grund, /GAST_EMAIL_ABSENDER/);
  process.env.GAST_EMAIL_ABSENDER = "Trattoria <bestellung@beispiel.de>";
  assert.deepEqual(emailEinrichtung(), { eingerichtet: true, anbieter: "resend" });
  // Für Gastmails braucht es zusätzlich die öffentliche Adresse (Link).
  assert.match(gastEmailEinrichtung().grund, /WIRT_OEFFENTLICHE_URL/);
  process.env.WIRT_OEFFENTLICHE_URL = "https://wirt.beispiel.de/";
  assert.equal(gastEmailEinrichtung().eingerichtet, true);
});

test("Resend: Schlüssel nur im Header, Idempotenzschlüssel gesetzt, Erfolg nur mit ID", async () => {
  process.env.RESEND_API_KEY = "re_geheim";
  process.env.GAST_EMAIL_ABSENDER = "Trattoria <bestellung@beispiel.de>";
  const aufrufe = [];
  fetchHook.aktuell = async (url, init) => {
    aufrufe.push({ url, init });
    return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
  };
  const ergebnis = await versendeUeberResend("gast@beispiel.de", "Betreff", "Text", [], { idempotenzSchluessel: "gast-abc" });
  assert.deepEqual(ergebnis, { id: "email_123" });
  assert.equal(aufrufe[0].url, "https://api.resend.com/emails");
  assert.equal(aufrufe[0].init.headers.Authorization, "Bearer re_geheim");
  assert.equal(aufrufe[0].init.headers["Idempotency-Key"], "gast-abc");
  const koerper = JSON.parse(aufrufe[0].init.body);
  assert.deepEqual(koerper.to, ["gast@beispiel.de"]);
  assert.equal(koerper.from, "Trattoria <bestellung@beispiel.de>");
  assert.ok(!aufrufe[0].init.body.includes("re_geheim"), "Schlüssel nie im Körper");
});

test("Resend: HTTP-Fehler, fehlende ID und Netzwerkfehler gelten nie als Erfolg", async () => {
  process.env.RESEND_API_KEY = "re_geheim";
  process.env.GAST_EMAIL_ABSENDER = "bestellung@beispiel.de";
  fetchHook.aktuell = async () => new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 });
  await assert.rejects(versendeUeberResend("g@beispiel.de", "B", "T"), /HTTP 403: domain not verified/);
  fetchHook.aktuell = async () => new Response("{}", { status: 200 });
  await assert.rejects(versendeUeberResend("g@beispiel.de", "B", "T"), /Fehler/);
  fetchHook.aktuell = async () => {
    throw new TypeError("fetch failed");
  };
  await assert.rejects(versendeUeberResend("g@beispiel.de", "B", "T"), /nicht erreichbar/);
});

test("Zustellung über Resend: Meldung steht danach auf „übergeben“ mit Anbieter-ID", async () => {
  process.env.RESEND_API_KEY = "re_geheim";
  process.env.GAST_EMAIL_ABSENDER = "bestellung@beispiel.de";
  process.env.WIRT_OEFFENTLICHE_URL = "https://wirt.beispiel.de";
  const koerper = [];
  fetchHook.aktuell = async (url, init) => {
    koerper.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: `email_${koerper.length}` }), { status: 200 });
  };
  bestellung();
  await stelleGastMeldungenZu(SLUG);
  const [m] = meldungen();
  assert.equal(m.typ, "eingegangen");
  assert.equal(m.versand.zustand, "uebergeben");
  assert.equal(m.versand.anbieterId, "email_1");
  assert.match(koerper[0].subject, /Bestellung eingegangen – noch nicht bestätigt · AB-\d{4} · Trattoria Test/);
  assert.match(koerper[0].text, /https:\/\/wirt\.beispiel\.de\/status#[A-Za-z0-9_-]{43}/);
  // Nur nötige Angaben: kein Name, keine Telefonnummer des Gastes.
  assert.ok(!koerper[0].text.includes("Erika"), "kein Gastname in der Mail");
  assert.ok(!koerper[0].text.includes("0170"), "keine Gast-Telefonnummer in der Mail");
});

test("Bestätigen und sofort „bereit“ in einem Zug: nur die neueste Meldung wird verschickt", async () => {
  process.env.WIRT_OEFFENTLICHE_URL = "https://wirt.beispiel.de";
  const mails = [];
  emailHook.aktuell = async (an, betreff) => {
    mails.push(betreff);
    return { id: "x" };
  };
  const b = bestellung();
  await stelleGastMeldungenZu(SLUG);
  bestaetigeBestellung(SLUG, b.id, "18:30");
  setzeBestellungStatus(SLUG, b.id, "abgelehnt");
  await stelleGastMeldungenZu(SLUG);
  assert.deepEqual(meldungen().map((m) => [m.typ, m.versand.zustand]), [
    ["eingegangen", "uebergeben"],
    ["bestaetigt", "ueberholt"],
    ["abgelehnt", "uebergeben"],
  ]);
  assert.equal(mails.length, 2);
  assert.match(mails[1], /abgelehnt/);
});

test("Fehlschlag bleibt sichtbar; erneuter Versuch schickt genau einmal, danach nie wieder", async () => {
  process.env.WIRT_OEFFENTLICHE_URL = "https://wirt.beispiel.de";
  let aufrufe = 0;
  emailHook.aktuell = async () => {
    aufrufe += 1;
    throw new Error("Anbieter nicht erreichbar");
  };
  bestellung();
  await stelleGastMeldungenZu(SLUG);
  let [m] = meldungen();
  assert.equal(m.versand.zustand, "fehlgeschlagen");
  assert.match(m.versand.fehler, /nicht erreichbar/);

  emailHook.aktuell = async () => {
    aufrufe += 1;
    return { id: "ok" };
  };
  m = await versucheGastMeldungErneut(SLUG, m.id);
  assert.equal(m.versand.zustand, "uebergeben");
  assert.equal(m.versand.versuche, 2);
  await assert.rejects(versucheGastMeldungErneut(SLUG, m.id), /bereits übergeben/);
  assert.equal(aufrufe, 2);
});

test("SMS nur, wenn ein Anbieter eingetragen ist und keine E-Mail vorliegt", async () => {
  const sms = [];
  smsHook.aktuell = async (telefon, text) => sms.push({ telefon, text });
  bestellung({ email: "" });
  await stelleGastMeldungenZu(SLUG);
  const [m] = meldungen();
  assert.equal(m.versand.kanal, "sms");
  assert.equal(m.versand.zustand, "uebergeben");
  assert.equal(sms[0].telefon, "0170 1234567");
  assert.match(sms[0].text, /noch nicht bestätigt/);
});

test("No-Show-Rechnung: ohne eingerichteten Versand wird nichts behauptet", async () => {
  assert.deepEqual(await versendeRechnung({ email: "g@beispiel.de", betreff: "R", text: "T", anhaenge: [] }), { versendet: false });
  const aufrufe = [];
  emailHook.aktuell = async (...args) => aufrufe.push(args);
  assert.deepEqual(await versendeRechnung({ email: "g@beispiel.de", betreff: "R", text: "T", anhaenge: [] }), { versendet: true });
  assert.equal(aufrufe.length, 1);
});
