import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Reiter „Telegram“ im Wirt-Dashboard (v2-Hülle) im echten Browser:
// berechnete Zeiten, Einstellungen speichern, Chat-Modus und Code, Warnung
// ohne Öffnungszeiten, Handybreite ohne Querscrollen. Telegram ist ein Mock.
// Ohne Chromium wird übersprungen.

const SLUG = "__test-telegram-reiter";
process.env.BETRIEB = SLUG;
delete process.env.WIRT_PASSWORT;
delete process.env.WIRT_OEFFENTLICHE_URL;
process.env.TELEGRAM_BOT_TOKEN = "111111:reiter-test-token";
process.env.TELEGRAM_BOT_NAME = "TrattoriaTestBot";

const store = await import("../src/betriebStore.js");
const bot = await import("../v2/integration/telegramBot.js");
const { erzeugeHandlerV2 } = await import("../v2/integration/wirtServerV2.js");
const { starteBrowser } = await import("../v2/build/browser.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);
store.uhrHook.jetzt = () => new Date("2026-09-24T18:00:00+02:00");
bot.telegramApiHook.aktuell = async () => ({ message_id: 1 });

after(() => rmSync(DATEI, { force: true }));

test("Reiter „Telegram“: Zeiten, Einstellungen, Chat-Modus, Warnung – Desktop und Handy", { timeout: 60_000 }, async (t) => {
  store.speichereBetrieb(SLUG, {
    tische: [],
    reservierungen: [],
    bestellungen: [],
    anzeigeName: "Trattoria Test",
    telegramChatId: "4711",
    oeffnungszeiten: [{ tage: "Dienstag – Sonntag", zeiten: "11:00 – 14:00 & 17:30 – 22:00" }, { tage: "Montag", zeiten: "Ruhetag" }],
  });
  store.legeTischAn(SLUG, { name: "Tisch 1", plaetze: 6 });
  const r = store.legeReservierungAn(SLUG, { datum: "2026-09-24", uhrzeit: "19:00", personen: 4, name: "Erika Gast" }, "online");
  await bot.benachrichtige(SLUG, { art: "reservierung", id: r.id });

  const server = createServer(await erzeugeHandlerV2({ slug: SLUG }));
  await new Promise((f) => server.listen(0, "127.0.0.1", f));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await starteBrowser();
  if (!browser) {
    server.close();
    t.skip("Kein Chromium");
    return;
  }
  const fehler = [];
  try {
    // Handy: lesbar, ohne Querscrollen
    const handy = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "de-DE" });
    const klein = await handy.newPage();
    klein.on("pageerror", (e) => fehler.push(e.message));
    await klein.goto(url);
    await klein.locator('nav button[data-tab="telegram"]').click();
    await klein.locator("#tg-zeiten .tg-heute").waitFor();
    assert.equal(await klein.locator("#tg-zeiten .tg-heute").innerText(), "Heute kommen Telegram-Nachrichten von 10:30 bis 14:30 und von 17:00 bis 22:30.");
    assert.equal(await klein.evaluate(() => document.documentElement.scrollWidth), 390);
    await handy.close();

    const k = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE" });
    const tab = await k.newPage();
    tab.on("pageerror", (e) => fehler.push(e.message));
    const dialoge = [];
    tab.on("dialog", (d) => {
      dialoge.push(d.message());
      d.accept();
    });
    await tab.goto(url);

    // Stand am Vorgang (Reservierungen-Reiter; „heute“ des Dashboards ist die echte Uhr)
    await tab.locator("#tag").fill("2026-09-24");
    await tab.locator("#tag").dispatchEvent("change");
    assert.match(await tab.locator(".tg-vorgang").first().innerText(), /Telegram: gemeldet 18:00 · Erinnerung geplant/);

    await tab.locator('nav button[data-tab="telegram"]').click();
    await tab.locator("#tg-zeiten .tg-heute").waitFor();
    assert.match(await tab.locator("#tg-zeiten").innerText(), /Jetzt: Benachrichtigungen aktiv bis heute 22:30 Uhr/);
    assert.match(await tab.locator("#tg-zeiten").innerText(), /Mo 28\.09\.\s+keine Nachrichten \(geschlossen\)/);
    assert.equal(await tab.locator('input[name="tg-zeitfenster"][value="oeffnungszeiten"]').isChecked(), true, "Standard: nach Öffnungszeiten");
    assert.equal(await tab.locator("#tg-frist-res").inputValue(), "2");

    // Vorlauf ändern → neue Zeiten sofort sichtbar
    await tab.locator("#tg-vorlauf").fill("60");
    await tab.locator('#tg-form button[type="submit"]').click();
    await tab.locator("#toast.sichtbar").waitFor();
    assert.equal(await tab.locator("#tg-zeiten .tg-heute").innerText(), "Heute kommen Telegram-Nachrichten von 10:00 bis 14:30 und von 16:30 bis 22:30.");

    // Rund um die Uhr nur mit Rückfrage
    await tab.locator('input[name="tg-zeitfenster"][value="rund-um-die-uhr"]').check();
    await tab.locator('#tg-form button[type="submit"]').click();
    await tab.locator("#tg-zeiten .tg-heute", { hasText: "rund um die Uhr" }).waitFor();
    assert.ok(dialoge.some((d) => /Rund um die Uhr/.test(d)));
    await tab.locator('input[name="tg-zeitfenster"][value="oeffnungszeiten"]').check();
    await tab.locator('#tg-form button[type="submit"]').click();
    await tab.locator("#tg-zeiten .tg-heute", { hasText: "10:00 bis 14:30" }).waitFor();

    // Zwei Chats: Code für den Bestell-Chat, bisherigen Chat für Reservierungen übernehmen
    await tab.locator('input[name="tg-modus"][value="zwei-chats"]').check();
    await tab.locator("#tg-modus-speichern").click();
    await tab.locator('[data-tg-code="bestellung"]').waitFor();
    await tab.locator('[data-tg-code="bestellung"]').click();
    await tab.locator(".tg-code", { hasText: "/start B-" }).waitFor();
    assert.match(await tab.locator("#tg-chats").innerText(), /direkt im Bot öffnen/);
    await tab.locator('[data-tg-uebernehmen="reservierung"]').click();
    await tab.locator('[data-tg-test="reservierung"]').waitFor();
    assert.equal(await tab.locator('input[name="tg-modus"][value="zwei-bots"]').isDisabled(), true, "ohne eigene Tokens nicht wählbar");

    // Ohne Öffnungszeiten: deutliche Warnung, keine erfundenen Zeiten
    const d = store.ladeBetrieb(SLUG);
    delete d.oeffnungszeiten;
    store.speichereBetrieb(SLUG, d);
    await tab.reload();
    await tab.locator('nav button[data-tab="telegram"]').click();
    await tab.locator("#tg-warnungen .fehler").waitFor();
    assert.match(await tab.locator("#tg-warnungen .fehler").innerText(), /keine eigenen Öffnungszeiten/);
    assert.equal(await tab.locator("#tg-zeiten table").count(), 0);
    assert.match(await tab.locator("#zaehler").innerText(), /Telegram/, "Hinweis in der Kopfzeile");
    await k.close();
  } finally {
    await browser.close();
    await new Promise((f) => server.close(f));
  }
  assert.deepEqual(fehler, []);
});
