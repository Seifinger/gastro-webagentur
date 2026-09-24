import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, mkdtempSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Abholzeiten im Browser, auf einer echten v2-Seite, mit steuerbarer Uhr
// (Playwright clock). Der Browser läuft absichtlich in New York: gerechnet
// wird trotzdem in Berlin. Ohne Chromium wird übersprungen.

const SLUG = "__test-abholzeiten-browser";
process.env.BETRIEB = SLUG;
delete process.env.V2_COPY_LLM;

const { handler } = await import("../src/wirtServer.js");
const { speichereBetrieb, ladeBetrieb, setzeWartezeit, uhrHook } = await import("../src/betriebStore.js");
const { baueImZyklus } = await import("../v2/build/zyklus.js");
const { testLeadFuer } = await import("../v2/build/testLeads.js");
const { starteBrowser } = await import("../v2/build/browser.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BETRIEB_DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);
const ZIEL = mkdtempSync(path.join(tmpdir(), "abholzeiten-browser-"));

after(() => {
  rmSync(BETRIEB_DATEI, { force: true });
  rmSync(ZIEL, { recursive: true, force: true });
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

async function baue(slug, optionen) {
  const lead = { ...testLeadFuer("italienisch", "trattoria"), placeId: `abholzeiten-${slug}`, slug: SLUG };
  await baueImZyklus({ lead, kueche: "italienisch", stimmung: "trattoria", judge: false, offline: true, zielDir: ZIEL, slug, optionen });
}

const optionen = (tab) => tab.locator("#ord-abholzeit option").allTextContents();
const hinweis = (tab) => tab.locator("#ord-abholzeit-hinweis").textContent();

// Donnerstag, 24.09.2026 (Standardzeiten der Seite: 11:30–14:00, 17:00–22:00)
const um = (hhmm) => new Date(`2026-09-24T${hhmm}:00+02:00`);

test("Abholzeiten im Browser: Anzeige, veraltete Zeiten, Absenden, Schluss, Server-Ablehnung", { timeout: 180_000 }, async (t) => {
  const browser = await starteBrowser();
  if (!browser) {
    t.skip("kein Chromium verfügbar");
    return;
  }
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
  const wirt = await starte(handler);
  let seite = null;
  try {
    await baue("vorschau", {});
    await baue("live", { apiUrl: wirt.url });
    seite = await starte(statisch(ZIEL));

    const kontext = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 }, locale: "de-DE", timezoneId: "America/New_York" });
    await kontext.clock.install({ time: um("16:43") });
    await kontext.clock.pauseAt(um("16:43"));
    const tab = await kontext.newPage();
    await tab.goto(`${seite.url}/vorschau/`, { waitUntil: "domcontentloaded" });

    // 1. Vor Öffnung (16:43, Öffnung 17:00): ASAP 17:20, erste Zeit 17:25, Hinweis
    let z = await optionen(tab);
    assert.equal(z[0], "Bitte wählen");
    assert.equal(z[1], "So schnell wie möglich – ca. 17:20 Uhr");
    assert.equal(z[2], "17:25 Uhr");
    assert.ok(!z.some((x) => /^1[0-6]:|^17:[01]\d Uhr/.test(x)), "nichts vor 17:20");
    assert.match(await hinweis(tab), /Gerade ist geschlossen – Sie können für heute ab 17:20 Uhr vorbestellen/);

    // 2. Lange offene Seite: 17:25 gewählt, 18 Minuten später ist es nicht mehr möglich
    await tab.locator('[data-add]').first().click();
    await tab.locator("#drawer.open").waitFor({ timeout: 4000 });
    const auswahl = tab.locator("#ord-abholzeit");
    await auswahl.selectOption({ label: "17:25 Uhr" });
    await tab.locator("#ord-name").focus();
    await kontext.clock.fastForward(18 * 60_000); // 17:01, der 30-Sekunden-Takt rechnet neu
    z = await optionen(tab);
    assert.ok(!z.includes("17:25 Uhr"), "17:25 wurde entfernt");
    assert.equal(z[2], "17:30 Uhr");
    assert.equal(await auswahl.inputValue(), "", "die Wahl wird geleert, nicht still ersetzt");
    assert.match(await hinweis(tab), /nicht mehr möglich – bitte wählen Sie eine neue/);

    // 3. Unmittelbar vor dem Absenden wird noch einmal geprüft
    await auswahl.selectOption({ label: "17:30 Uhr" });
    await tab.locator("#ord-name").fill("Gast Test");
    await tab.locator("#ord-telefon").fill("030 555 0303");
    await kontext.clock.fastForward(3 * 60_000); // 17:04 – 17:30 ist jetzt zu knapp (17:04 + 25 = 17:29 → 17:30 geht noch)
    await kontext.clock.fastForward(2 * 60_000); // 17:06 → erste Zeit 17:35
    await tab.locator("#order-submit").click();
    assert.equal(await tab.locator("#confirm.open").count(), 0, "nicht abgeschickt");
    assert.match(await hinweis(tab), /nicht mehr möglich/);

    // 4. ASAP absenden (Vorschau): die Bestätigung nennt die konkrete Zeit
    await auswahl.selectOption({ index: 1 });
    await tab.locator("#order-submit").click();
    await tab.locator("#confirm.open").waitFor({ timeout: 4000 });
    assert.match(await tab.locator("#confirm-summary").textContent(), /so schnell wie möglich \(ca\. 17:26 Uhr\)/);
    await tab.locator("#confirm-close").click();

    // 5. Kurz vor Schluss (21:40): nichts mehr, Hinweis auf morgen
    await kontext.clock.fastForward(um("21:40") - um("17:06"));
    await tab.locator("#ord-abholzeit").focus();
    z = await optionen(tab);
    assert.deepEqual(z, ["Heute keine Abholung mehr möglich"]);
    assert.match(await hinweis(tab), /Heute nehmen wir keine Abholbestellungen mehr an\. Nächste Öffnung: morgen, 11:30 Uhr\./);
    await kontext.close();

    // 6. Live: Der Wirt setzt die Wartezeit hoch, während die Seite offen ist.
    //    Der Server lehnt die alte ASAP-Zeit mit klarer Meldung ab.
    uhrHook.jetzt = () => um("17:00");
    const live = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 }, locale: "de-DE", timezoneId: "America/New_York" });
    await live.clock.install({ time: um("17:00") });
    await live.clock.pauseAt(um("17:00"));
    const lt = await live.newPage();
    await lt.goto(`${seite.url}/live/`, { waitUntil: "domcontentloaded" });
    await lt.waitForFunction(() => document.querySelectorAll("#ord-abholzeit option").length > 2);
    await lt.locator('[data-add]').first().click();
    await lt.locator("#drawer.open").waitFor({ timeout: 4000 });
    await lt.locator("#ord-abholzeit").selectOption({ index: 1 });
    assert.match(await lt.locator("#ord-abholzeit option:checked").textContent(), /ca\. 17:20 Uhr/);
    setzeWartezeit(SLUG, 30);
    await lt.locator("#ord-name").fill("Gast Live");
    await lt.locator("#ord-telefon").fill("030 555 0404");
    await lt.locator("#order-submit").click();
    await lt.locator("#confirm.open").waitFor({ timeout: 4000 });
    assert.equal(await lt.locator("#confirm-title").textContent(), "Das hat nicht geklappt");
    assert.match(await lt.locator("#confirm-text").textContent(), /17:20 Uhr ist nicht mehr zu schaffen\. Frühestens möglich: 17:50 Uhr/);
    assert.equal(ladeBetrieb(SLUG).bestellungen.length, 0, "nichts angelegt");
    // Die Seite hat sich die neue Wartezeit geholt: ASAP jetzt 17:50
    await lt.waitForFunction(() => /17:50/.test(document.querySelector("#ord-abholzeit option:nth-child(2)")?.textContent ?? ""));
    await lt.locator("#confirm-close").click();
    await lt.locator("#ord-abholzeit").selectOption({ index: 1 });
    await lt.locator("#order-submit").click();
    await lt.locator("#confirm-title").filter({ hasText: "Bestellung eingegangen" }).waitFor({ timeout: 4000 });
    const [b] = ladeBetrieb(SLUG).bestellungen;
    assert.equal(b.abholzeit, "17:50");
    assert.equal(b.abholArt, "asap");
    await live.close();
  } finally {
    await browser.close();
    if (seite) await new Promise((f) => seite.server.close(f));
    await new Promise((f) => wirt.server.close(f));
  }
});
