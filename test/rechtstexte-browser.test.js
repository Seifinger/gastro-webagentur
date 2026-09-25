import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, mkdtempSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Formulare im Browser (Desktop und Mobil): ohne Bedingungen, mit
// Bedingungen, No-Show aus und an. Dazu Statistik- und Rechtstexte-Reiter
// im Wirt-Dashboard. Ohne Chromium wird übersprungen.

const SLUG = "__test-rechtstexte-browser";
process.env.BETRIEB = SLUG;
delete process.env.V2_COPY_LLM;
delete process.env.WIRT_PASSWORT;

const { handler } = await import("../src/wirtServer.js");
const store = await import("../src/betriebStore.js");
const { gibFreigabeTextFrei, gibNoShowRegelFrei } = await import("./hilfen/rechtstexte.js");
const { baueImZyklus } = await import("../v2/build/zyklus.js");
const { testLeadFuer } = await import("../v2/build/testLeads.js");
const { starteBrowser } = await import("../v2/build/browser.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);
const ZIEL = mkdtempSync(path.join(tmpdir(), "rechtstexte-browser-"));

after(() => {
  rmSync(DATEI, { force: true });
  rmSync(ZIEL, { recursive: true, force: true });
});

function starte(h) {
  const server = createServer(h);
  return new Promise((f) => server.listen(0, "127.0.0.1", () => f({ server, url: `http://127.0.0.1:${server.address().port}` })));
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

const um = (hhmm) => new Date(`2026-09-24T${hhmm}:00+02:00`);

async function bestelle(tab) {
  await tab.waitForFunction(() => document.querySelectorAll("#ord-abholzeit option").length > 2);
  await tab.locator("[data-add]").first().click();
  await tab.locator("#drawer.open").waitFor({ timeout: 4000 });
  await tab.locator("#ord-abholzeit").selectOption({ label: "18:30 Uhr" });
  await tab.locator("#ord-name").fill("Browser Gast");
  await tab.locator("#ord-telefon").fill("0170 9999999");
}

test("Formulare mit/ohne Bedingungen, No-Show aus/an, Desktop und Mobil; Dashboard-Reiter", { timeout: 240_000 }, async (t) => {
  const browser = await starteBrowser();
  if (!browser) {
    t.skip("kein Chromium verfügbar");
    return;
  }
  store.uhrHook.jetzt = () => um("17:00");
  store.speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], anzeigeName: "Trattoria Browser", telefon: "030 1" });
  for (let i = 1; i <= 4; i += 1) store.legeTischAn(SLUG, { name: `T${i}`, plaetze: 6 });
  const wirt = await starte(handler);
  let seite = null;
  try {
    const lead = { ...testLeadFuer("italienisch", "trattoria"), placeId: "rechtstexte-browser", slug: SLUG };
    await baueImZyklus({ lead, kueche: "italienisch", stimmung: "trattoria", judge: false, offline: true, zielDir: ZIEL, slug: "live", optionen: { apiUrl: wirt.url } });
    seite = await starte(statisch(ZIEL));

    for (const [geraet, viewport] of [["Desktop", { width: 1280, height: 900 }], ["Mobil", { width: 390, height: 844 }]]) {
      store.speichereBetrieb(SLUG, { ...store.ladeBetrieb(SLUG), rechtsdokumente: [], noShowSchutzAktiv: false, bestellungen: [], reservierungen: [] });
      const kontext = await browser.newContext({ reducedMotion: "reduce", viewport, locale: "de-DE", timezoneId: "Europe/Berlin", isMobile: geraet === "Mobil", hasTouch: geraet === "Mobil" });
      await kontext.clock.install({ time: um("17:00") });
      await kontext.clock.pauseAt(um("17:00"));
      const tab = await kontext.newPage();

      /* 1. Ohne Bedingungen, No-Show aus */
      await tab.goto(`${seite.url}/live/`, { waitUntil: "domcontentloaded" });
      await bestelle(tab);
      assert.equal(await tab.locator("#order-submit").textContent(), "Zahlungspflichtig bestellen", geraet);
      assert.equal(await tab.locator("#ord-bedingungen-feld").isVisible(), false, `${geraet}: keine Bedingungen-Checkbox`);
      assert.equal(await tab.locator("#ord-noshow-feld").isVisible(), false, `${geraet}: keine No-Show-Checkbox`);
      assert.ok(await tab.locator("#ord-rechtliches a[href$='/rechtstexte/datenschutz']").isVisible(), `${geraet}: Datenschutz-Link sichtbar`);
      assert.match(await tab.locator("#ord-rechtliches").textContent(), /verbindliche Bestellung/);
      await tab.locator("#order-submit").click();
      await tab.locator("#confirm.open").waitFor({ timeout: 6000 });
      assert.equal(await tab.locator("#confirm-title").textContent(), "Bestellung eingegangen");
      await tab.locator("#confirm-close").click();
      assert.equal(store.ladeBetrieb(SLUG).bestellungen.length, 1);

      /* 2. Bedingungen und No-Show freigegeben und eingeschaltet */
      gibFreigabeTextFrei(SLUG, "bestellbedingungen");
      gibFreigabeTextFrei(SLUG, "reservierungsbedingungen");
      gibNoShowRegelFrei(SLUG, { betrag: 12.5, stornofensterMinuten: 45 });
      store.setzeNoShowSchutz(SLUG, { aktiv: true });
      await tab.goto(`${seite.url}/live/`, { waitUntil: "domcontentloaded" });
      await bestelle(tab);
      await tab.locator("#ord-bedingungen-feld").waitFor({ state: "visible", timeout: 4000 });
      await tab.locator("#ord-noshow-feld").waitFor({ state: "visible", timeout: 4000 });
      assert.equal(await tab.locator("#ord-bedingungen").isChecked(), false, `${geraet}: Bedingungen nicht vorangekreuzt`);
      assert.equal(await tab.locator("#ord-noshow").isChecked(), false, `${geraet}: No-Show nicht vorangekreuzt`);
      assert.match(await tab.locator("#ord-noshow-text").textContent(), /12,50 €.*45 Minuten|45 Minuten.*12,50 €/);
      assert.match(await tab.locator("#ord-noshow-text a").getAttribute("href"), /\/rechtstexte\/noshow-bestellung\/v1$/);
      assert.match(await tab.locator("#ord-bedingungen-text a").getAttribute("href"), /\/rechtstexte\/bestellbedingungen\/v1$/);
      // Getrennte Felder, No-Show direkt vor dem Absenden
      const lage = await tab.evaluate(() => {
        const y = (id) => document.getElementById(id).getBoundingClientRect().top;
        return { bed: y("ord-bedingungen-feld"), noshow: y("ord-noshow-feld"), knopf: y("order-submit") };
      });
      assert.ok(lage.bed < lage.noshow && lage.noshow < lage.knopf, `${geraet}: Reihenfolge ${JSON.stringify(lage)}`);

      // Ohne Häkchen: nichts wird gesendet
      await tab.locator("#order-submit").click();
      await tab.waitForTimeout(300);
      assert.equal(await tab.locator("#confirm.open").count(), 0, `${geraet}: ohne Bestätigung kein Versand`);
      assert.equal(store.ladeBetrieb(SLUG).bestellungen.length, 1);
      await tab.locator("#ord-bedingungen").check();
      await tab.locator("#order-submit").click();
      await tab.waitForTimeout(300);
      assert.equal(await tab.locator("#confirm.open").count(), 0, `${geraet}: No-Show fehlt noch`);
      await tab.locator("#ord-noshow").check();
      await tab.locator("#order-submit").click();
      await tab.locator("#confirm.open").waitFor({ timeout: 6000 });
      assert.equal(await tab.locator("#confirm-title").textContent(), "Bestellung eingegangen");
      await tab.locator("#confirm-close").click();
      const b = store.ladeBetrieb(SLUG).bestellungen.at(-1);
      assert.deepEqual(b.bestaetigungen.map((n) => `${n.art}@${n.version}`), ["bestellbedingungen@v1", "noshow-bestellung@v1"]);

      // Reservierung mit Bedingungen, ohne Reservierungs-No-Show
      await tab.locator("#res-datum").fill("2026-09-26");
      await tab.locator("#res-uhrzeit").selectOption("19:00");
      await tab.locator("#res-personen").selectOption("2 Personen");
      await tab.locator("#res-name").fill("Browser Gast");
      await tab.locator("#res-telefon").fill("0170 9999999");
      assert.equal(await tab.locator("#res-noshow-feld").isVisible(), false, `${geraet}: keine Reservierungs-No-Show`);
      await tab.locator("#res-bedingungen-feld").waitFor({ state: "visible" });
      await tab.locator("#reservation-form button[type=submit]").click();
      await tab.waitForTimeout(300);
      assert.equal(await tab.locator("#confirm.open").count(), 0);
      await tab.locator("#res-bedingungen").check();
      await tab.locator("#reservation-form button[type=submit]").click();
      await tab.locator("#confirm.open").waitFor({ timeout: 6000 });
      assert.equal(await tab.locator("#confirm-title").textContent(), "Anfrage eingegangen");
      if (geraet === "Mobil") await tab.screenshot({ path: path.join(ZIEL, "mobil.png") });
      await kontext.close();
    }

    /* Dashboard: Statistik und Rechtstexte */
    const d = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE" });
    const dash = await d.newPage();
    await dash.goto(wirt.url);
    await dash.locator("nav button[data-tab=statistik]").click();
    await dash.locator(".kachel").first().waitFor({ timeout: 4000 });
    const text = await dash.locator("#stat-inhalt").textContent();
    assert.match(text, /Online-Reservierungen\s*1/, "Daten werden je Gerät zurückgesetzt");
    assert.match(text, /Website-Aufrufe: noch nicht messbar\./);
    assert.match(text, /Bestellwert \(kein bezahlter Umsatz\)/);
    assert.match(text, /gezählt nach Eingang/);
    await dash.locator("nav button[data-tab=rechtstexte]").click();
    await dash.locator(".doku").first().waitFor({ timeout: 4000 });
    assert.match(await dash.locator("#tab-rechtstexte").textContent(), /Entwürfe sind keine Rechtsberatung/);
    assert.match(await dash.locator("#launch-liste").textContent(), /Launch-Blocker/);
    await d.close();
  } finally {
    wirt.server.close();
    seite?.server.close();
    await browser.close();
  }
});
