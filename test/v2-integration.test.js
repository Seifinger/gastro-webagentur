import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Stage 7: Wirt-Adapter, Telegram-Bot (gemockt), Wirt-Hülle und Dashboard-
// Anbindung. Alles läuft auf einem synthetischen Betrieb – echte Dateien in
// data/betrieb/ werden nie gelesen oder geschrieben (alle Bot-Aufrufe
// bekommen die Betriebsliste ausdrücklich übergeben).
const SLUG = "__test-v2-integration";
process.env.BETRIEB = SLUG;
const ENGINE_TMP = mkdtempSync(path.join(tmpdir(), "v2-engine-"));
process.env.V2_ENGINE_DATEI = path.join(ENGINE_TMP, "engine.json");

const { speichereBetrieb, legeTischAn, legeReservierungAn, legeBestellungAn, ladeBetrieb, uhrHook } = await import("../src/betriebStore.js");

// Feste Uhr (Donnerstag, 24.09.2026, 17:00 Berlin): Die Bestellungen hier
// wünschen 18:00/18:30 – das muss unabhängig von der Tageszeit des Testlaufs
// eine angebotene Abholzeit sein (Prüfung in legeBestellungAn).
uhrHook.jetzt = () => new Date("2026-09-24T17:00:00+02:00");
const adapter = await import("../v2/integration/wirtAdapter.js");
const bot = await import("../v2/integration/telegramBot.js");
const { erzeugeHandlerV2, wirtThemeCss, themeWirtHtml } = await import("../v2/integration/wirtServerV2.js");
const dashboardV2 = await import("../v2/integration/dashboardV2.js");
const { ladeDesignsystem } = await import("../v2/build/designsystemGenerator.js");
const { contrastRatio } = await import("../src/colorMath.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);
const BETRIEBE = [SLUG];
const morgen = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

// Eigene Öffnungszeiten: Telegram meldet nur in den Telegram-Zeiten
// (Öffnung ± 30 Minuten). Um 17:00 (feste Uhr) ist das Fenster offen.
const OEFFNUNGSZEITEN = [{ tage: "Montag – Sonntag", zeiten: "11:00 – 23:00" }];

beforeEach(() => {
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [], oeffnungszeiten: OEFFNUNGSZEITEN });
  legeTischAn(SLUG, { name: "Tisch 1", plaetze: 6 });
  bot.setzeCodeBremseZurueck();
});

after(() => {
  rmSync(DATEI, { force: true });
  rmSync(ENGINE_TMP, { recursive: true, force: true });
});

