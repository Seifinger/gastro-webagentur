import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Gastbenachrichtigung über die echten HTTP-Wege: Gast sendet über
// /oeffentlich/, der Wirt handelt im v1-Dashboard (/api/, /intern/), in der
// v2-Hülle (Küchenstatus) oder per Telegram-Knopf. Geprüft wird, was der Gast
// sieht (Statusseite), was an E-Mails rausgeht (Mock) und was der Wirt
// angezeigt bekommt (Anruf-Hinweis).

const SLUG = "__test-gastbenachrichtigung";
process.env.BETRIEB = SLUG;
delete process.env.TELEGRAM_BOT_TOKEN;

const { handler, setzeBremsenZurueck } = await import("../src/wirtServer.js");
const { erzeugeHandlerV2 } = await import("../v2/integration/wirtServerV2.js");
const { verarbeiteUpdate, telegramApiHook, bestellungsText } = await import("../v2/integration/telegramBot.js");
const store = await import("../src/betriebStore.js");
const { emailHook, smsHook, fetchHook } = await import("../src/kundenBenachrichtigung.js");
const { gastToken } = await import("../src/gastStatus.js");
const { baueSite } = await import("../v2/build/siteBuilder.js");
const { buildLandingPage } = await import("../src/landingPageGenerator.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);

// Donnerstag, 24.09.2026, 17:00 Berlin – 18:30 ist eine angebotene Abholzeit.
const JETZT = new Date("2026-09-24T17:00:00+02:00");
const altUhr = store.uhrHook.jetzt;
store.uhrHook.jetzt = () => new Date(JETZT);

const ENV = ["RESEND_API_KEY", "GAST_EMAIL_ABSENDER", "WIRT_OEFFENTLICHE_URL", "WIRT_PASSWORT"];
const altEnv = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));

const WIRT_PW = "passwort-fuer-den-test";
const WIRT_ANMELDUNG = { Authorization: `Basic ${Buffer.from(`wirt:${WIRT_PW}`).toString("base64")}` };

let mails = [];
function mailMock() {
  emailHook.aktuell = async (an, betreff, text, anhaenge, optionen) => {
    mails.push({ an, betreff, text, schluessel: optionen?.idempotenzSchluessel });
    return { id: `mock-${mails.length}` };
  };
}

beforeEach(() => {
  for (const k of ENV) delete process.env[k];
  process.env.WIRT_OEFFENTLICHE_URL = "https://wirt.beispiel.de";
  // Mit öffentlicher Adresse gibt es das Dashboard nur mit Passwort.
  process.env.WIRT_PASSWORT = WIRT_PW;
  mails = [];
  mailMock();
  smsHook.aktuell = null;
  fetchHook.aktuell = () => {
    throw new Error("kein echter Netzwerkaufruf im Test");
  };
  telegramApiHook.aktuell = async () => ({});
  setzeBremsenZurueck();
  store.speichereBetrieb(SLUG, {
    tische: [],
    reservierungen: [],
    bestellungen: [],
    anzeigeName: "Trattoria Testa",
    telefon: "030 1234567",
    telegramChatId: "4711",
  });
  store.legeTischAn(SLUG, { name: "Tisch 1", plaetze: 4 });
  store.legeTischAn(SLUG, { name: "Tisch 2", plaetze: 6 });
});

after(() => {
  rmSync(DATEI, { force: true });
  store.uhrHook.jetzt = altUhr;
  emailHook.aktuell = null;
  for (const k of ENV) {
    if (altEnv[k] === undefined) delete process.env[k];
    else process.env[k] = altEnv[k];
  }
});

