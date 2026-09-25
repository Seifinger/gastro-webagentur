import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Telegram-Benachrichtigungen an den Wirt: Zeitfenster, sofortige Meldung,
// Nachmelden, genau eine Erinnerung, Neustart, Chat-Modi, zwei Bots,
// Datensparsamkeit. Synthetische Betriebe, Telegram nur als Mock –
// es geht nichts ins Netz.

const SLUG = "__test-telegram-benachrichtigung";
const SLUG2 = "__test-telegram-zweiter-betrieb";
process.env.BETRIEB = SLUG;
for (const k of ["WIRT_PASSWORT", "WIRT_OEFFENTLICHE_URL", "TELEGRAM_BOT_TOKEN_RESERVIERUNG", "TELEGRAM_BOT_TOKEN_BESTELLUNG", "TELEGRAM_BOT_NAME"]) delete process.env[k];
process.env.TELEGRAM_BOT_TOKEN = "111111:standard-test-token";
const SPERR_TMP = mkdtempSync(path.join(tmpdir(), "tg-sperren-"));

const store = await import("../src/betriebStore.js");
const { ladeBetrieb, speichereBetrieb, legeTischAn, legeReservierungAn, legeBestellungAn, setzeReservierungStatus, uhrHook } = store;
const regeln = await import("../src/telegramRegeln.js");
const adapter = await import("../v2/integration/wirtAdapter.js");
const bot = await import("../v2/integration/telegramBot.js");
const planer = await import("../v2/integration/telegramPlaner.js");
const { sichereSperre } = await import("../v2/integration/telegramSperren.js");
const { erzeugeHandlerV2 } = await import("../v2/integration/wirtServerV2.js");
const { setzeBremsenZurueck } = await import("../src/wirtServer.js");
const { emailHook, fetchHook } = await import("../src/kundenBenachrichtigung.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATEIEN = [SLUG, SLUG2].map((s) => path.join(__dirname, "..", "data", "betrieb", `${s}.json`));
const BETRIEBE = [SLUG];

// Donnerstag, 24.09.2026 – geöffnet 11:00–14:00 und 17:30–22:00,
// Telegram also 10:30–14:30 und 17:00–22:30.
const OEFFNUNGSZEITEN = [{ tage: "Montag – Sonntag", zeiten: "11:00 – 14:00 & 17:30 – 22:00" }];
let jetzt = new Date("2026-09-24T18:00:00+02:00");
const altUhr = uhrHook.jetzt;
uhrHook.jetzt = () => new Date(jetzt);
const stelle = (tag, hhmm) => {
  jetzt = new Date(`${tag}T${hhmm}:00+02:00`);
  return jetzt;
};

let aufrufe = [];
let fehlerModus = null;
bot.telegramApiHook.aktuell = async (methode, daten, botRolle) => {
  if (fehlerModus && methode === "sendMessage") {
    const f = new Error(fehlerModus.text);
    f.status = fehlerModus.status;
    throw f;
  }
  aufrufe.push({ methode, daten, bot: botRolle });
  if (methode === "getUpdates") {
    await new Promise((r) => setTimeout(r, 10));
    return [];
  }
  return { message_id: aufrufe.length };
};
const gesendet = () => aufrufe.filter((a) => a.methode === "sendMessage");

function neuerBetrieb(slug = SLUG, extra = {}) {
  // Tagesübersicht aus – sie wird in Test 20 gezielt eingeschaltet.
  speichereBetrieb(slug, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [], anzeigeName: "Trattoria Test", telefon: "030 999", oeffnungszeiten: OEFFNUNGSZEITEN, telegramChatId: "4711", telegramV2: { tagesuebersicht: false }, ...extra });
  legeTischAn(slug, { name: "Tisch 1", plaetze: 8 });
  legeTischAn(slug, { name: "Tisch 2", plaetze: 8 });
}

const GAST = { name: "Erika Mustergast", telefon: "0170 1234567", email: "erika@beispiel.de", wunsch: "Glutenfrei wegen Zöliakie" };
const reservieren = (zusatz = {}) => legeReservierungAn(SLUG, { datum: "2026-09-26", uhrzeit: "19:00", personen: 4, ...GAST, ...zusatz }, "online");
const bestellen = (abholzeit, zusatz = {}) =>
  legeBestellungAn(SLUG, { positionen: [{ name: "Pizza Diavola", menge: 2, preis: 11.5 }], abholzeit, name: "Max Abholer", telefon: "0171 7654321", email: "max@beispiel.de", hinweis: "Allergie: Erdnüsse", ...zusatz });
const tg = (art, id, slug = SLUG) => ladeBetrieb(slug)[art === "reservierung" ? "reservierungen" : "bestellungen"].find((x) => x.id === id).telegram;
const takt = (betriebe = BETRIEBE) => planer.fuehreTaktAus({ betriebe, jetzt });
const knopf = (data, chatId = 4711, botRolle = "standard", betriebe = BETRIEBE) =>
  bot.verarbeiteUpdate({ callback_query: { id: "k", data, message: { chat: { id: chatId }, message_id: 7 } } }, { betriebe, bot: botRolle });
const befehl = (text, chatId = 4711, botRolle = "standard", betriebe = BETRIEBE) => bot.verarbeiteUpdate({ message: { chat: { id: chatId }, text } }, { betriebe, bot: botRolle });