function mitTelegram(fn) {
  return async () => {
    const altToken = process.env.TELEGRAM_BOT_TOKEN;
    const altHook = bot.telegramApiHook.aktuell;
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    const aufrufe = [];
    bot.telegramApiHook.aktuell = async (methode, daten) => {
      aufrufe.push({ methode, daten });
      return methode === "getUpdates" ? [] : { message_id: aufrufe.length };
    };
    try {
      await fn(aufrufe);
    } finally {
      bot.telegramApiHook.aktuell = altHook;
      if (altToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = altToken;
    }
  };
}

async function verknuepfe(chatId = 4711) {
  const { code } = adapter.erzeugeVerknuepfungscode(SLUG);
  await bot.verarbeiteUpdate({ message: { chat: { id: chatId }, text: `/start ${code}` } }, { betriebe: BETRIEBE });
}

/* ---------------- Adapter ---------------- */

test("Adapter: Betrieb ohne v2-Felder bekommt Standardwerte, ohne dass geschrieben wird", () => {
  const vorher = readFileSync(DATEI, "utf-8");
  const d = adapter.ladeBetriebV2(SLUG);
  assert.equal(d.v2Design, null);
  assert.equal(d.telegramV2.tagesuebersicht, true);
  assert.equal(d.telegramV2.uhrzeit, "09:00");
  assert.equal(readFileSync(DATEI, "utf-8"), vorher, "Lesen darf die Datei nicht verändern");
  assert.deepEqual(adapter.telegramStatus(SLUG).verknuepft, false);
});

test("Adapter: Küchenstatus Neu → In Zubereitung → Bereit → Abgeholt hält v1-Status konsistent", () => {
  const b = legeBestellungAn(SLUG, { positionen: [{ name: "Brezn", menge: 2, preis: 3 }], name: "Test", abholzeit: "18:30" });
  assert.equal(adapter.kuechenStatusVon(b), "neu");
  const zub = adapter.setzeKuechenStatus(SLUG, b.id, "in-zubereitung");
  assert.equal(zub.status, "bestaetigt", "v1 sieht die Bestellung als bestätigt");
  assert.equal(zub.bestaetigteAbholzeit, "18:30");
  assert.equal(adapter.kuechenStatusVon(zub), "in-zubereitung");
  const bereit = adapter.setzeKuechenStatus(SLUG, b.id, "bereit");
  assert.equal(adapter.kuechenStatusVon(bereit), "bereit");
  const weg = adapter.setzeKuechenStatus(SLUG, b.id, "abgeholt");
  assert.equal(weg.status, "abgeholt");
  assert.ok(weg.tatsaechlichFertigUm, "Wartezeit-Lernen bekommt seinen Zeitpunkt");
  assert.throws(() => adapter.setzeKuechenStatus(SLUG, b.id, "quatsch"));
});

test("Adapter: Verknüpfungscode ist einmalig, läuft ab und nutzt das v1-Feld telegramChatId", () => {
  const { code } = adapter.erzeugeVerknuepfungscode(SLUG);
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal(adapter.loeseCodeEin(code, 99, { betriebe: BETRIEBE, jetzt: new Date(Date.now() + 31 * 60_000) }), null, "nach 30 Minuten ungültig");
  assert.equal(adapter.loeseCodeEin(code, 99, { betriebe: BETRIEBE }), SLUG);
  assert.equal(ladeBetrieb(SLUG).telegramChatId, "99");
  assert.equal(adapter.loeseCodeEin(code, 100, { betriebe: BETRIEBE }), null, "Code ist verbraucht");
  adapter.trenneTelegram(SLUG);
  assert.equal(ladeBetrieb(SLUG).telegramChatId, "");
});

/* ---------------- Telegram ---------------- */

test(
  "Telegram: ohne verknüpften Chat wird nichts gesendet (Fallback „kein Telegram verknüpft“)",
  mitTelegram(async (aufrufe) => {
    const r = legeReservierungAn(SLUG, { datum: morgen(), uhrzeit: "19:00", personen: 2, name: "Ohne Chat" });
    const ergebnis = await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
    assert.equal(ergebnis.gesendet, false);
    assert.match(ergebnis.grund, /kein Telegram/);
    assert.equal(aufrufe.length, 0);
  }),
);

test(
  "Telegram: /start CODE verknüpft, neue Reservierung kommt mit Knöpfen, Bestätigen per Knopf",
  mitTelegram(async (aufrufe) => {
    await verknuepfe(4711);
    assert.match(aufrufe.at(-1).daten.text, /Verbunden/);
    const r = legeReservierungAn(SLUG, { datum: morgen(), uhrzeit: "19:00", personen: 4, name: "Frau Huber", wunsch: "Fensterplatz" });
    const ergebnis = await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
    assert.deepEqual(ergebnis, { gesendet: true });
    const push = aufrufe.at(-1);
    assert.equal(push.methode, "sendMessage");
    assert.equal(push.daten.chat_id, "4711");
    assert.match(push.daten.text, /4 Personen/);
    assert.ok(push.daten.text.includes(r.nummer), "Referenznummer statt Name");
    assert.doesNotMatch(push.daten.text, /Frau Huber|Fensterplatz/, "keine Gastdaten in Telegram");
    assert.equal(push.daten.reply_markup.inline_keyboard[0][0].callback_data, `r:ok:${r.id}`);

    const antwort = await bot.verarbeiteUpdate(
      { callback_query: { id: "cb1", data: `r:ok:${r.id}`, message: { chat: { id: 4711 }, message_id: 5 } } },
      { betriebe: BETRIEBE },
    );
    assert.equal(antwort.aktion, "r:ok");
    assert.equal(ladeBetrieb(SLUG).reservierungen[0].status, "bestaetigt");
    assert.ok(aufrufe.some((a) => a.methode === "editMessageText" && /bestätigt/.test(a.daten.text)));
    assert.ok(aufrufe.some((a) => a.methode === "answerCallbackQuery"));
  }),
);

test(
  "Telegram: Bestellung durchläuft Neu → In Zubereitung → Bereit → Abgeholt per Knopf",
  mitTelegram(async (aufrufe) => {
    await verknuepfe(4711);
    const b = legeBestellungAn(SLUG, { positionen: [{ name: "Schnitzel", menge: 1, preis: 16.5 }], name: "Herr Maier", abholzeit: "18:00" });
    await bot.benachrichtige(SLUG, { art: "bestellung", id: b.id });
    const knopf = (daten) => bot.verarbeiteUpdate({ callback_query: { id: "x", data: daten, message: { chat: { id: 4711 }, message_id: 1 } } }, { betriebe: BETRIEBE });
    assert.ok(aufrufe.at(-1).daten.text.includes(b.nummer));
    assert.doesNotMatch(aufrufe.at(-1).daten.text, /16,50 €|Schnitzel|Herr Maier/, "keine Summe, Positionen oder Namen");
    assert.equal(aufrufe.at(-1).daten.reply_markup.inline_keyboard[0][0].callback_data, `b:zub:${b.id}`);
    await knopf(`b:zub:${b.id}`);
    await knopf(`b:bereit:${b.id}`);
    let jetzt = ladeBetrieb(SLUG).bestellungen[0];
    assert.equal(adapter.kuechenStatusVon(jetzt), "bereit");
    assert.match(aufrufe.filter((a) => a.methode === "editMessageText").at(-1).daten.text, /Bereit zur Abholung/);
    await knopf(`b:weg:${b.id}`);
    jetzt = ladeBetrieb(SLUG).bestellungen[0];
    assert.equal(jetzt.status, "abgeholt");
  }),
);

test(
  "Telegram: Gruppen-Chat mit /start@BotName CODE und negativer Chat-ID",
  mitTelegram(async (aufrufe) => {
    const { code } = adapter.erzeugeVerknuepfungscode(SLUG);
    const antwort = await bot.verarbeiteUpdate({ message: { chat: { id: -100123 }, text: `/start@MeinLokalBot ${code}` } }, { betriebe: BETRIEBE });
    assert.deepEqual(antwort, { aktion: "verknuepft", slug: SLUG });
    assert.equal(ladeBetrieb(SLUG).telegramChatId, "-100123");
    await bot.verarbeiteUpdate({ message: { chat: { id: -100123 }, text: "/heute@MeinLokalBot" } }, { betriebe: BETRIEBE });
    assert.match(aufrufe.at(-1).daten.text, /Heute/);
  }),
);

test(
  "Telegram: fremder Chat darf keine Knöpfe eines Betriebs auslösen",
  mitTelegram(async (aufrufe) => {
    await verknuepfe(4711);
    const r = legeReservierungAn(SLUG, { datum: morgen(), uhrzeit: "12:00", personen: 2, name: "X" });
    const antwort = await bot.verarbeiteUpdate({ callback_query: { id: "cb", data: `r:ab:${r.id}`, message: { chat: { id: 666 }, message_id: 1 } } }, { betriebe: BETRIEBE });
    assert.equal(antwort.aktion, "verweigert");
    assert.equal(ladeBetrieb(SLUG).reservierungen[0].status, "neu");
    assert.ok(aufrufe.at(-1).methode === "answerCallbackQuery");
  }),
);

test(
  "Telegram: Tagesübersicht einmal pro Tag zur eingestellten Uhrzeit (Zeitzone des Betriebs), nur im Zeitfenster, abschaltbar",
  mitTelegram(async (aufrufe) => {
    await verknuepfe(4711);
    // Dienstag, 12.05.2031 – geöffnet 11:00–23:00, Fenster ab 10:30
    const um = (hhmm) => new Date(`2031-05-12T${hhmm}:00+02:00`);
    const r1 = legeReservierungAn(SLUG, { datum: "2031-05-12", uhrzeit: "19:30", personen: 3, name: "Abend" });
    const r2 = legeReservierungAn(SLUG, { datum: "2031-05-12", uhrzeit: "12:00", personen: 2, name: "Mittag" });
    adapter.setzeTagesuebersicht(SLUG, { uhrzeit: "09:00" });
    assert.deepEqual(await bot.sendeFaelligeUebersichten(um("08:59"), BETRIEBE), [], "vor 09:00 nicht");
    assert.deepEqual(await bot.sendeFaelligeUebersichten(um("09:05"), BETRIEBE), [], "09:05 liegt vor dem Zeitfenster (ab 10:30)");
    assert.deepEqual(await bot.sendeFaelligeUebersichten(um("10:30"), BETRIEBE), [SLUG], "kommt mit Beginn des Fensters");
    const text = aufrufe.at(-1).daten.text;
    assert.match(text, /12\.05\.2031/);
    assert.match(text, /Reservierungen: 2 \(5 Gäste\)/);
    assert.ok(text.indexOf(r2.nummer) < text.indexOf(r1.nummer), "chronologisch");
    assert.doesNotMatch(text, /Mittag|Abend/, "keine Namen");
    assert.deepEqual(await bot.sendeFaelligeUebersichten(um("11:00"), BETRIEBE), [], "nur einmal am Tag");
    adapter.setzeTagesuebersicht(SLUG, { aktiv: false });
    assert.deepEqual(await bot.sendeFaelligeUebersichten(new Date("2031-05-13T12:00:00+02:00"), BETRIEBE), []);
    assert.throws(() => adapter.setzeTagesuebersicht(SLUG, { uhrzeit: "9 Uhr" }));
    assert.throws(() => adapter.setzeTagesuebersicht(SLUG, { uhrzeit: "25:00" }));
  }),
);

test(
  "Telegram: ein Fehler beim Versand wirft nie",
  mitTelegram(async () => {
    await verknuepfe(4711);
    bot.telegramApiHook.aktuell = async () => {
      throw new Error("Telegram down");
    };
    const r = legeReservierungAn(SLUG, { datum: morgen(), uhrzeit: "19:00", personen: 2, name: "Y" });
    const ergebnis = await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });
    assert.equal(ergebnis.gesendet, false);
    assert.match(ergebnis.grund, /Telegram down/);
  }),
);