async function mitServer(h, fn) {
  const server = createServer(h);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

async function post(basis, pfad, daten = {}) {
  const antwort = await fetch(`${basis}${pfad}`, { method: "POST", headers: { "Content-Type": "application/json", ...WIRT_ANMELDUNG }, body: JSON.stringify(daten) });
  return { status: antwort.status, kopf: antwort.headers, ...(await antwort.json()) };
}

const reservieren = (basis, zusatz = {}) =>
  post(basis, "/oeffentlich/reservierung", { datum: "2026-09-26", uhrzeit: "19:00", personen: 2, name: "Erika Gast", telefon: "0170 1111111", email: "erika@beispiel.de", ...zusatz });

const bestellen = (basis, zusatz = {}) =>
  post(basis, "/oeffentlich/bestellung", { positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }], abholzeit: "18:30", name: "Max Gast", telefon: "0170 2222222", email: "max@beispiel.de", ...zusatz });

const statusVon = (basis, token) => post(basis, "/oeffentlich/status", { token });
const betrieb = async (basis) => (await fetch(`${basis}/api/betrieb`, { headers: WIRT_ANMELDUNG })).json();
const knopf = (data) => verarbeiteUpdate({ callback_query: { id: "k", data, message: { chat: { id: 4711 }, message_id: 1 } } }, { betriebe: [SLUG] });
const meldungenVon = (id) => store.ladeBetrieb(SLUG).gastMeldungen.filter((m) => m.bezugId === id);

