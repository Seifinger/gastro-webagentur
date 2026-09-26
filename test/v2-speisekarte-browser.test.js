import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, mkdtempSync, readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Speisekarten-Seite im Browser (Chromium; ohne wird übersprungen):
// Startseite → Plus → Gericht auf der Speisekarte (nichts hinzugefügt) →
// Hinzufügen → zurück zur Startseite (Warenkorb bleibt) → Preisänderung nach
// neuem Build → Abholzeit (ASAP, 20 Minuten, Wirt-Verzögerung, 5-Minuten-
// Takt) → Server-Submit. Dazu: GitHub-Pages-Unterpfad, file://, Handy mit
// 360 px, ohne JavaScript, Konzept-Demo ohne Versand.

const SLUG = "__test-speisekarte-browser";
process.env.BETRIEB = SLUG;
delete process.env.V2_COPY_LLM;

const { handler } = await import("../src/wirtServer.js");
const { speichereBetrieb, ladeBetrieb, setzeWartezeit, uhrHook } = await import("../src/betriebStore.js");
const { schreibeSite } = await import("../v2/build/siteBuilder.js");
const { starteBrowser } = await import("../v2/build/browser.js");
const { DEMO_LEADS } = await import("../src/demoLeads.js");
const { italienischeBetriebskarte } = await import("./hilfen/speisekarten.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BETRIEB_DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);
const WURZEL = mkdtempSync(path.join(tmpdir(), "speisekarte-browser-"));
// Wie auf GitHub Pages: https://<user>.github.io/<repo>/<slug>/
const BASIS = "/gastro-webagentur";
const ZIEL = path.join(WURZEL, BASIS.slice(1));
mkdirSync(ZIEL, { recursive: true });

after(() => {
  rmSync(BETRIEB_DATEI, { force: true });
  rmSync(WURZEL, { recursive: true, force: true });
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

const LEAD = { ...DEMO_LEADS.find((l) => l.kueche === "italienisch"), placeId: "speisekarte-browser" };

function baue(slug, { menu = italienischeBetriebskarte(), ...optionen } = {}) {
  schreibeSite({ lead: LEAD, kueche: "italienisch", optionen: { fiktiv: true, fontCss: "", ausdruck: "gesellig", menu, ...optionen } }, { zielDir: ZIEL, slug });
}

const um = (hhmm) => new Date(`2026-09-24T${hhmm}:00+02:00`);
const zahl = (tab) => tab.locator("#fab-count").textContent();

test("Speisekarte im Browser: Plus, Hinzufügen, Seitenwechsel, Preisänderung, Abholzeit, Server", { timeout: 180_000 }, async (t) => {
  const browser = await starteBrowser();
  if (!browser) {
    t.skip("kein Chromium verfügbar");
    return;
  }
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
  let bestellAufrufe = 0;
  const wirt = await starte((req, res) => {
    if (req.url.startsWith("/oeffentlich/bestellung")) bestellAufrufe += 1;
    return handler(req, res);
  });
  let seite = null;
  try {
    baue("live", { apiUrl: wirt.url });
    seite = await starte(statisch(WURZEL));
    uhrHook.jetzt = () => um("17:00");

    const kontext = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 }, locale: "de-DE", timezoneId: "America/New_York" });
    await kontext.clock.install({ time: um("17:00") });
    await kontext.clock.pauseAt(um("17:00"));
    const tab = await kontext.newPage();
    const fehler = [];
    tab.on("pageerror", (e) => fehler.push(e.message));
    await tab.goto(`${seite.url}${BASIS}/live/`, { waitUntil: "load" });

    // 1. Startseite: kein Hinzufügen-Knopf, das Plus öffnet das Gericht auf der Speisekarte.
    // (Die beiden Plätze von „Passt gut dazu“ im Warenkorb zählen nicht – empfehlungen-browser.test.js.)
    assert.equal(await tab.locator("main [data-add]").count(), 0);
    const plus = tab.locator("#karte a.mini-add").first();
    const ziel = await plus.getAttribute("href");
    assert.equal(ziel, "speisekarte/index.html#gericht-margherita");
    await plus.click();
    await tab.waitForURL(`**${BASIS}/live/speisekarte/index.html#gericht-margherita`);
    assert.equal(await tab.evaluate(() => document.querySelector(":target")?.id), "gericht-margherita");
    assert.equal(await zahl(tab), "0", "das Plus hat nichts in den Warenkorb gelegt");
    const lage = await tab.evaluate(() => ({ ziel: document.querySelector(":target").getBoundingClientRect().top, kopf: document.getElementById("topbar").getBoundingClientRect().bottom }));
    assert.ok(lage.ziel >= lage.kopf, `Gericht unter der Kopfzeile verdeckt (${lage.ziel} < ${lage.kopf})`);

    // 2. Hinzufügen: Variante und Gericht, Warenkorb bleibt zu, Status-Meldung.
    await tab.locator('[data-add="margherita--26-cm"]').click();
    await tab.locator('[data-add="diavola"]').click();
    await tab.locator('[data-add="diavola"]').click();
    assert.equal(await zahl(tab), "3");
    assert.equal(await tab.locator("#fab-total").textContent(), "32,30 €");
    assert.equal(await tab.locator("#drawer.open").count(), 0, "die Karte bleibt sichtbar");
    assert.match(await tab.locator("#cart-status").textContent(), /Diavola liegt im Warenkorb \(3 insgesamt\)\./);
    assert.equal(await tab.locator('#gericht-tartufo [data-add]').count(), 0, "ausverkauft");

    // 3. Zur Startseite: derselbe Warenkorb.
    await tab.locator(".kopf-marke").click();
    await tab.waitForURL(`**${BASIS}/live/index.html`);
    assert.equal(await zahl(tab), "3");
    assert.equal(await tab.locator("#fab-total").textContent(), "32,30 €");
    assert.equal(await tab.locator("#reservation-form").count(), 1, "Reservierung bleibt auf der Startseite");

    // 4. Neuer Build mit geänderter Karte: kein alter Preis, entfallenes Gericht fliegt raus.
    const neu = italienischeBetriebskarte();
    neu.kategorien[1].gerichte[0].varianten[0].preis = 9;
    neu.kategorien[1].gerichte[1].aktiv = false;
    baue("live", { apiUrl: wirt.url, menu: neu });
    await tab.goto(`${seite.url}${BASIS}/live/speisekarte/`, { waitUntil: "load" });
    assert.equal(await zahl(tab), "1");
    assert.equal(await tab.locator("#fab-total").textContent(), "9,00 €");
    await tab.locator("#cart-fab").click();
    await tab.locator("#drawer.open").waitFor({ timeout: 4000 });
    const hinweis = await tab.locator(".cart-hinweis").textContent();
    assert.match(hinweis, /Diavola ist nicht mehr bestellbar und wurde entfernt\./);
    assert.match(hinweis, /Neuer Preis für Margherita \(Ø 26 cm\): 9,00 €\./);
    assert.equal(await tab.locator(".cart-line-price").textContent(), "1 × 9,00 €");

    // 5. Abholzeit: ASAP = jetzt + 20 Minuten, dann 5-Minuten-Takt (Server-Uhr, Berlin).
    await tab.waitForFunction(() => document.querySelectorAll("#ord-abholzeit option").length > 2);
    const z = await tab.locator("#ord-abholzeit option").allTextContents();
    assert.equal(z[1], "So schnell wie möglich – ca. 17:20 Uhr");
    assert.equal(z[2], "17:25 Uhr");
    assert.equal(z[3], "17:30 Uhr");
    await tab.locator("#drawer-close").click();

    // Wirt-Verzögerung: +30 Minuten. Nach dem nächsten Abruf rechnet die Seite mit.
    setzeWartezeit(SLUG, 30);
    await kontext.clock.fastForward(61_000);
    await tab.locator("#cart-fab").click();
    await tab.waitForFunction(() => /17:50/.test(document.querySelector("#ord-abholzeit option:nth-child(2)")?.textContent ?? ""));
    await tab.locator("#ord-abholzeit").selectOption({ index: 1 });
    await tab.locator("#ord-name").fill("Gast Karte");
    await tab.locator("#ord-telefon").fill("030 555 0505");
    await tab.locator("#order-submit").click();
    await tab.locator("#confirm-title").filter({ hasText: "Bestellung eingegangen" }).waitFor({ timeout: 4000 });
    const [b] = ladeBetrieb(SLUG).bestellungen;
    assert.equal(b.abholArt, "asap");
    assert.equal(b.abholzeit, "17:50", "Serveruhr 17:00 + 20 Minuten + 30 Minuten Wirt-Verzögerung");
    assert.deepEqual(b.positionen.map((p) => [p.name, p.menge, p.preis]), [["Margherita (Ø 26 cm)", 1, 9]]);
    // Nach der Bestellung ist der Warenkorb auf beiden Seiten leer.
    await tab.goto(`${seite.url}${BASIS}/live/`, { waitUntil: "load" });
    assert.equal(await zahl(tab), "0");

    // 6. Server prüft weiter selbst: eine Zeit vor ASAP bzw. außerhalb des Takts wird abgelehnt.
    for (const abholzeit of ["17:20", "17:57"]) {
      const antwort = await fetch(`${wirt.url}/oeffentlich/bestellung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionen: [{ name: "Tiramisù", menge: 1, preis: 7.5 }], abholzeit, abholArt: "geplant", abholZeitpunkt: `2026-09-24T${abholzeit}:00+02:00`, name: "X", telefon: "1" }),
      });
      const daten = await antwort.json();
      assert.ok(!antwort.ok || daten.ok === false, `${abholzeit} hätte abgelehnt werden müssen`);
    }
    assert.equal(ladeBetrieb(SLUG).bestellungen.length, 1);
    assert.deepEqual(fehler, []);
    await kontext.close();

    // 7. Handy, 360 px: kein seitliches Scrollen, Kategorien waagrecht scrollbar mit großen Tippflächen.
    const handy = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    const ht = await handy.newPage();
    for (const pfad of ["", "speisekarte/"]) {
      await ht.goto(`${seite.url}${BASIS}/live/${pfad}`, { waitUntil: "load" });
      assert.equal(await ht.evaluate(() => document.documentElement.scrollWidth), 360, `seitliches Scrollen auf /${pfad}`);
    }
    const leiste = await ht.evaluate(() => {
      const nav = document.querySelector(".karten-sprung--seite");
      return { scrollbar: nav.scrollWidth > nav.clientWidth, hoehe: Math.min(...[...nav.querySelectorAll("a")].map((a) => a.getBoundingClientRect().height)) };
    });
    assert.ok(leiste.scrollbar, "Kategorien laufen waagrecht");
    assert.ok(leiste.hoehe >= 44, `Tippfläche ${leiste.hoehe}px`);
    await ht.locator('.karten-sprung--seite a[href="#kat-desserts"]').click();
    await ht.waitForFunction(() => document.querySelector('.karten-sprung--seite a[href="#kat-desserts"]').getAttribute("aria-current") === "true");
    const abstand = await ht.evaluate(() => document.getElementById("kat-desserts").getBoundingClientRect().top - document.querySelector(".karten-sprung--seite").getBoundingClientRect().bottom);
    assert.ok(abstand >= 0, "Kategorie nicht unter Kopfzeile/Leiste verdeckt");
    // Warenkorb auf dem Handy: unten in der Aktionsleiste.
    await ht.locator('[data-add="tiramisu"]').click();
    assert.match(await ht.locator("#bar-order").textContent(), /Bestellen · 7,50 €/);
    await handy.close();

    // 8. Ohne JavaScript: Karte vollständig lesbar, Hinweis zum Bestellen, Links funktionieren.
    const ohneJs = await browser.newContext({ javaScriptEnabled: false });
    const oj = await ohneJs.newPage();
    await oj.goto(`${seite.url}${BASIS}/live/speisekarte/index.html#gericht-tiramisu`, { waitUntil: "load" });
    assert.ok(await oj.locator("#gericht-tiramisu").isVisible());
    assert.ok(await oj.locator("#kat-getraenke").isVisible());
    assert.match(await oj.locator("noscript").first().textContent(), /braucht diese Seite JavaScript/);
    await ohneJs.close();

    // 9. Lokal als Datei (file://): dieselben relativen Links.
    const datei = await browser.newContext();
    const dt = await datei.newPage();
    await dt.goto(pathToFileURL(path.join(ZIEL, "live", "index.html")).href);
    await dt.locator("#karte a.mini-add").first().click();
    await dt.waitForURL(/speisekarte\/index\.html#gericht-margherita$/);
    assert.ok(await dt.locator("#gericht-margherita").isVisible());
    await datei.close();

    // 10. Konzept-Demo: auch mit bekanntem Betriebsserver geht nichts hinaus.
    schreibeSite(
      { lead: { name: "Pizzeria Konzept", ort: "Altötting", placeId: "konzept-x" }, kueche: "italienisch", optionen: { fontCss: "", ausdruck: "gesellig", konzept: true, fiktiv: false, apiUrl: wirt.url } },
      { zielDir: ZIEL, slug: "konzept" },
    );
    const vorher = bestellAufrufe;
    const kk = await browser.newContext({ reducedMotion: "reduce" });
    const kt = await kk.newPage();
    await kt.goto(`${seite.url}${BASIS}/konzept/speisekarte/`, { waitUntil: "load" });
    await kt.locator("[data-add]").first().click();
    await kt.locator("#cart-fab").click();
    await kt.locator("#ord-abholzeit").selectOption({ index: 0 });
    await kt.evaluate(() => {
      const f = document.getElementById("ord-abholzeit");
      const o = document.createElement("option");
      o.value = "2026-09-24T18:00:00+02:00"; o.textContent = "18:00 Uhr"; o.setAttribute("data-art", "geplant"); o.setAttribute("data-uhrzeit", "18:00");
      f.appendChild(o); f.value = o.value;
    });
    await kt.locator("#ord-name").fill("Test");
    await kt.locator("#ord-telefon").fill("1");
    await kt.locator("#order-submit").click();
    await kt.locator("#confirm-title").filter({ hasText: "Vorschau – nichts bestellt" }).waitFor({ timeout: 4000 });
    assert.equal(bestellAufrufe, vorher, "Konzept-Demo hat nichts an den Server geschickt");
    await kk.close();
  } finally {
    await browser.close();
    if (seite) await new Promise((f) => seite.server.close(f));
    await new Promise((f) => wirt.server.close(f));
  }
});