/* ---------------- Wirt-Hülle ---------------- */

test("Wirt-Theme: Rollen des Designsystems landen in den wirt.html-Variablen und bestehen AA", () => {
  const ds = ladeDesignsystem("bayerisch", "kellerstube");
  const css = wirtThemeCss(ds);
  const r = ds.farben.rollen;
  assert.ok(css.includes(`--bg: ${r.grund.hex}`));
  assert.ok(css.includes(`--accent: ${r.akzent.hex}`));
  assert.ok(css.includes(ds.typografie.display.familie));
  assert.ok(contrastRatio(r.text.hex, r.flaeche.hex) >= 4.5);
  assert.ok(contrastRatio(r.textLeise.hex, r.flaeche.hex) >= 4.5);
  assert.ok(contrastRatio(r.aufAkzent.hex, r.akzent.hex) >= 4.5);
  const html = themeWirtHtml("<html><head></head><body><div id=\"telegram-block\"></div></body></html>", ds);
  assert.match(html, /<style id="v2-betriebs-theme">/);
  assert.match(html, /window\.wirtV2 = \{ telegram: true \}/, "Die Seite weiß, dass der Bot (Codes, Chat-Modi) verfügbar ist");
  // Ohne Design bleibt wirt.html optisch v1 – nur der Hinweis auf den Bot kommt dazu.
  const ohneDesign = themeWirtHtml("<head></head><body></body>", null);
  assert.doesNotMatch(ohneDesign, /v2-betriebs-theme/);
  assert.match(ohneDesign, /window\.wirtV2/);
});