test("1. Anfrage eingegangen ≠ bestätigt – Antwort, Statusseite und E-Mail sagen „noch nicht bestätigt“", async () => {
  await mitServer(handler, async (basis) => {
    const { reservierung: r } = await reservieren(basis);
    assert.match(r.nummer, /^RES-\d{4}$/);
    assert.equal(r.status, "eingegangen");
    assert.equal(r.statusText, "Anfrage eingegangen – noch nicht bestätigt");
    assert.match(r.statusToken, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(r.rueckfrageTelefon, "030 1234567");

    const { status: s } = await statusVon(basis, r.statusToken);
    assert.equal(s.phase, "eingegangen");
    assert.equal(s.zeitBestaetigt, false);
    assert.equal(s.referenz, r.nummer);
    assert.match(s.erklaerung, /erst reserviert, wenn das Restaurant bestätigt/);
    assert.doesNotMatch(s.titel, /Ihr Tisch ist bestätigt/);

    assert.equal(mails.length, 1);
    assert.match(mails[0].betreff, /^Anfrage eingegangen – noch nicht bestätigt · RES-\d{4} · Trattoria Testa$/);
    assert.doesNotMatch(mails[0].text, /Ihr Tisch ist bestätigt/);
    assert.match(mails[0].text, /Referenz: RES-\d{4}/);
    assert.match(mails[0].text, /Samstag, 26\.09\.2026, 19:00 Uhr/);
    assert.ok(mails[0].text.includes(`https://wirt.beispiel.de/status#${r.statusToken}`));
  });
});

test("2. + 8. Wirt bestätigt → genau eine Bestätigungsmail, auch bei doppeltem und gleichzeitigem Klick", async () => {
  await mitServer(handler, async (basis) => {
    const { reservierung: r } = await reservieren(basis);
    await Promise.all([
      post(basis, "/api/reservierung/status", { id: r.id, status: "bestaetigt" }),
      post(basis, "/api/reservierung/status", { id: r.id, status: "bestaetigt" }),
    ]);
    await post(basis, "/api/reservierung/status", { id: r.id, status: "bestaetigt" });

    const bestaetigt = mails.filter((m) => /Reservierung bestätigt/.test(m.betreff));
    assert.equal(bestaetigt.length, 1);
    assert.equal(mails.length, 2, "eingegangen + bestätigt, sonst nichts");
    assert.deepEqual(meldungenVon(r.id).map((m) => m.typ), ["eingegangen", "bestaetigt"]);
    assert.equal(new Set(mails.map((m) => m.schluessel)).size, 2, "je Meldung ein eigener Idempotenzschlüssel");

    const { status: s } = await statusVon(basis, r.statusToken);
    assert.equal(s.phase, "bestaetigt");
    assert.equal(s.titel, "Ihr Tisch ist bestätigt");
  });
});

test("3. Wirt lehnt ab → Statusseite und E-Mail zeigen die Ablehnung", async () => {
  await mitServer(handler, async (basis) => {
    const { bestellung: b } = await bestellen(basis);
    const antwort = await post(basis, "/api/bestellung/status", { id: b.id, status: "abgelehnt" });
    assert.equal(antwort.gast.letzteMeldung.zustand, "uebergeben");
    assert.equal(antwort.gast.anrufNoetig, false);

    const { status: s } = await statusVon(basis, b.statusToken);
    assert.equal(s.phase, "abgelehnt");
    assert.equal(s.titel, "Bestellung abgelehnt");
    assert.equal(mails.length, 2);
    assert.match(mails[1].betreff, /^Bestellung abgelehnt · AB-\d{4} · Trattoria Testa$/);
    assert.match(mails[1].text, /Status: Bestellung abgelehnt/);
  });
});

test("4. Abholzeit verschoben (Verzögerung) → neue Zeit in Statusseite, E-Mail, Dashboard und Telegram gleich", async () => {
  await mitServer(handler, async (basis) => {
    const { bestellung: b } = await bestellen(basis);
    await post(basis, "/api/bestellung/bestaetigen", { id: b.id, abholzeit: "18:30" });
    const v = await post(basis, `/intern/bestellung/${b.id}/verzoegerung`, { neueZeit: "19:15", grund: "Küche im Rückstand" });
    assert.equal(v.kanal, "email");

    const { status: s } = await statusVon(basis, b.statusToken);
    assert.equal(s.uhrzeit, "19:15");
    assert.equal(s.zeitGeaendert, true);
    assert.equal(s.zeitBestaetigt, true);
    assert.equal(s.wunsch.uhrzeit, "18:30");
    assert.equal(s.grund, "Küche im Rückstand");

    const verschoben = mails.filter((m) => /Neue Abholzeit/.test(m.betreff));
    assert.equal(verschoben.length, 1, "genau eine Mail zur Verschiebung");
    assert.match(verschoben[0].text, /Neue Abholzeit: 19:15 Uhr \(bisher 18:30 Uhr\)\. Grund: Küche im Rückstand/);
    assert.match(verschoben[0].text, /Bestätigte Abholzeit: Donnerstag, 24\.09\.2026, 19:15 Uhr/);

    const stand = await betrieb(basis);
    const imDashboard = stand.bestellungen.find((x) => x.id === b.id);
    assert.equal(imDashboard.bestaetigteAbholzeit, "19:15");
    assert.equal(imDashboard.gast.letzteMeldung.typ, "zeit-geaendert");
    assert.match(bestellungsText(store.ladeBetrieb(SLUG).bestellungen[0]), /Abholung 19:15/);
  });
});

test("4b. Reservierung verschieben ist ein eigener, nachvollziehbarer Vorgang", async () => {
  await mitServer(handler, async (basis) => {
    const { reservierung: r } = await reservieren(basis);
    const v = await post(basis, "/api/reservierung/verschieben", { id: r.id, datum: "2026-09-26", uhrzeit: "20:00", grund: "Tisch um 19 Uhr belegt" });
    assert.equal(v.ok, true);
    assert.equal(v.reservierung.urspruenglich.uhrzeit, "19:00");
    const { status: s } = await statusVon(basis, r.statusToken);
    assert.equal(s.phase, "bestaetigt");
    assert.equal(s.uhrzeit, "20:00");
    assert.equal(s.zeitGeaendert, true);
    assert.equal(mails.length, 2);
    assert.match(mails[1].text, /mit geändertem Termin: Samstag, 26\.09\.2026, 20:00 Uhr \(angefragt war Samstag, 26\.09\.2026, 19:00 Uhr\)/);
  });
});

test("5. Bestellung bereit (v2-Küchenstatus) → richtige Statusmeldung", async () => {
  const v2 = await erzeugeHandlerV2({ slug: SLUG });
  await mitServer(v2, async (basis) => {
    const { bestellung: b } = await bestellen(basis);
    await post(basis, "/v2/intern/bestellung/kuechenstatus", { id: b.id, status: "in-zubereitung" });
    await post(basis, "/v2/intern/bestellung/kuechenstatus", { id: b.id, status: "bereit" });
    const { status: s } = await statusVon(basis, b.statusToken);
    assert.equal(s.phase, "bereit");
    assert.equal(s.titel, "Bereit zur Abholung");
    assert.deepEqual(mails.map((m) => m.betreff.split(" · ")[0]), ["Bestellung eingegangen – noch nicht bestätigt", "Bestellung bestätigt", "Bereit zur Abholung"]);
  });
});

test("6. Keine E-Mail angegeben → kein Sendeversuch, Status-Link vorhanden, Telefon-Fallback sichtbar", async () => {
  await mitServer(handler, async (basis) => {
    const { bestellung: b } = await bestellen(basis, { email: "" });
    assert.match(b.statusToken, /^[A-Za-z0-9_-]{43}$/);
    await post(basis, `/intern/bestellung/${b.id}/verzoegerung`, { neueZeit: "19:30" });
    assert.equal(mails.length, 0, "ohne Adresse kein Versuch");
    const g = (await betrieb(basis)).bestellungen.find((x) => x.id === b.id).gast;
    assert.equal(g.letzteMeldung.zustand, "keine-adresse");
    assert.equal(g.anrufNoetig, true);
    assert.equal(g.anrufText, "Gast nicht automatisch informiert – bitte unter 0170 2222222 anrufen.");
    const { status: s } = await statusVon(basis, b.statusToken);
    assert.equal(s.uhrzeit, "19:30");
  });
});

test("7. Provider fehlt oder ist nicht erreichbar → nie „übergeben“, Anruf-Hinweis bleibt", async () => {
  await mitServer(handler, async (basis) => {
    // a) nicht eingerichtet
    emailHook.aktuell = null;
    const { reservierung: r } = await reservieren(basis);
    const a = await post(basis, "/api/reservierung/status", { id: r.id, status: "abgesagt" });
    assert.equal(a.gast.letzteMeldung.zustand, "nicht-eingerichtet");
    assert.match(a.gast.letzteMeldung.fehler, /RESEND_API_KEY fehlt/);
    assert.equal(a.gast.anrufNoetig, true);
    const stand = await betrieb(basis);
    assert.equal(stand.gastEmail.eingerichtet, false);

    // b) eingerichtet (Resend), aber nicht erreichbar
    process.env.RESEND_API_KEY = "re_test";
    process.env.GAST_EMAIL_ABSENDER = "bestellung@beispiel.de";
    fetchHook.aktuell = async () => {
      throw new TypeError("fetch failed");
    };
    const { bestellung: b } = await bestellen(basis);
    const v = await post(basis, `/intern/bestellung/${b.id}/verzoegerung`, { neueZeit: "19:45" });
    assert.equal(v.kanal, "keiner");
    assert.equal(v.gast.letzteMeldung.zustand, "fehlgeschlagen");
    assert.equal(v.gast.letzteMeldung.erneutMoeglich, true);
    assert.equal(v.gast.anrufNoetig, true);
    // Die gespeicherte Änderung bleibt – eine gescheiterte Mail rollt nichts zurück.
    assert.equal(store.ladeBetrieb(SLUG).bestellungen[0].bestaetigteAbholzeit, "19:45");

    // c) gezielt erneut – jetzt klappt es; ein zweiter Versuch wird verweigert.
    fetchHook.aktuell = async () => new Response(JSON.stringify({ id: "re_1" }), { status: 200 });
    const erneut = await post(basis, "/intern/gastmeldung/erneut", { id: v.gast.letzteMeldung.id });
    assert.equal(erneut.meldung.versand.zustand, "uebergeben");
    const nochmal = await post(basis, "/intern/gastmeldung/erneut", { id: v.gast.letzteMeldung.id });
    assert.equal(nochmal.status, 400);
    const g = (await betrieb(basis)).bestellungen.find((x) => x.id === b.id).gast;
    assert.equal(g.anrufNoetig, false);
  });
});

test("9. Fremder, erratener, widerrufener Link oder bloße ID → kein Zugriff; keine Personendaten; Bremse", async () => {
  await mitServer(handler, async (basis) => {
    const { reservierung: r } = await reservieren(basis);
    const echt = await statusVon(basis, r.statusToken);
    assert.equal(echt.kopf.get("cache-control"), "no-store, max-age=0");
    assert.equal(echt.kopf.get("referrer-policy"), "no-referrer");
    const roh = JSON.stringify(echt.status);
    for (const privat of ["Erika", "0170 1111111", "erika@beispiel.de", r.id]) assert.ok(!roh.includes(privat), `nicht öffentlich: ${privat}`);

    const erraten = "A".repeat(43);
    const fremdesGeheimnis = gastToken("ein-anderes-geheimnis-mit-mindestens-32-zeichen", { slug: SLUG, art: "reservierung", id: r.id });
    for (const falsch of [erraten, fremdesGeheimnis, r.id, r.nummer, "", r.statusToken.slice(0, -1)]) {
      const a = await statusVon(basis, falsch);
      assert.equal(a.status, 404, `kein Zugriff mit ${falsch.slice(0, 8)}…`);
      assert.equal(a.ok, false);
    }

    await post(basis, "/intern/gastlink/widerrufen", { art: "reservierung", id: r.id });
    assert.equal((await statusVon(basis, r.statusToken)).status, 404, "widerrufen");

    // Status-Seite selbst: ohne Zwischenspeicher, ohne Referrer
    const seite = await fetch(`${basis}/status`);
    assert.equal(seite.headers.get("cache-control"), "no-store, max-age=0");
    assert.match(seite.headers.get("content-security-policy"), /connect-src 'self'/);

    // Durchprobieren wird gebremst
    let letzte;
    for (let i = 0; i < 6; i += 1) letzte = await statusVon(basis, erraten);
    assert.equal(letzte.status, 429);
  });
});

test("10. v1-Dashboard, v2-Küchenstatus und Telegram-Knöpfe: keine widersprüchlichen oder doppelten Ereignisse", async () => {
  const v2 = await erzeugeHandlerV2({ slug: SLUG });
  await mitServer(v2, async (basis) => {
    const { reservierung: r } = await reservieren(basis);
    const { bestellung: b } = await bestellen(basis);

    // Reservierung: Telegram bestätigt, danach v1 noch einmal, dann Telegram noch einmal.
    assert.equal((await knopf(`r:ok:${r.id}`)).aktion, "r:ok");
    await post(basis, "/api/reservierung/status", { id: r.id, status: "bestaetigt" });
    await knopf(`r:ok:${r.id}`);
    assert.deepEqual(meldungenVon(r.id).map((m) => m.typ), ["eingegangen", "bestaetigt"]);

    // Bestellung: v2 „in Zubereitung“, v1 bestätigt dieselbe Zeit, Telegram „bereit“, v2 „bereit“.
    await post(basis, "/v2/intern/bestellung/kuechenstatus", { id: b.id, status: "in-zubereitung" });
    await post(basis, "/api/bestellung/bestaetigen", { id: b.id, abholzeit: "18:30" });
    await knopf(`b:bereit:${b.id}`);
    await post(basis, "/v2/intern/bestellung/kuechenstatus", { id: b.id, status: "bereit" });
    await knopf(`b:bereit:${b.id}`);
    assert.deepEqual(meldungenVon(b.id).map((m) => m.typ), ["eingegangen", "bestaetigt", "bereit"]);

    assert.equal(mails.length, 5, "je Ereignis genau eine Mail");
    const s = (await statusVon(basis, b.statusToken)).status;
    assert.equal(s.phase, "bereit");
  });
});

test("10b. Telegram-Ablehnung ohne Kanal: Hinweis zum Anrufen steht in der Telegram-Nachricht", async () => {
  await mitServer(handler, async (basis) => {
    const { reservierung: r } = await reservieren(basis, { email: "" });
    const gesendet = [];
    telegramApiHook.aktuell = async (methode, daten) => {
      gesendet.push({ methode, daten });
      return {};
    };
    await knopf(`r:ab:${r.id}`);
    const bearbeitet = gesendet.find((g) => g.methode === "editMessageText");
    assert.match(bearbeitet.daten.text, /Gast nicht automatisch informiert – bitte unter 0170 1111111 anrufen\./);
  });
});

test("11. Demo: Seiten ohne Betriebsserver und Konzept-Demos senden nichts; Demo-Betrieb erzeugt keine Links", async () => {
  // Konzept-Demo: die apiUrl wird verworfen – das Skript meldet nur „Vorschau“.
  const konzept = baueSite({ lead: { name: "Echtes Haus", ort: "Y", placeId: "p" }, kueche: "bayerisch", optionen: { fontCss: "", ausdruck: "gesellig", konzept: true, apiUrl: "http://127.0.0.1:9" } }).html;
  assert.ok(!konzept.includes("127.0.0.1:9"));
  assert.match(konzept, /"apiUrl":""/);
  // v1-Entwurf ohne apiUrl: kein Status-Hinweis, der Absenden-Weg endet in der Vorschau.
  const entwurf = buildLandingPage({ name: "Entwurf", kueche: "italienisch", adresse: "Weg 1, 80331 München" }, { fontCss: "" });
  assert.match(entwurf, /if \(!data\.apiUrl\) return Promise\.resolve\(\{ demo: true \}\);/);
  assert.ok(!entwurf.includes("persönlichen Status-Link"));

  // Demo-Betrieb auf dem Server: keine Status-Links, keine Mails.
  store.setzeDemoBetrieb(SLUG, true);
  await mitServer(handler, async (basis) => {
    const { bestellung: b } = await bestellen(basis);
    assert.equal(b.statusToken, "");
    await post(basis, "/api/bestellung/status", { id: b.id, status: "abgelehnt" });
    assert.equal(mails.length, 0);
    assert.ok(meldungenVon(b.id).every((m) => m.versand.zustand === "demo"));
  });
});

test("E-Mail-Adresse wird serverseitig geprüft; leer bleibt erlaubt", async () => {
  await mitServer(handler, async (basis) => {
    for (const falsch of ["kein-at", "a@b", "x@beispiel.de\nBcc: y@z.de", "a b@beispiel.de"]) {
      const a = await bestellen(basis, { email: falsch });
      assert.equal(a.status, 400, falsch);
      assert.match(a.fehler, /gültige E-Mail-Adresse/);
    }
    assert.equal((await bestellen(basis, { email: "" })).ok, true);
  });
});

test("WIRT_PASSWORT schützt Dashboard und Wirt-Aktionen, nicht die Gast-Routen", async () => {
  process.env.WIRT_PASSWORT = "sehr-geheim";
  await mitServer(handler, async (basis) => {
    assert.equal((await fetch(`${basis}/api/betrieb`)).status, 401);
    assert.equal((await fetch(`${basis}/api/reservierung/status`, { method: "POST", body: "{}" })).status, 401);
    assert.equal((await fetch(`${basis}/intern/gastlink/widerrufen`, { method: "POST", body: "{}" })).status, 401);
    const mitAnmeldung = await fetch(`${basis}/api/betrieb`, { headers: { Authorization: `Basic ${Buffer.from("wirt:sehr-geheim").toString("base64")}` } });
    assert.equal(mitAnmeldung.status, 200);
    assert.equal((await reservieren(basis)).ok, true);
    assert.equal((await fetch(`${basis}/status`)).status, 200);
  });
});
