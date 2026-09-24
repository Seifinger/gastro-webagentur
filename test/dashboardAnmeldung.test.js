import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { richteTestLeadsEin } from "./hilfen/testLead.js";
import { erzeugePasswortHash, pruefePasswort, _zuruecksetzenFuerTests } from "../src/dashboardAnmeldung.js";
import { loadLeadEdits } from "../src/leadEdits.js";

// Online-Betrieb: Mit DASHBOARD_PASSWORT_HASH sieht und ändert niemand ohne
// Anmeldung etwas – weder Leads noch Demo-Einstellungen noch Seiten.

const PASSWORT = "sehr-geheimes-passwort-42";
const LEAD = { slug: "testdemo-anmeldung-0x1", placeId: "ChIJtestAnmeldung", name: "Gasthof Geschützt", ort: "Altötting" };
let umgebung;
let server;
let basis;

before(async () => {
  umgebung = richteTestLeadsEin([LEAD], "__test-anmeldung");
  process.env.DASHBOARD_PASSWORT_HASH = erzeugePasswortHash(PASSWORT);
  const { handler } = await import("../src/dashboardServer.js");
  server = createServer(handler);
  await new Promise((f) => server.listen(0, "127.0.0.1", f));
  basis = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  delete process.env.DASHBOARD_PASSWORT_HASH;
  await new Promise((f) => server.close(f));
  umgebung.aufraeumen();
});
beforeEach(() => _zuruecksetzenFuerTests());

async function anmelden(passwort = PASSWORT, herkunft = basis) {
  return fetch(`${basis}/anmelden`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: herkunft },
    body: new URLSearchParams({ passwort }).toString(),
  });
}

test("Passwort-Hash: scrypt mit Salz, prüfbar, kurze Passwörter abgelehnt", () => {
  const h = erzeugePasswortHash(PASSWORT);
  assert.match(h, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(h, erzeugePasswortHash(PASSWORT), "jedes Mal anderes Salz");
  assert.equal(pruefePasswort(PASSWORT, h), true);
  assert.equal(pruefePasswort("falsch", h), false);
  assert.equal(pruefePasswort(PASSWORT, "kaputt"), false);
  assert.throws(() => erzeugePasswortHash("kurz"), /12 Zeichen/);
});

test("ohne Anmeldung: keine Leads, keine Demo-Daten, keine Seiten, keine Vorschauen", async () => {
  for (const pfad of ["/api/leads", `/api/v2/demo/${LEAD.slug}`, "/api/v2/status", `/v2/leads/${LEAD.slug}/`, "/api/qr?url=x"]) {
    const r = await fetch(basis + pfad);
    assert.equal(r.status, 401, pfad);
    assert.doesNotMatch(await r.text(), /Gasthof Geschützt/);
  }
  const seite = await fetch(`${basis}/`, { redirect: "manual", headers: { Accept: "text/html" } });
  assert.equal(seite.status, 303);
  assert.equal(seite.headers.get("location"), "/anmelden");
  assert.equal((await fetch(`${basis}/gesund`)).status, 200, "Gesundheitsprüfung für den Host");
});

test("ohne Anmeldung: Einstellungen lassen sich nicht ändern – auch nicht mit dem alten Token", async () => {
  process.env.DASHBOARD_TOKEN = "alter-token";
  try {
    const r = await fetch(`${basis}/intern/v2/demo/${LEAD.slug}/speichern`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Dashboard-Token": "alter-token", Origin: basis },
      body: JSON.stringify({ slogan: "Gehackt" }),
    });
    assert.equal(r.status, 401);
  } finally {
    delete process.env.DASHBOARD_TOKEN;
  }
  assert.equal(loadLeadEdits(LEAD.slug).texte?.slogan, undefined);
});

test("falsches Passwort: 401; nach 10 Fehlversuchen gesperrt; Anmeldung von fremder Seite: 403", async () => {
  assert.equal((await anmelden("falsch")).status, 401);
  for (let i = 0; i < 9; i += 1) await anmelden("falsch");
  assert.equal((await anmelden(PASSWORT)).status, 429, "auch das richtige Passwort wird während der Sperre abgewiesen");
  _zuruecksetzenFuerTests();
  assert.equal((await anmelden(PASSWORT, "https://boese.example")).status, 403);
});

test("mit Anmeldung: Sitzungs-Cookie HttpOnly/SameSite=Strict, Lesen und Speichern funktionieren, fremde Herkunft wird abgewiesen", async () => {
  const antwort = await anmelden();
  assert.equal(antwort.status, 303);
  const cookie = antwort.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  const sitzung = cookie.split(";")[0];

  const leads = await fetch(`${basis}/api/leads`, { headers: { Cookie: sitzung } });
  assert.equal(leads.status, 200);
  assert.match(await leads.text(), /Gasthof Geschützt/);

  const gespeichert = await fetch(`${basis}/intern/v2/demo/${LEAD.slug}/speichern`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sitzung, Origin: basis },
    body: JSON.stringify({ slogan: "Angemeldet gespeichert" }),
  });
  assert.equal(gespeichert.status, 200);
  assert.equal(loadLeadEdits(LEAD.slug).texte.slogan, "Angemeldet gespeichert");

  const fremd = await fetch(`${basis}/intern/v2/demo/${LEAD.slug}/speichern`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sitzung, Origin: "https://boese.example" },
    body: JSON.stringify({ slogan: "CSRF" }),
  });
  assert.equal(fremd.status, 403);
  assert.equal(loadLeadEdits(LEAD.slug).texte.slogan, "Angemeldet gespeichert");

  const seite = await (await fetch(`${basis}/`, { headers: { Cookie: sitzung } })).text();
  assert.match(seite, /action="\/abmelden"/);
  assert.match(seite, /dashboardToken/, "kein Token-Dialog im angemeldeten Betrieb");

  const ab = await fetch(`${basis}/abmelden`, { method: "POST", redirect: "manual", headers: { Cookie: sitzung, Origin: basis } });
  assert.equal(ab.status, 303);
  assert.equal((await fetch(`${basis}/api/leads`, { headers: { Cookie: sitzung } })).status, 401, "nach dem Abmelden ist die Sitzung ungültig");
});