async function mitWirtServer(fn) {
  const handler = await erzeugeHandlerV2({ slug: SLUG });
  const server = createServer(handler);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

async function warteAuf(pruefung, ms = 3000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) {
    if (pruefung()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

test(
  "Wirt-Hülle: Design setzen, gethemtes Dashboard, v1-Endpunkte und Telegram-Push nach Reservierung",
  mitTelegram(async (aufrufe) =>
    mitWirtServer(async (basis) => {
      const design = await (await fetch(`${basis}/v2/intern/design`, { method: "POST", body: JSON.stringify({ kueche: "japanisch", stimmung: "omakase" }) })).json();
      assert.deepEqual(design.design, { kueche: "japanisch", stimmung: "omakase" });
      const seite = await (await fetch(basis)).text();
      const ds = ladeDesignsystem("japanisch", "omakase");
      assert.ok(seite.includes(`--accent: ${ds.farben.rollen.akzent.hex}`));
      const schrift = seite.match(/url\('(\/v2\/assets\/fonts\/[^']+\.woff2)'\)/);
      assert.ok(schrift, "Schriften werden über die Hülle ausgeliefert");
      assert.equal((await fetch(`${basis}${schrift[1]}`)).status, 200);

      const { code } = await (await fetch(`${basis}/v2/intern/telegram/code`, { method: "POST" })).json();
      await bot.verarbeiteUpdate({ message: { chat: { id: 812 }, text: `/start ${code}` } }, { betriebe: BETRIEBE });
      assert.equal((await (await fetch(`${basis}/v2/api/telegram`)).json()).verknuepft, true);

      const antwort = await fetch(`${basis}/oeffentlich/reservierung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datum: morgen(), uhrzeit: "19:00", personen: 2, name: "Gast Hülle", telefon: "030 1" }),
      });
      assert.equal(antwort.status, 200);
      const { nummer } = (await antwort.json()).reservierung;
      assert.ok(await warteAuf(() => aufrufe.some((a) => a.methode === "sendMessage" && a.daten.text.includes(nummer))));
      assert.ok(!aufrufe.some((a) => /Gast Hülle|030 1/.test(a.daten.text ?? "")), "keine Gastdaten in Telegram");
      const uebersicht = await (await fetch(`${basis}/api/betrieb`)).json();
      assert.equal(uebersicht.reservierungen[0].name, "Gast Hülle");

      // Abgelehnte Anfrage (kein Tisch frei) löst keinen Push aus
      const vorher = aufrufe.length;
      const zuViele = await fetch(`${basis}/oeffentlich/reservierung`, { method: "POST", body: JSON.stringify({ datum: morgen(), uhrzeit: "19:00", personen: 40, name: "Zu viele" }) });
      assert.equal(zuViele.status, 400);
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(aufrufe.length, vorher);

      const kuechenstatus = await fetch(`${basis}/v2/intern/bestellung/kuechenstatus`, { method: "POST", body: JSON.stringify({ id: "gibt-es-nicht", status: "bereit" }) });
      assert.equal(kuechenstatus.status, 400);
    }),
  ),
);

/* ---------------- Agentur-Dashboard ---------------- */

test("Dashboard: Engine-Wahl global und je Lead, ungültige Werte werden abgelehnt", () => {
  assert.equal(dashboardV2.ladeEngineWahl().standard, "v2", "ohne Datei gilt v2 – kein stiller Rückfall auf v1 (AP11)");
  dashboardV2.speichereEngineWahl({ standard: "v2" });
  dashboardV2.speichereEngineWahl({ placeId: "p-1", engine: "v1" });
  const wahl = dashboardV2.ladeEngineWahl();
  assert.equal(dashboardV2.engineFuerLead("p-1", wahl), "v1");
  assert.equal(dashboardV2.engineFuerLead("p-2", wahl), "v2");
  dashboardV2.speichereEngineWahl({ placeId: "p-1", engine: "" });
  assert.equal(dashboardV2.engineFuerLead("p-1"), "v2", "leer = zurück auf Standard");
  assert.throws(() => dashboardV2.speichereEngineWahl({ standard: "v3" }));
  const [lead] = dashboardV2.ergaenzeLeadsV2([{ placeId: "p-9", slug: "__nicht-gebaut", entwurf: "/entwurf/x/" }]);
  assert.equal(lead.engine, "v2");
  assert.equal(lead.v2.gebaut, false);
  assert.equal(lead.entwurf, "/entwurf/x/", "ohne v2-Bau bleibt der v1-Entwurf verlinkt");
  dashboardV2.speichereEngineWahl({ standard: "v1" });
  assert.equal(dashboardV2.ladeEngineWahl().standard, "v1", "v1 bleibt wählbar");
  rmSync(process.env.V2_ENGINE_DATEI, { force: true });
});

test("Dashboard: Token-Set aus dashboard.json – eigene Schriften, keine verbotenen, keine Schatten", () => {
  const css = dashboardV2.dashboardCss();
  const ds = JSON.parse(readFileSync(path.join(__dirname, "..", "v2", "designsysteme", "dashboard.json"), "utf-8"));
  assert.ok(css.includes(`--accent: ${ds.farben.rollen.akzent.hex}`));
  assert.match(css, /Newsreader/);
  assert.doesNotMatch(css, /font-family:[^;]*\b(Inter|Roboto|system-ui)\b/);
  assert.match(css, /--shadow-card: none/);
  const html = dashboardV2.v2HtmlInjektion("<html><head></head><body></body></html>", "dashboard");
  assert.match(html, /href="\/v2\/dashboard\.css"/);
  assert.match(html, /src="\/v2\/dashboard\.js"/);
  assert.match(dashboardV2.v2HtmlInjektion("<head></head><body></body>", "bearbeiten"), /\/v2\/bearbeiten\.js/);
});

test("Dashboard: Routen im echten dashboardServer – Injektion, Token-Schutz, kein Pfad-Ausbruch", async () => {
  const { handler } = await import("../src/dashboardServer.js");
  const server = createServer(handler);
  await new Promise((fertig) => server.listen(0, "127.0.0.1", fertig));
  const basis = `http://127.0.0.1:${server.address().port}`;
  const alterToken = process.env.DASHBOARD_TOKEN;
  try {
    const start = await (await fetch(basis)).text();
    assert.match(start, /\/v2\/dashboard\.js/);
    assert.match(await (await fetch(`${basis}/bearbeiten.html`)).text(), /\/v2\/bearbeiten\.js/);
    assert.equal((await fetch(`${basis}/v2/dashboard.css`)).headers.get("content-type"), "text/css; charset=utf-8");
    const status = await (await fetch(`${basis}/api/v2/status`)).json();
    assert.ok(["v1", "v2"].includes(status.standard));
    assert.equal((await fetch(`${basis}/v2/designsysteme/bayerisch--kellerstube.md`)).status, 200);
    assert.equal((await fetch(`${basis}/v2/designsysteme/%2e%2e%2f%2e%2e%2fpackage.json`)).status, 404);
    assert.equal((await fetch(`${basis}/api/v2/lead/__gibt-es-nicht`)).status, 404);
    const leads = await (await fetch(`${basis}/api/leads`)).json();
    assert.ok(leads.leads.every((l) => l.engine === "v1" || l.engine === "v2"));

    process.env.DASHBOARD_TOKEN = "geheim";
    const ohne = await fetch(`${basis}/intern/v2/engine`, { method: "POST", body: JSON.stringify({ standard: "v2" }) });
    assert.equal(ohne.status, 401, "/intern/v2/* hängt am selben Token wie v1");
    assert.equal(dashboardV2.ladeEngineWahl().standard, "v2", "abgelehnt: nichts gespeichert, es bleibt beim Standard");
    const ausdruckOhne = await fetch(`${basis}/intern/v2/lead/x/ausdruck`, { method: "POST", body: JSON.stringify({ ausdruck: "kino" }) });
    assert.equal(ausdruckOhne.status, 401, "Ausdruck-Wahl hängt am selben Token");
  } finally {
    if (alterToken === undefined) delete process.env.DASHBOARD_TOKEN;
    else process.env.DASHBOARD_TOKEN = alterToken;
    await new Promise((fertig) => server.close(fertig));
  }
});
