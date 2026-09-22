import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, mkdtempSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Stage 7d – Ende-zu-Ende über die ganze Kette, die ein Gast auslöst:
//
//   v2-Seite für einen synthetischen Test-Lead bauen (Zyklus ohne Judge)
//   → Seite im Browser öffnen, Reservierungsformular ausfüllen, absenden
//   → Reservierung steht im Wirt-Dashboard (/api/betrieb des v2-Wirt-Servers)
//   → Telegram-Nachricht mit Knöpfen wäre an den verknüpften Chat gegangen
//     (gemockter API-Aufruf, kein echter Versand)
//
// Ohne Chromium wird derselbe Aufruf abgesetzt, den das Seitenskript beim
// Absenden macht (Nutzlast aus dem Formular der gebauten Seite gelesen).

const SLUG = "__test-v2-e2e";
process.env.BETRIEB = SLUG;
delete process.env.V2_COPY_LLM;

const { speichereBetrieb, legeTischAn } = await import("../src/betriebStore.js");
const { erzeugeHandlerV2 } = await import("../v2/integration/wirtServerV2.js");
const { erzeugeVerknuepfungscode } = await import("../v2/integration/wirtAdapter.js");
const bot = await import("../v2/integration/telegramBot.js");
const { baueImZyklus } = await import("../v2/build/zyklus.js");
const { testLeadFuer } = await import("../v2/build/testLeads.js");
const { starteBrowser } = await import("../v2/build/browser.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BETRIEB_DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);
const ZIEL = mkdtempSync(path.join(tmpdir(), "v2-e2e-"));

after(() => {
  rmSync(BETRIEB_DATEI, { force: true });
  rmSync(ZIEL, { recursive: true, force: true });
});

function starte(handler) {
  const server = createServer(handler);
  return new Promise((fertig) => server.listen(0, "127.0.0.1", () => fertig({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

function statisch(wurzel) {
  return (req, res) => {
    const pfad = path.join(wurzel, decodeURIComponent(new URL(req.url, "http://x").pathname));
    const datei = existsSync(pfad) && statSync(pfad).isDirectory() ? path.join(pfad, "index.html") : pfad;
    if (!datei.startsWith(wurzel) || !existsSync(datei)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": datei.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream" });
    res.end(readFileSync(datei));
  };
}

async function warteAuf(pruefung, ms = 5000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) {
    if (pruefung()) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return false;
}

test("E2E: v2-Seite → Reservierungsformular → Wirt-Dashboard → Telegram (Mock)", { timeout: 120_000 }, async () => {
  // Betrieb mit Tischplan, Telegram-Chat per Code verknüpft
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
  legeTischAn(SLUG, { name: "Stammtisch", plaetze: 8 });

  const altToken = process.env.TELEGRAM_BOT_TOKEN;
  const altHook = bot.telegramApiHook.aktuell;
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  const aufrufe = [];
  bot.telegramApiHook.aktuell = async (methode, daten) => {
    aufrufe.push({ methode, daten });
    return { message_id: aufrufe.length };
  };

  const wirt = await starte(await erzeugeHandlerV2({ slug: SLUG }));
  let seite = null;
  let browser = null;
  try {
    const { code } = erzeugeVerknuepfungscode(SLUG);
    await bot.verarbeiteUpdate({ message: { chat: { id: 31337 }, text: `/start ${code}` } }, { betriebe: [SLUG] });

    // 1. v2-Seite bauen – die API-Adresse zeigt auf den laufenden Wirt-Server
    const lead = { ...testLeadFuer("italienisch", "trattoria"), placeId: "v2-e2e", slug: SLUG };
    const { protokoll } = await baueImZyklus({
      lead,
      kueche: "italienisch",
      stimmung: "trattoria",
      judge: false,
      offline: true,
      zielDir: ZIEL,
      slug: "e2e",
      optionen: { apiUrl: wirt.url },
    });
    assert.equal(protokoll.ergebnis, "ohne-judge");
    const html = readFileSync(path.join(ZIEL, "e2e", "index.html"), "utf-8");
    assert.ok(html.includes(wirt.url), "Seite spricht den Wirt-Server an");
    assert.match(html, /id="reservation-form"/);

    seite = await starte(statisch(ZIEL));
    const morgen = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const gast = { name: "Giulia Test", telefon: "030 555 0101", email: "giulia@example.org", wunsch: "Kinderstuhl" };

    // 2. Formular absenden – echt im Browser, sonst dieselbe Nutzlast per fetch
    browser = await starteBrowser();
    if (browser) {
      const kontext = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
      const tab = await kontext.newPage();
      await tab.goto(`${seite.url}/e2e/`, { waitUntil: "domcontentloaded" });
      const form = tab.locator("#reservation-form");
      await form.scrollIntoViewIfNeeded();
      await form.locator('[name="datum"]').fill(morgen);
      await form.locator('[name="uhrzeit"]').selectOption("19:00");
      await form.locator('[name="personen"]').selectOption({ index: 3 });
      await form.locator('[name="name"]').fill(gast.name);
      await form.locator('[name="telefon"]').fill(gast.telefon);
      await form.locator('[name="email"]').fill(gast.email);
      await form.locator('[name="wunsch"]').fill(gast.wunsch);
      await form.locator('button[type="submit"]').click();
      await tab.locator("#confirm-title").filter({ hasText: "Anfrage eingegangen" }).waitFor({ timeout: 10_000 });
      await kontext.close();
    } else {
      const personen = [...html.matchAll(/<option value="([^"]+)">[^<]*Person/g)].map((m) => m[1]);
      const antwort = await fetch(`${wirt.url}/oeffentlich/reservierung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datum: morgen, uhrzeit: "19:00", personen: parseInt(personen[2], 10), ...gast }),
      });
      assert.equal(antwort.status, 200);
    }

    // 3. Im Wirt-Dashboard sichtbar
    const uebersicht = await (await fetch(`${wirt.url}/api/betrieb`)).json();
    const r = uebersicht.reservierungen.find((x) => x.name === gast.name);
    assert.ok(r, "Reservierung erscheint im Wirt-Dashboard");
    assert.equal(r.datum, morgen);
    assert.equal(r.uhrzeit, "19:00");
    assert.equal(r.personen, 3);
    assert.equal(r.wunsch, gast.wunsch);
    assert.equal(r.quelle, "online");
    assert.equal(uebersicht.offeneReservierungen, 1);

    // 4. Telegram hätte gesendet – an den verknüpften Chat, mit Knöpfen
    assert.ok(await warteAuf(() => aufrufe.some((a) => a.methode === "sendMessage" && a.daten.text.includes(gast.name))), "Telegram-Nachricht ausgelöst");
    const nachricht = aufrufe.find((a) => a.methode === "sendMessage" && a.daten.text.includes(gast.name));
    assert.equal(nachricht.daten.chat_id, "31337");
    assert.match(nachricht.daten.text, /3 Personen/);
    assert.equal(nachricht.daten.reply_markup.inline_keyboard[0][0].callback_data, `r:ok:${r.id}`);

    // 5. Bestätigen aus Telegram → Dashboard zeigt „bestätigt“
    await bot.verarbeiteUpdate({ callback_query: { id: "k", data: `r:ok:${r.id}`, message: { chat: { id: 31337 }, message_id: 1 } } }, { betriebe: [SLUG] });
    const danach = await (await fetch(`${wirt.url}/api/betrieb`)).json();
    assert.equal(danach.reservierungen.find((x) => x.id === r.id).status, "bestaetigt");
  } finally {
    await browser?.close();
    if (seite) await new Promise((f) => seite.server.close(f));
    await new Promise((f) => wirt.server.close(f));
    bot.telegramApiHook.aktuell = altHook;
    if (altToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = altToken;
  }
});