beforeEach(() => {
  aufrufe = [];
  fehlerModus = null;
  process.env.TELEGRAM_BOT_TOKEN = "111111:standard-test-token";
  delete process.env.TELEGRAM_BOT_TOKEN_RESERVIERUNG;
  delete process.env.TELEGRAM_BOT_TOKEN_BESTELLUNG;
  stelle("2026-09-24", "18:00");
  neuerBetrieb();
  bot.setzeCodeBremseZurueck();
  setzeBremsenZurueck();
  emailHook.aktuell = async () => ({ id: "mock" });
  fetchHook.aktuell = () => {
    throw new Error("kein echter Netzwerkaufruf im Test");
  };
});

after(() => {
  for (const d of DATEIEN) rmSync(d, { force: true });
  rmSync(SPERR_TMP, { recursive: true, force: true });
  uhrHook.jetzt = altUhr;
  emailHook.aktuell = null;
});

async function mitServer(fn) {
  const server = createServer(await erzeugeHandlerV2({ slug: SLUG }));
  await new Promise((f) => server.listen(0, "127.0.0.1", f));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((f) => server.close(f));
  }
}

async function post(basis, pfad, daten = {}) {
  const antwort = await fetch(`${basis}${pfad}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten) });
  return { status: antwort.status, ...(await antwort.json()) };
}

async function warteAuf(pruefung, ms = 3000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) {
    if (pruefung()) return true;
    await new Promise((r) => setTimeout(r, 15));
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Innerhalb des Fensters                                              */
/* ------------------------------------------------------------------ */

test("8./9. Neue Bestellung und neue Reservierung im Fenster → sofortige Nachricht an den Chat (über den echten Wirt-Server)", async () => {
  await mitServer(async (basis) => {
    const b = await post(basis, "/oeffentlich/bestellung", { positionen: [{ name: "Pizza", menge: 1, preis: 9.9 }], abholzeit: "18:45", name: "Max", telefon: "0171 1" });
    assert.equal(b.status, 200);
    assert.ok(await warteAuf(() => gesendet().some((a) => a.daten.text.includes(b.bestellung.nummer))), "Bestellung sofort gemeldet");
    const r = await post(basis, "/oeffentlich/reservierung", { datum: "2026-09-26", uhrzeit: "19:00", personen: 2, name: "Erika", telefon: "0170 1" });
    assert.equal(r.status, 200);
    assert.ok(await warteAuf(() => gesendet().some((a) => a.daten.text.includes(r.reservierung.nummer))), "Reservierung sofort gemeldet");
    const [nb, nr] = [b.bestellung.nummer, r.reservierung.nummer].map((n) => gesendet().find((a) => a.daten.text.includes(n)));
    assert.equal(nb.daten.chat_id, "4711");
    assert.equal(nb.bot, "standard");
    assert.match(nb.daten.text, /Neue Bestellung · Trattoria Test/);
    assert.match(nb.daten.text, /Abholung 18:45 Uhr \(gewünscht\)/);
    assert.equal(nb.daten.reply_markup.inline_keyboard[0][0].callback_data, `b:zub:${b.bestellung.id}`);
    assert.match(nr.daten.text, /Sa 26\.09\.2026 · 19:00 Uhr · 2 Personen/);
    assert.equal(nr.daten.reply_markup.inline_keyboard[0][0].callback_data, `r:ok:${r.reservierung.id}`);
    // Zustand dauerhaft am Vorgang: Frist läuft ab dem Versand
    const t = tg("reservierung", r.reservierung.id);
    assert.equal(t.eingang.zustand, "gesendet");
    assert.equal(t.fristAb, jetzt.toISOString());
    assert.equal(t.erinnerung.zustand, "geplant");
    // Das Dashboard zeigt den Stand je Vorgang
    const stand = await (await fetch(`${basis}/api/betrieb`)).json();
    assert.equal(stand.reservierungen[0].telegram.eingang.zustand, "gesendet");
  });
});

test("10. Nach 2 Minuten noch offen → genau eine Erinnerung", async () => {
  const r = reservieren();
  assert.deepEqual(await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id }), { gesendet: true });
  aufrufe = [];
  stelle("2026-09-24", "18:01");
  await takt();
  assert.equal(gesendet().length, 0, "vor Ablauf der Frist nichts");
  stelle("2026-09-24", "18:02");
  await takt();
  assert.equal(gesendet().length, 1);
  assert.match(gesendet()[0].daten.text, /⏰ Erinnerung: Reservierung offen/);
  assert.ok(gesendet()[0].daten.text.includes(r.nummer));
  assert.ok(gesendet()[0].daten.reply_markup, "mit Knöpfen");
  for (const uhr of ["18:03", "18:10", "19:30"]) {
    stelle("2026-09-24", uhr);
    await takt();
  }
  assert.equal(gesendet().length, 1, "nie ein zweites Mal");
  assert.equal(tg("reservierung", r.id).erinnerung.zustand, "gesendet");
});

test("10b. Eigene Frist je Art und abgeschaltete Erinnerung", async () => {
  regeln.setzeTelegramEinstellungen(SLUG, { fristBestellungMinuten: 5, erinnerungReservierung: false });
  const r = reservieren();
  const b = bestellen("18:45");
  await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
  await bot.benachrichtige(SLUG, { art: "bestellung", id: b.id });
  assert.equal(tg("reservierung", r.id).erinnerung.zustand, "aus");
  aufrufe = [];
  stelle("2026-09-24", "18:04");
  await takt();
  assert.equal(gesendet().length, 0);
  stelle("2026-09-24", "18:05");
  await takt();
  assert.equal(gesendet().length, 1);
  assert.ok(gesendet()[0].daten.text.includes(b.nummer));
});

test("11. Vorher im Dashboard bestätigt → keine Erinnerung", async () => {
  await mitServer(async (basis) => {
    const r = reservieren();
    const b = bestellen("18:45");
    await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
    await bot.benachrichtige(SLUG, { art: "bestellung", id: b.id });
    assert.equal((await post(basis, "/api/reservierung/status", { id: r.id, status: "bestaetigt" })).ok, true);
    assert.equal((await post(basis, "/api/bestellung/bestaetigen", { id: b.id, abholzeit: "18:50" })).ok, true);
    aufrufe = [];
    stelle("2026-09-24", "18:05");
    await takt();
    assert.equal(gesendet().length, 0);
    assert.equal(tg("reservierung", r.id).erinnerung.zustand, "entfallen");
    assert.equal(tg("reservierung", r.id).erinnerung.grund, "erledigt");
  });
});

test("12. Vorher per Telegram bestätigt oder abgelehnt → keine Erinnerung", async () => {
  const r = reservieren();
  const b = bestellen("18:45");
  await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
  await bot.benachrichtige(SLUG, { art: "bestellung", id: b.id });
  assert.equal((await knopf(`r:ok:${r.id}`)).aktion, "r:ok");
  assert.equal((await knopf(`b:ab:${b.id}`)).aktion, "b:ab");
  aufrufe = [];
  stelle("2026-09-24", "18:10");
  await takt();
  assert.equal(gesendet().length, 0);
});

/* ------------------------------------------------------------------ */
/* Außerhalb des Fensters                                              */
/* ------------------------------------------------------------------ */

test("13. Außerhalb eingegangen → keine nächtliche Nachricht; im nächsten Fenster kontrolliert nachgemeldet, dann Frist", async () => {
  stelle("2026-09-24", "23:40");
  const r = reservieren();
  const ergebnis = await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
  assert.equal(ergebnis.gesendet, false);
  assert.equal(ergebnis.zurueckgestellt, true);
  assert.equal(tg("reservierung", r.id).eingang.zustand, "zurueckgestellt");
  // Die Anfrage selbst ist ganz normal gespeichert und im Dashboard offen.
  assert.equal(ladeBetrieb(SLUG).reservierungen.find((x) => x.id === r.id).status, "neu");

  for (const [tag, uhr] of [["2026-09-24", "23:59"], ["2026-09-25", "03:00"], ["2026-09-25", "10:29"]]) {
    stelle(tag, uhr);
    await takt();
  }
  assert.equal(gesendet().length, 0, "nachts nichts");

  stelle("2026-09-25", "10:30");
  await takt();
  assert.equal(gesendet().length, 1);
  assert.match(gesendet()[0].daten.text, /nachgemeldet/);
  assert.match(gesendet()[0].daten.text, /Eingegangen 24\.09\.2026, 23:40 Uhr – außerhalb der Telegram-Zeiten/);
  assert.equal(tg("reservierung", r.id).eingang.zustand, "nachgeholt");
  assert.equal(tg("reservierung", r.id).fristAb, jetzt.toISOString(), "Frist beginnt erst mit der Nachmeldung");

  stelle("2026-09-25", "10:31");
  await takt();
  assert.equal(gesendet().length, 1);
  stelle("2026-09-25", "10:32");
  await takt();
  assert.equal(gesendet().length, 2);
  assert.match(gesendet()[1].daten.text, /Erinnerung/);
});

test("13b. Nach langer Pause: eine Sammelmeldung statt einer Flut – Erledigtes fehlt, einzeln bearbeitbar", async () => {
  stelle("2026-09-24", "09:00");
  const res = [reservieren(), reservieren({ uhrzeit: "12:00" }), reservieren({ uhrzeit: "20:00" })];
  const best = [bestellen("11:30"), bestellen("12:00")];
  const erledigt = reservieren({ uhrzeit: "13:00" });
  for (const r of [...res, erledigt]) await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
  for (const b of best) await bot.benachrichtige(SLUG, { art: "bestellung", id: b.id });
  assert.equal(gesendet().length, 0);
  setzeReservierungStatus(SLUG, erledigt.id, "abgesagt");

  stelle("2026-09-24", "10:30");
  await takt();
  assert.equal(gesendet().length, 1, "eine Meldung für alles");
  const text = gesendet()[0].daten.text;
  assert.match(text, /Noch offen · Trattoria Test: 3 Reservierungen \/ 2 Bestellungen sind noch nicht bestätigt/);
  for (const v of [...res, ...best]) assert.ok(text.includes(v.nummer), v.nummer);
  assert.ok(!text.includes(erledigt.nummer), "abgesagte Anfrage wird nicht nachgemeldet");
  assert.equal(gesendet()[0].daten.reply_markup.inline_keyboard[0][0].callback_data, "o:a");
  assert.equal(tg("reservierung", erledigt.id).eingang.zustand, "entfallen");

  // „Einzeln anzeigen“ → je Vorgang eine Nachricht mit Knöpfen
  aufrufe = [];
  const einzeln = await knopf("o:a");
  assert.equal(einzeln.aktion, "offen-einzeln");
  assert.equal(gesendet().length, 5);
  assert.ok(gesendet().every((a) => a.daten.reply_markup?.inline_keyboard?.length));

  // Nach der Frist: wieder EINE Meldung (Erinnerung) statt fünf
  aufrufe = [];
  stelle("2026-09-24", "10:32");
  await takt();
  assert.equal(gesendet().length, 1);
  assert.match(gesendet()[0].daten.text, /Erinnerung/);
});

test("14. Fenster schließt zwischen Nachricht und Erinnerung → keine Nachricht außerhalb, genau eine im nächsten Fenster", async () => {
  stelle("2026-09-24", "22:29");
  const r = reservieren();
  await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
  assert.equal(gesendet().length, 1);
  for (const [tag, uhr] of [["2026-09-24", "22:31"], ["2026-09-24", "23:30"], ["2026-09-25", "08:00"]]) {
    stelle(tag, uhr);
    await takt();
  }
  assert.equal(gesendet().length, 1, "keine Erinnerung außerhalb des Fensters");
  stelle("2026-09-25", "10:30");
  await takt();
  assert.equal(gesendet().length, 2);
  assert.match(gesendet()[1].daten.text, /Erinnerung/);
  for (const uhr of ["10:31", "10:45", "17:00"]) {
    stelle("2026-09-25", uhr);
    await takt();
  }
  assert.equal(gesendet().length, 2, "nicht zweimal erinnern");
});

test("15. Neustart vor und nach der Erinnerung: nichts verloren, nichts doppelt", async () => {
  const r = reservieren();
  await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
  aufrufe = [];
  // Neuer Prozess = frisch geladener Planer ohne jeden Speicher außer der Datei
  const neu1 = await import("../v2/integration/telegramPlaner.js?neustart=1");
  stelle("2026-09-24", "18:03");
  await neu1.fuehreTaktAus({ betriebe: BETRIEBE, jetzt });
  assert.equal(gesendet().length, 1, "fällige Erinnerung nach Neustart gefunden");
  const neu2 = await import("../v2/integration/telegramPlaner.js?neustart=2");
  stelle("2026-09-24", "18:10");
  await neu2.fuehreTaktAus({ betriebe: BETRIEBE, jetzt });
  await takt();
  assert.equal(gesendet().length, 1, "nach Neustart keine zweite Erinnerung");

  // Absturz mitten im Versand (Zustand „sendet“ steht noch da): höchstens einmal → „unklar“, nicht erneut
  const r2 = reservieren({ uhrzeit: "20:00" });
  await bot.benachrichtige(SLUG, { art: "reservierung", id: r2.id });
  const d = ladeBetrieb(SLUG);
  Object.assign(d.reservierungen.find((x) => x.id === r2.id).telegram.erinnerung, { zustand: "sendet", claim: jetzt.toISOString() });
  speichereBetrieb(SLUG, d);
  aufrufe = [];
  const neu3 = await import("../v2/integration/telegramPlaner.js?neustart=3");
  stelle("2026-09-24", "18:30");
  await neu3.fuehreTaktAus({ betriebe: BETRIEBE, jetzt });
  await takt();
  assert.equal(gesendet().length, 0);
  assert.equal(tg("reservierung", r2.id).erinnerung.zustand, "unklar");
});

test("Telegram-Ausfall: begrenzte Wiederholung, sichtbarer Fehler, Gastanfrage bleibt", async () => {
  fehlerModus = { text: "Telegram sendMessage: Bad Gateway", status: 502 };
  const r = reservieren();
  const e = await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
  assert.equal(e.gesendet, false);
  assert.ok(ladeBetrieb(SLUG).reservierungen.some((x) => x.id === r.id), "Anfrage nicht zurückgerollt");
  assert.equal(tg("reservierung", r.id).eingang.zustand, "wiederholen");
  stelle("2026-09-24", "18:01");
  await takt();
  assert.equal(tg("reservierung", r.id).eingang.versuche, 2);
  stelle("2026-09-24", "18:03");
  await takt();
  assert.equal(tg("reservierung", r.id).eingang.versuche, 2, "zweite Pause: 5 Minuten");
  stelle("2026-09-24", "18:06");
  await takt();
  assert.equal(tg("reservierung", r.id).eingang.zustand, "fehlgeschlagen");
  assert.equal(tg("reservierung", r.id).eingang.versuche, 3);
  fehlerModus = null;
  stelle("2026-09-24", "18:30");
  await takt();
  assert.equal(gesendet().length, 0, "nach drei Versuchen Schluss");
  const stand = regeln.telegramStand(ladeBetrieb(SLUG), { jetzt });
  assert.equal(stand.probleme[0].referenz, r.nummer);
  assert.equal(stand.probleme[0].zustand, "fehlgeschlagen");
  assert.match(stand.zustand.letzterFehler.text, /Bad Gateway/);
  assert.match(regeln.telegramHinweis(ladeBetrieb(SLUG), jetzt), /nicht zugestellt/);

  // Dauerhafter Fehler (Bot blockiert): sofort fehlgeschlagen, kein Wiederholen
  fehlerModus = { text: "Forbidden: bot was blocked by the user", status: 403 };
  const r2 = reservieren({ uhrzeit: "20:00" });
  await bot.benachrichtige(SLUG, { art: "reservierung", id: r2.id });
  assert.equal(tg("reservierung", r2.id).eingang.zustand, "fehlgeschlagen");
});

/* ------------------------------------------------------------------ */
/* Chat-Modi                                                           */
/* ------------------------------------------------------------------ */

test("16. Ein Bot, zwei Chats: richtige Zuordnung, kein stiller Umweg über den alten Chat", async () => {
  regeln.setzeTelegramEinstellungen(SLUG, { modus: "zwei-chats" });
  // Bestell-Chat noch nicht verbunden → Bestellung geht NICHT an den bisherigen Chat
  const b0 = bestellen("18:45");
  const e0 = await bot.benachrichtige(SLUG, { art: "bestellung", id: b0.id });
  assert.equal(e0.gesendet, false);
  assert.match(e0.grund, /kein Telegram-Chat/);
  assert.equal(gesendet().length, 0);

  const { code: resCode } = adapter.erzeugeVerknuepfungscode(SLUG, new Date(), { kanal: "reservierung" });
  const { code: bestCode } = adapter.erzeugeVerknuepfungscode(SLUG, new Date(), { kanal: "bestellung" });
  assert.match(resCode, /^R-[A-Z2-9]{6}$/);
  assert.match(bestCode, /^B-[A-Z2-9]{6}$/);
  assert.equal((await befehl(`/start ${bestCode}`, -200)).kanal, "bestellung");
  // Reservierungs-Code im Bestell-Chat: abgelehnt, der Chat bleibt Bestell-Chat
  const falsch = await befehl(`/start ${resCode}`, -200);
  assert.equal(falsch.aktion, "anderer-kanal");
  assert.match(aufrufe.at(-1).daten.text, /bereits der Chat für Bestellungen/);
  assert.deepEqual(await befehl(`/start ${resCode}`, -100), { aktion: "verknuepft", slug: SLUG, kanal: "reservierung" });
  assert.equal(ladeBetrieb(SLUG).telegramChatId, "4711", "alte Chat-ID bleibt gespeichert");

  aufrufe = [];
  const r = reservieren();
  const b = bestellen("18:50");
  await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
  await bot.benachrichtige(SLUG, { art: "bestellung", id: b.id });
  assert.deepEqual(gesendet().map((a) => [a.daten.chat_id, a.daten.text.includes(r.nummer) ? "R" : a.daten.text.includes(b.nummer) ? "B" : "?"]), [["-100", "R"], ["-200", "B"]]);

  // Knöpfe nur im zuständigen Chat
  assert.equal((await knopf(`b:zub:${b.id}`, -100)).aktion, "verweigert");
  assert.equal((await knopf(`r:ok:${r.id}`, -200)).aktion, "verweigert");
  assert.equal((await knopf(`r:ok:${r.id}`, 4711)).aktion, "verweigert", "der bisherige Chat ist in diesem Modus nicht zuständig");
  assert.equal((await knopf(`b:zub:${b.id}`, -200)).aktion, "b:zub");

  // /offen zeigt je Chat nur seine Art
  aufrufe = [];
  await befehl("/offen", -100);
  assert.ok(gesendet().length >= 1 && gesendet().every((a) => !/Bestellung/.test(a.daten.text)));

  // Zurück zu „ein Chat“: der alte Chat gilt wieder, die Kanal-Links bleiben gespeichert
  regeln.setzeTelegramEinstellungen(SLUG, { modus: "ein-chat" });
  assert.equal(regeln.zielFuer(ladeBetrieb(SLUG), "bestellung").chatId, "4711");
  assert.equal(regeln.kanalLink(ladeBetrieb(SLUG), "bestellung", "standard").chatId, "-200");
});

test("16b. Bisherigen Chat für einen Kanal übernehmen, Kanal trennen", () => {
  regeln.setzeTelegramEinstellungen(SLUG, { modus: "zwei-chats" });
  adapter.uebernimmBisherigenChat(SLUG, "reservierung");
  assert.equal(regeln.zielFuer(ladeBetrieb(SLUG), "reservierung").chatId, "4711");
  assert.throws(() => adapter.uebernimmBisherigenChat(SLUG, "bestellung"), /bereits der Chat für Reservierungen/);
  adapter.trenneKanal(SLUG, "reservierung");
  assert.equal(regeln.zielFuer(ladeBetrieb(SLUG), "reservierung"), null);
  assert.equal(ladeBetrieb(SLUG).telegramChatId, "4711");
});

test("17. Zwei echte Bots: keine Vermischung, kein Doppel-Polling", async () => {
  // Ohne eigene Tokens nicht wählbar; derselbe Token zählt nicht als zweiter Bot.
  assert.throws(() => regeln.setzeTelegramEinstellungen(SLUG, { modus: "zwei-bots" }), /TELEGRAM_BOT_TOKEN_RESERVIERUNG/);
  process.env.TELEGRAM_BOT_TOKEN_RESERVIERUNG = "222222:reservierung-test-token";
  process.env.TELEGRAM_BOT_TOKEN_BESTELLUNG = process.env.TELEGRAM_BOT_TOKEN;
  assert.equal(regeln.zweiBotsVerfuegbar(), false);
  assert.deepEqual(regeln.konfigurierteBots().map((b) => b.rolle), ["standard", "reservierung"]);
  process.env.TELEGRAM_BOT_TOKEN_BESTELLUNG = "333333:bestellung-test-token";
  assert.equal(regeln.zweiBotsVerfuegbar(), true);
  regeln.setzeTelegramEinstellungen(SLUG, { modus: "zwei-bots" });

  const { code: resCode } = adapter.erzeugeVerknuepfungscode(SLUG, new Date(), { kanal: "reservierung" });
  const { code: bestCode } = adapter.erzeugeVerknuepfungscode(SLUG, new Date(), { kanal: "bestellung" });
  assert.equal((await befehl(`/start ${resCode}`, 777, "standard")).aktion, "falscher-bot");
  assert.equal((await befehl(`/start ${resCode}`, 777, "bestellung")).aktion, "falscher-bot");
  assert.equal((await befehl(`/start ${resCode}`, 777, "reservierung")).kanal, "reservierung");
  // Privater Chat: dieselbe Chat-ID bei beiden Bots – trotzdem zwei getrennte Kanäle
  assert.equal((await befehl(`/start ${bestCode}`, 777, "bestellung")).kanal, "bestellung");

  aufrufe = [];
  const r = reservieren();
  const b = bestellen("18:45");
  await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
  await bot.benachrichtige(SLUG, { art: "bestellung", id: b.id });
  assert.deepEqual(gesendet().map((a) => [a.bot, a.daten.chat_id]), [["reservierung", "777"], ["bestellung", "777"]]);
  assert.equal((await knopf(`b:zub:${b.id}`, 777, "reservierung")).aktion, "verweigert", "Bestell-Knopf über den Reservierungs-Bot");
  assert.equal((await knopf(`r:ok:${r.id}`, 777, "standard")).aktion, "verweigert");
  assert.equal((await knopf(`b:zub:${b.id}`, 777, "bestellung")).aktion, "b:zub");
  // Jede Antwort geht über den Bot, über den der Knopf kam.
  assert.deepEqual(aufrufe.filter((a) => a.methode === "answerCallbackQuery").map((a) => a.bot), ["reservierung", "standard", "bestellung"]);
  assert.equal(aufrufe.find((a) => a.methode === "editMessageText").bot, "bestellung");

  // Dienst: je Token genau ein Abruf – ein zweiter Dienst fragt nichts doppelt ab
  aufrufe = [];
  const log = [];
  const stop1 = bot.starteDienst({ log: (z) => log.push(z), sperrDir: SPERR_TMP, taktMs: 60_000, betriebe: () => [] });
  const stop2 = bot.starteDienst({ log: (z) => log.push(z), sperrDir: SPERR_TMP, taktMs: 60_000, betriebe: () => [] });
  try {
    assert.deepEqual(stop1.abrufe, ["standard", "reservierung", "bestellung"]);
    assert.deepEqual(stop2.abrufe, [], "kein zweiter Abruf für dieselben Tokens");
    assert.ok(log.some((z) => /kein zweiter Abruf/.test(z)));
    await new Promise((r) => setTimeout(r, 80));
    const abrufe = aufrufe.filter((a) => a.methode === "getUpdates");
    assert.deepEqual([...new Set(abrufe.map((a) => a.bot))].sort(), ["bestellung", "reservierung", "standard"]);
  } finally {
    stop1();
    stop2();
  }
  // Nach dem Stopp sind die Sperren frei
  const stop3 = bot.starteDienst({ log: () => {}, sperrDir: SPERR_TMP, taktMs: 60_000, betriebe: () => [] });
  assert.equal(stop3.abrufe.length, 3);
  stop3();
  await new Promise((r) => setTimeout(r, 30));
});

test("17b. Sperre gilt auch prozessübergreifend; verwaiste Sperren werden übernommen", () => {
  writeFileSync(path.join(SPERR_TMP, "abruf-fremd.lock"), JSON.stringify({ pid: process.ppid, seit: "x" }));
  const fremd = sichereSperre("abruf-fremd", SPERR_TMP);
  assert.equal(fremd.ok, false);
  assert.match(fremd.grund, new RegExp(`Prozess ${process.ppid}`));
  writeFileSync(path.join(SPERR_TMP, "abruf-verwaist.lock"), JSON.stringify({ pid: 2 ** 22 + 12345, seit: "x" }));
  const verwaist = sichereSperre("abruf-verwaist", SPERR_TMP);
  assert.equal(verwaist.ok, true);
  verwaist.freigeben();
  assert.equal(existsSync(path.join(SPERR_TMP, "abruf-verwaist.lock")), false);
});

test("18. Bestehender Ein-Bot-Betrieb funktioniert nach dem Update unverändert weiter", async () => {
  // So sah ein verknüpfter Betrieb vor diesem Stand aus – ohne neue Felder.
  const alt = {
    tische: [{ id: "t1", name: "Tisch 1", plaetze: 8 }, { id: "t2", name: "Tisch 2", plaetze: 8 }],
    reservierungen: [{ id: "alt-1", nummer: "RES-1111", datum: "2026-09-26", uhrzeit: "19:00", personen: 2, name: "Alt", telefon: "", email: "", wunsch: "", tischId: null, quelle: "online", status: "neu", eingegangen: "2026-09-23T10:00:00.000Z" }],
    bestellungen: [],
    telegramChatId: "4711",
    telegramV2: { code: "", codeAblauf: "", verknuepftAm: "2026-09-01T10:00:00.000Z", tagesuebersicht: true, uhrzeit: "09:00", letzteUebersicht: "2026-09-24" },
    oeffnungszeiten: OEFFNUNGSZEITEN,
  };
  speichereBetrieb(SLUG, alt);
  const vorher = readFileSync(DATEIEN[0], "utf-8");
  const e = regeln.telegramEinstellungen(ladeBetrieb(SLUG));
  assert.equal(e.modus, "ein-chat");
  assert.equal(e.aktiv, true);
  assert.equal(readFileSync(DATEIEN[0], "utf-8"), vorher, "Lesen verändert nichts");

  // Alte offene Vorgänge: kein Schwall an Erinnerungen nach dem Update
  // (die Tagesübersicht für heute ist laut Datei schon verschickt)
  await takt();
  assert.equal(gesendet().length, 0);
  // Neue Vorgänge: wie bisher an den einen Chat, mit Knöpfen
  const r = reservieren();
  assert.deepEqual(await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id }), { gesendet: true });
  assert.equal(gesendet()[0].daten.chat_id, "4711");
  assert.equal((await knopf(`r:ok:alt-1`)).aktion, "r:ok", "Knöpfe wirken auch für ältere Vorgänge");
  assert.equal((await befehl("/heute")).aktion, "heute");
  assert.equal(adapter.telegramStatus(SLUG).verknuepft, true);
});

test("18b. Betrieb ohne Öffnungszeiten: deutliche Warnung, nichts wird automatisch gesendet, bewusste Wahl holt nach", async () => {
  neuerBetrieb(SLUG, { oeffnungszeiten: undefined });
  const d = ladeBetrieb(SLUG);
  delete d.oeffnungszeiten;
  speichereBetrieb(SLUG, d);
  const r = reservieren();
  const e = await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
  assert.equal(e.gesendet, false);
  assert.match(e.grund, /Keine Öffnungszeiten/);
  assert.equal(tg("reservierung", r.id).eingang.grund, "keine-oeffnungszeiten");
  await takt();
  assert.equal(gesendet().length, 0);
  assert.match(regeln.telegramHinweis(ladeBetrieb(SLUG), jetzt), /keine Öffnungszeiten hinterlegt/);
  const stand = regeln.telegramStand(ladeBetrieb(SLUG), { jetzt });
  assert.equal(stand.fenster.zustand, "keine-oeffnungszeiten");
  assert.equal(stand.fenster.tage.length, 0, "keine scheinbaren Zeiten");
  // Befehle funktionieren und sagen, warum es still ist
  await befehl("/heute");
  assert.match(aufrufe.at(-1).daten.text, /Automatische Meldungen pausieren/);
  // Wirt wählt bewusst „rund um die Uhr“ → der offene Vorgang wird nachgemeldet
  aufrufe = [];
  regeln.setzeTelegramEinstellungen(SLUG, { zeitfenster: "rund-um-die-uhr" });
  await takt();
  assert.equal(gesendet().length, 1);
  assert.match(gesendet()[0].daten.text, /nachgemeldet/);
});

/* ------------------------------------------------------------------ */
/* Sicherheit und Datensparsamkeit                                     */
/* ------------------------------------------------------------------ */

test("19. Fremder Chat, fremder Betrieb, unzulässiger Übergang: keine Statusaktion", async () => {
  neuerBetrieb(SLUG2, { telegramChatId: "5555" });
  const r = reservieren();
  const alle = [SLUG, SLUG2];
  assert.equal((await knopf(`r:ab:${r.id}`, 666, "standard", alle)).aktion, "verweigert", "unbekannter Chat");
  assert.equal((await knopf(`r:ab:${r.id}`, 5555, "standard", alle)).aktion, "verweigert", "Chat eines anderen Betriebs");
  assert.equal(ladeBetrieb(SLUG).reservierungen.find((x) => x.id === r.id).status, "neu");
  // Nach Bestätigung im Dashboard: ein alter „Absagen“-Knopf sagt nicht still ab
  setzeReservierungStatus(SLUG, r.id, "bestaetigt");
  const alt = await knopf(`r:ab:${r.id}`, 4711, "standard", alle);
  assert.equal(alt.aktion, "fehler");
  assert.match(alt.fehler, /bereits bestätigt/);
  assert.equal(ladeBetrieb(SLUG).reservierungen.find((x) => x.id === r.id).status, "bestaetigt");
  // Bestellung: „Abgeholt“ geht nicht an „In Zubereitung“ vorbei
  const b = bestellen("18:45");
  assert.equal((await knopf(`b:weg:${b.id}`)).aktion, "fehler");
  // Code-Raten wird gebremst
  for (let i = 0; i < 5; i += 1) await befehl("/start ZZZZZZ", 999);
  assert.equal((await befehl("/start ZZZZZZ", 999)).aktion, "code-gesperrt");
});

test("20. Keine unnötigen Gastdaten in Eingang, Erinnerung, Sammelmeldung, /heute, /offen, Tagesübersicht, Knopf-Antwort, Storno", async () => {
  adapter.setzeTagesuebersicht(SLUG, { aktiv: true, uhrzeit: "09:00" });
  await mitServer(async (basis) => {
    stelle("2026-09-24", "09:00");
    const antwort = await post(basis, "/oeffentlich/bestellung", { positionen: [{ name: "Pizza Diavola", menge: 2, preis: 11.5 }], abholzeit: "11:30", name: "Max Abholer", telefon: "0171 7654321", email: "max@beispiel.de", hinweis: "Allergie: Erdnüsse" });
    const statusToken = antwort.bestellung.statusToken;
    const rs = [reservieren(), reservieren({ uhrzeit: "20:00" }), reservieren({ uhrzeit: "21:00" }), reservieren({ uhrzeit: "12:00" })];
    for (const r of rs) await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
    stelle("2026-09-24", "10:30");
    await takt(); // Sammelmeldung + Tagesübersicht
    stelle("2026-09-24", "10:32");
    await takt(); // Erinnerung
    await befehl("/heute");
    await befehl("/offen");
    await knopf(`r:ab:${rs[0].id}`);
    await knopf(`b:zub:${antwort.bestellung.id}`);
    stelle("2026-09-24", "10:40");
    const b2 = bestellen("11:45");
    await bot.benachrichtige(SLUG, { art: "bestellung", id: b2.id });
    await post(basis, `/oeffentlich/bestellung/${b2.id}/stornieren`);
    await warteAuf(() => gesendet().some((a) => /storniert/.test(a.daten.text)));

    const texte = aufrufe.filter((a) => a.daten?.text).map((a) => a.daten.text);
    assert.ok(texte.some((t) => /Tagesübersicht/.test(t)));
    assert.ok(texte.some((t) => /Noch offen/.test(t)));
    assert.ok(texte.some((t) => /Erinnerung/.test(t)));
    assert.ok(texte.some((t) => /Vom Gast storniert/.test(t)));
    assert.ok(aufrufe.some((a) => a.methode === "editMessageText"));
    const verboten = ["Erika", "Mustergast", "0170", "erika@", "Zöliakie", "Glutenfrei", "Max Abholer", "0171", "max@", "Erdnüsse", "Pizza", "Diavola", "11,50", "23,00", statusToken];
    for (const text of texte) for (const wert of verboten) assert.ok(!text.includes(wert), `„${wert}“ in Telegram: ${text}`);
  });
});

test("21. Demo-Modus versendet nichts", async () => {
  store.setzeDemoBetrieb(SLUG, true);
  const r = reservieren();
  const e = await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
  assert.equal(e.gesendet, false);
  assert.match(e.grund, /Demo/);
  stelle("2026-09-24", "18:30");
  await takt();
  await planer.sendeFaelligeUebersichten(jetzt, BETRIEBE);
  assert.equal(gesendet().length, 0);
  await mitServer(async (basis) => {
    const t = await post(basis, "/v2/intern/telegram/test", { kanal: "alle" });
    assert.equal(t.status, 400);
    assert.match(t.fehler, /Demo/);
  });
  assert.equal(gesendet().length, 0);
});

/* ------------------------------------------------------------------ */
/* Wirt-Dashboard                                                      */
/* ------------------------------------------------------------------ */

test("Dashboard: Einstellungen serverseitig geprüft, dauerhaft gespeichert, Zeiten verständlich angezeigt", async () => {
  await mitServer(async (basis) => {
    const stand = await (await fetch(`${basis}/api/telegram/benachrichtigung`)).json();
    assert.equal(stand.fenster.heuteText, "Heute kommen Telegram-Nachrichten von 10:30 bis 14:30 und von 17:00 bis 22:30.");
    assert.equal(stand.einstellungen.fristReservierungMinuten, 2);
    assert.equal(stand.einstellungen.zeitfenster, "oeffnungszeiten");

    const falsch = await post(basis, "/intern/telegram/benachrichtigung", { fristBestellungMinuten: 500 });
    assert.equal(falsch.status, 400);
    assert.match(falsch.fehler, /zwischen 1 und 60/);

    const neu = await post(basis, "/intern/telegram/benachrichtigung", { vorlaufMinuten: 60, nachlaufMinuten: 15, arten: "reservierungen", fristReservierungMinuten: 10 });
    assert.equal(neu.ok, true);
    assert.equal(neu.fenster.heuteText, "Heute kommen Telegram-Nachrichten von 10:00 bis 14:15 und von 16:30 bis 22:15.");
    // Nach einem Neustart liest der Server dieselben Werte aus der Datei
    const gespeichert = JSON.parse(readFileSync(DATEIEN[0], "utf-8")).telegramBenachrichtigung;
    assert.equal(gespeichert.vorlaufMinuten, 60);
    assert.equal(gespeichert.arten, "reservierungen");
    assert.equal(regeln.telegramEinstellungen(ladeBetrieb(SLUG)).fristReservierungMinuten, 10);

    // Code, Verbindung, Testnachricht, Trennen je Kanal
    await post(basis, "/intern/telegram/benachrichtigung", { modus: "zwei-chats" });
    const code = await post(basis, "/v2/intern/telegram/code", { kanal: "reservierung" });
    assert.match(code.code, /^R-/);
    await befehl(`/start ${code.code}`, -300);
    let kanaele = await (await fetch(`${basis}/v2/api/telegram`)).json();
    assert.equal(kanaele.kanaele.reservierung.verbunden, true);
    assert.equal(kanaele.kanaele.bestellung.verbunden, false);
    aufrufe = [];
    const probe = await post(basis, "/v2/intern/telegram/test", { kanal: "reservierung" });
    assert.equal(probe.ok, true);
    assert.equal(gesendet()[0].daten.chat_id, "-300");
    assert.equal((await post(basis, "/v2/intern/telegram/test", { kanal: "bestellung" })).status, 400);
    await post(basis, "/v2/intern/telegram/trennen", { kanal: "reservierung" });
    kanaele = await (await fetch(`${basis}/v2/api/telegram`)).json();
    assert.equal(kanaele.kanaele.reservierung.verbunden, false);
    assert.equal(kanaele.kanaele.gemeinsam.verbunden, true, "gemeinsamer Chat bleibt erhalten");
    assert.equal((await post(basis, "/v2/intern/telegram/code", { kanal: "quatsch" })).status, 400);

    // Kopfzeile des Dashboards: Hinweis nur bei echtem Problem
    const betrieb = await (await fetch(`${basis}/api/betrieb`)).json();
    assert.equal(betrieb.telegramHinweis, "");
    assert.equal(betrieb.zeitzone, "Europe/Berlin");
  });
});

test("Gast-Statusseite verspricht keine Reaktionszeit", async () => {
  const { statusFuerGast } = await import("../src/gastStatus.js");
  const html = readFileSync(path.join(__dirname, "..", "public", "status.html"), "utf-8").replace(/\/\/.*$/gm, "");
  const r = reservieren();
  const texte = [JSON.stringify(statusFuerGast("reservierung", r, { betrieb: { name: "X", telefon: "" }, letzteAenderung: r.eingegangen })), html];
  for (const t of texte) assert.doesNotMatch(t, /innerhalb von|\b2 Minuten|zwei Minuten|sofort bestätigt|umgehend/i);
});
