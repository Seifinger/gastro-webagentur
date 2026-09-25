import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, mkdtempSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Ende-zu-Ende im Browser mit einem Testbetrieb: Der Gast bestellt und
// reserviert auf einer echten v2-Seite, bekommt die Bestätigung mit
// Status-Link, der Wirt verschiebt bzw. lehnt ab, die Statusseite und der
// E-Mail-Mock zeigen jeweils den neuen Stand. Ohne Chromium wird übersprungen.

const SLUG = "__test-gaststatus-browser";
process.env.BETRIEB = SLUG;
delete process.env.V2_COPY_LLM;

const { handler } = await import("../src/wirtServer.js");
const store = await import("../src/betriebStore.js");
const { emailHook } = await import("../src/kundenBenachrichtigung.js");
const { baueImZyklus } = await import("../v2/build/zyklus.js");
const { testLeadFuer } = await import("../v2/build/testLeads.js");
const { starteBrowser } = await import("../v2/build/browser.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BETRIEB_DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);
const ZIEL = mkdtempSync(path.join(tmpdir(), "gaststatus-browser-"));
const altUrl = process.env.WIRT_OEFFENTLICHE_URL;

after(() => {
  rmSync(BETRIEB_DATEI, { force: true });
  rmSync(ZIEL, { recursive: true, force: true });
  emailHook.aktuell = null;
  if (altUrl === undefined) delete process.env.WIRT_OEFFENTLICHE_URL;
  else process.env.WIRT_OEFFENTLICHE_URL = altUrl;
});

function starte(h) {
  const server = createServer(h);
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

async function wirt(basis, pfad, daten) {
  const antwort = await fetch(`${basis}${pfad}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten) });
  return antwort.json();
}

const um = (hhmm) => new Date(`2026-09-24T${hhmm}:00+02:00`);

test("Gast bestellt und reserviert → Wirt verschiebt/lehnt ab → Statusseite und E-Mail-Mock folgen", { timeout: 180_000 }, async (t) => {
  const browser = await starteBrowser();
  if (!browser) {
    t.skip("kein Chromium verfügbar");
    return;
  }
  store.uhrHook.jetzt = () => um("17:00");
  store.speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], anzeigeName: "Trattoria Browser", telefon: "030 7654321" });
  store.legeTischAn(SLUG, { name: "Tisch 1", plaetze: 4 });
  const mails = [];
  emailHook.aktuell = async (an, betreff, text) => {
    mails.push({ an, betreff, text });
    return { id: `mock-${mails.length}` };
  };

  const server = await starte(handler);
  process.env.WIRT_OEFFENTLICHE_URL = server.url;
  let seite = null;
  try {
    const lead = { ...testLeadFuer("italienisch", "trattoria"), placeId: "gaststatus-browser", slug: SLUG };
    await baueImZyklus({ lead, kueche: "italienisch", stimmung: "trattoria", judge: false, offline: true, zielDir: ZIEL, slug: "live", optionen: { apiUrl: server.url } });
    seite = await starte(statisch(ZIEL));

    const kontext = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 }, locale: "de-DE", timezoneId: "Europe/Berlin" });
    await kontext.clock.install({ time: um("17:00") });
    await kontext.clock.pauseAt(um("17:00"));
    const tab = await kontext.newPage();
    await tab.goto(`${seite.url}/live/`, { waitUntil: "domcontentloaded" });

    // Formular erklärt den Status-Link ehrlich, E-Mail ist optional.
    assert.match(await tab.locator("label[for=ord-email]").textContent(), /E-Mail-Adresse für Bestätigung und Änderungen\s*\(optional\)/);
    assert.match(await tab.locator("#order-form").textContent(), /zeigt Bestätigung oder Änderungen nur, wenn Sie ihn erneut öffnen/);

    /* ----- Bestellung ----- */
    await tab.waitForFunction(() => document.querySelectorAll("#ord-abholzeit option").length > 2);
    await tab.locator("[data-add]").first().click();
    await tab.locator("#drawer.open").waitFor({ timeout: 4000 });
    await tab.locator("#ord-abholzeit").selectOption({ label: "18:30 Uhr" });
    await tab.locator("#ord-name").fill("Browser Gast");
    await tab.locator("#ord-telefon").fill("0170 9999999");
    await tab.locator("#ord-email").fill("browser@beispiel.de");
    await tab.locator("#order-submit").click();
    await tab.locator("#confirm.open").waitFor({ timeout: 6000 });

    assert.equal(await tab.locator("#confirm-title").textContent(), "Bestellung eingegangen");
    const text = await tab.locator("#confirm-text").textContent();
    assert.match(text, /Anfrage eingegangen – wartet noch auf Bestätigung durch das Restaurant\./);
    assert.match(text, /schicken wir an browser@beispiel\.de/);
    const zusammenfassung = await tab.locator("#confirm-summary").textContent();
    assert.match(zusammenfassung, /Bestellnummer\s*AB-\d{4}/);
    assert.match(zusammenfassung, /Bestellung eingegangen – noch nicht bestätigt/);
    assert.match(zusammenfassung, /Rückfragen\s*030 7654321/);
    const statusLink = await tab.locator("#confirm-status").getAttribute("href");
    assert.ok(statusLink.startsWith(`${server.url}/status#`), statusLink);
    assert.equal(await tab.locator("#confirm-status").textContent(), "Status später erneut ansehen");
    await tab.locator("#confirm-close").click();

    const status = await kontext.newPage();
    await status.goto(statusLink);
    await status.locator("#angaben:not([hidden])").waitFor({ timeout: 4000 });
    assert.equal(await status.locator("#titel").textContent(), "Bestellung eingegangen – noch nicht bestätigt");
    assert.match(await status.locator("#angaben").textContent(), /Abholzeit \(gewünscht\).*18:30 Uhr/);
    assert.ok(!(await status.content()).includes("Browser Gast"), "kein Name auf der Statusseite");

    // Wirt verschiebt auf 19:10 (Verzögerung) → Statusseite und Mail
    const bestellung = store.ladeBetrieb(SLUG).bestellungen[0];
    await wirt(server.url, `/intern/bestellung/${bestellung.id}/verzoegerung`, { neueZeit: "19:10", grund: "Ofen voll" });
    await status.locator("#neu-laden").click();
    await status.waitForFunction(() => /19:10/.test(document.getElementById("angaben").textContent));
    assert.equal(await status.locator("#titel").textContent(), "Bestätigt – wird zubereitet");
    assert.match(await status.locator("#geaendert").textContent(), /Neue Abholzeit: 19:10 Uhr \(ursprünglich 18:30 Uhr\) – Ofen voll/);
    const mailZurBestellung = mails.filter((m) => m.an === "browser@beispiel.de");
    assert.deepEqual(mailZurBestellung.map((m) => m.betreff.split(" · ")[0]), ["Bestellung eingegangen – noch nicht bestätigt", "Bestellung bestätigt"]);
    assert.match(mailZurBestellung[1].text, /geänderter Abholzeit: 19:10 Uhr statt 18:30/);
    assert.ok(mailZurBestellung[1].text.includes(statusLink), "Mail verlinkt dieselbe Statusseite");

    /* ----- Reservierung (ohne E-Mail) ----- */
    await tab.locator("#res-datum").fill("2026-09-26");
    await tab.locator("#res-uhrzeit").selectOption("19:00");
    await tab.locator("#res-personen").selectOption("2 Personen");
    await tab.locator("#res-name").fill("Browser Gast");
    await tab.locator("#res-telefon").fill("0170 9999999");
    await tab.locator("#reservation-form button[type=submit]").click();
    await tab.locator("#confirm.open").waitFor({ timeout: 6000 });
    assert.equal(await tab.locator("#confirm-title").textContent(), "Anfrage eingegangen");
    assert.match(await tab.locator("#confirm-text").textContent(), /Ohne E-Mail-Adresse sehen Sie Änderungen nur, wenn Sie Ihren Status-Link erneut öffnen/);
    const resNummer = store.ladeBetrieb(SLUG).reservierungen[0].nummer;
    assert.match(await tab.locator("#confirm-summary").textContent(), new RegExp(`Reservierungsnr\\.\\s*${resNummer}`));
    const resLink = await tab.locator("#confirm-status").getAttribute("href");

    const reservierung = store.ladeBetrieb(SLUG).reservierungen[0];
    const abgesagt = await wirt(server.url, "/api/reservierung/status", { id: reservierung.id, status: "abgesagt" });
    assert.equal(abgesagt.gast.anrufText, "Gast nicht automatisch informiert – bitte unter 0170 9999999 anrufen.");
    await status.goto(resLink);
    await status.waitForFunction(() => document.getElementById("titel").textContent === "Reservierung abgelehnt");
    assert.equal(mails.length, 2, "ohne Adresse keine Mail zur Reservierung");

    // Wirt-Dashboard zeigt den Anruf-Hinweis sichtbar an.
    const dashboard = await kontext.newPage();
    await dashboard.goto(server.url);
    await dashboard.locator("#tag").fill("2026-09-26");
    await dashboard.locator("#tag").dispatchEvent("change");
    await dashboard.getByText("Gast nicht automatisch informiert – bitte unter 0170 9999999 anrufen.").first().waitFor({ timeout: 4000 });
    await kontext.close();
  } finally {
    server.server.close();
    seite?.server.close();
    await browser.close();
  }
});
