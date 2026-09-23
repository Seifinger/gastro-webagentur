import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, mkdtempSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Ende-zu-Ende auf den komponierten Pilotseiten (Art-Direction-Runde):
//
//   Pilotseite mit API-Adresse bauen → im Browser reservieren UND bestellen
//   → beides im Wirt-Dashboard (/api/betrieb) → Telegram-Nachricht mit
//   Knöpfen (gemockte API, kein echter Versand) → Bestätigen per Telegram.
//
// Damit ist gezeigt, dass die neue Komposition die Schnittstellen von v1/v2
// (Reservierung, Bestellung, No-Show-Feld, Telegram) unverändert bedient.

const SLUG = "__test-v2-art-e2e";
process.env.BETRIEB = SLUG;
delete process.env.V2_COPY_LLM;

const { speichereBetrieb, legeTischAn } = await import("../src/betriebStore.js");
const { erzeugeHandlerV2 } = await import("../v2/integration/wirtServerV2.js");
const { erzeugeVerknuepfungscode } = await import("../v2/integration/wirtAdapter.js");
const bot = await import("../v2/integration/telegramBot.js");
const { ladeBriefing } = await import("../v2/briefing/briefing.js");
const { ladeCreativeDirection } = await import("../v2/creative/creativeDirection.js");
const { schreibeKomponierteSite } = await import("../v2/build/komposition/builder.js");
const { starteBrowser } = await import("../v2/build/browser.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BETRIEB_DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);
const ZIEL = mkdtempSync(path.join(tmpdir(), "v2-art-e2e-"));
const FONTS = path.join(__dirname, "..", "v2", "output", "assets");

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
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const pfad = rel.startsWith("/assets/") ? path.join(FONTS, rel.slice("/assets/".length)) : path.join(wurzel, rel);
    const datei = existsSync(pfad) && statSync(pfad).isDirectory() ? path.join(pfad, "index.html") : pfad;
    if (!existsSync(datei)) {
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
    if (await pruefung()) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return false;
}

test("E2E Pilotseiten: Reservierung (Trattoria) und Bestellung (Rösterei) bis Wirt-Dashboard und Telegram", { timeout: 180_000 }, async (t) => {
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
  legeTischAn(SLUG, { name: "Fenster", plaetze: 6 });

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
    await bot.verarbeiteUpdate({ message: { chat: { id: 4242 }, text: `/start ${code}` } }, { betriebe: [SLUG] });

    for (const slug of ["pilot-trattoria-nonna-lucia", "pilot-roesterei-kornfeld"]) {
      const { html } = schreibeKomponierteSite({ briefing: ladeBriefing(slug), cd: ladeCreativeDirection(slug), optionen: { apiUrl: wirt.url, fontsPfad: "/assets/fonts" } }, { zielDir: ZIEL });
      assert.ok(html.includes(wirt.url), `${slug} spricht den Wirt-Server an`);
    }
    seite = await starte(statisch(ZIEL));
    browser = await starteBrowser();
    if (!browser) {
      t.diagnostic("Kein Chromium – Browser-Teil übersprungen");
      return;
    }
    const morgen = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    // 1. Reservierung auf der Trattoria (Hauptaktion, Formular offen) – mobil
    {
      const k = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 }, locale: "de-DE" });
      const tab = await k.newPage();
      await tab.goto(`${seite.url}/pilot-trattoria-nonna-lucia/`, { waitUntil: "domcontentloaded" });
      // mobile Navigation führt zur Reservierung
      await tab.locator(".k-menue summary").click();
      await tab.locator('.k-menue-liste a[href="#reservierung"]').click();
      const form = tab.locator("#reservation-form");
      await form.locator('[name="datum"]').fill(morgen);
      await form.locator('[name="uhrzeit"]').selectOption("19:00");
      await form.locator('[name="personen"]').selectOption({ index: 2 });
      await form.locator('[name="name"]').fill("Lucia Gast");
      await form.locator('[name="telefon"]').fill("030 555 0201");
      await form.locator('button[type="submit"]').click();
      await tab.locator("#confirm-title").filter({ hasText: "Anfrage eingegangen" }).waitFor({ timeout: 10_000 });
      await k.close();
    }

    // 2. Abholbestellung auf der Rösterei (Karte → Warenkorb → Bestellung) – Desktop
    {
      const k = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 }, locale: "de-DE" });
      const tab = await k.newPage();
      await tab.goto(`${seite.url}/pilot-roesterei-kornfeld/`, { waitUntil: "domcontentloaded" });
      await tab.locator('#karte [data-name="Cappuccino"]').click();
      await tab.locator("#drawer.open").waitFor({ timeout: 4000 });
      const f = tab.locator("#order-form");
      await f.locator('[name="abholzeit"]').selectOption({ index: 1 });
      await f.locator('[name="name"]').fill("Kornfeld Gast");
      await f.locator('[name="telefon"]').fill("030 555 0202");
      const noshow = tab.locator("#ord-noshow");
      if (await noshow.isVisible()) await noshow.check();
      await tab.locator("#order-submit").click();
      await tab.locator("#confirm.open").waitFor({ timeout: 10_000 });
      await k.close();
    }

    // 3. Beides im Wirt-Dashboard
    const uebersicht = await (await fetch(`${wirt.url}/api/betrieb`)).json();
    const r = uebersicht.reservierungen.find((x) => x.name === "Lucia Gast");
    assert.ok(r, "Reservierung im Wirt-Dashboard");
    assert.equal(r.uhrzeit, "19:00");
    const b = uebersicht.bestellungen.find((x) => x.name === "Kornfeld Gast");
    assert.ok(b, "Bestellung im Wirt-Dashboard");
    assert.ok(JSON.stringify(b).includes("Cappuccino"));

    // 4. Telegram (Mock) für beide, mit Knöpfen; Bestätigen wirkt zurück
    assert.ok(await warteAuf(() => aufrufe.some((a) => a.methode === "sendMessage" && a.daten.text.includes("Lucia Gast"))));
    assert.ok(await warteAuf(() => aufrufe.some((a) => a.methode === "sendMessage" && a.daten.text.includes("Kornfeld Gast"))));
    const nachricht = aufrufe.find((a) => a.methode === "sendMessage" && a.daten.text.includes("Lucia Gast"));
    assert.equal(nachricht.daten.chat_id, "4242");
    await bot.verarbeiteUpdate({ callback_query: { id: "k", data: nachricht.daten.reply_markup.inline_keyboard[0][0].callback_data, message: { chat: { id: 4242 }, message_id: 1 } } }, { betriebe: [SLUG] });
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
