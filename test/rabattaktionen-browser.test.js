import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, mkdtempSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Rabattaktionen im echten Browser (Chromium; ohne wird übersprungen):
// Kundenseite einmal gebaut → Wirt legt im Dashboard Aktionen an → dieselbe
// gebaute Seite zeigt nach dem Neuladen den gültigen Preis (ohne Neubau) →
// Gast legt das Gericht in den Warenkorb → Server bestätigt genau diesen
// Endpreis → Wirt pausiert vor dem Checkout → Gast sieht den neuen Betrag und
// bestätigt ihn → Server nicht erreichbar: nur reguläre Preise.

const SLUG = "__test-rabatt-browser";
process.env.BETRIEB = SLUG;
delete process.env.V2_COPY_LLM;

const { handler } = await import("../src/wirtServer.js");
const { speichereBetrieb, ladeBetrieb, setzeBestellkarte, uhrHook } = await import("../src/betriebStore.js");
const { schreibeSite } = await import("../v2/build/siteBuilder.js");
const { karteAusDaten } = await import("../v2/build/speisekarte.js");
const { empfehlungsProdukte } = await import("../src/empfehlungen.js");
const { starteBrowser } = await import("../v2/build/browser.js");
const { DEMO_LEADS } = await import("../src/demoLeads.js");
const { italienischeBetriebskarte } = await import("./hilfen/speisekarten.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BETRIEB_DATEI = path.join(__dirname, "..", "data", "betrieb", `${SLUG}.json`);
const ZIEL = mkdtempSync(path.join(tmpdir(), "rabatt-browser-"));

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

/** Freigegebene Kundenkarte mit einer Lasagne zu 12,00 € (Beispiel des Auftrags). */
function karte() {
  const menu = italienischeBetriebskarte();
  menu.kategorien.find((k) => k.name === "Pasta").gerichte.unshift({ name: "Lasagne", beschreibung: "Aus dem Ofen", preis: 12 });
  for (const kat of menu.kategorien) for (const g of [...(kat.gerichte ?? []), ...(kat.gruppen ?? []).flatMap((x) => x.gerichte)]) g.bestaetigt = true;
  return menu;
}

const LEAD = { ...DEMO_LEADS.find((l) => l.kueche === "italienisch"), placeId: "rabatt-browser" };
const MEDIEN = { hero: { src: "medien/hero.jpg", herkunft: "eigen" }, haus: { src: "medien/haus.jpg", herkunft: "eigen" }, team: null, gericht: () => null };
const um = (hhmm) => new Date(`2026-09-24T${hhmm}:00+02:00`);
const post = (url, daten) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten) }).then((a) => a.json());
const text = (loc) => loc.evaluate((el) => el.innerText.replace(/\s+/g, " ").trim());

test("Rabattaktion im Browser: Dashboard → gebaute Kundenseite → Warenkorb → Server bestätigt denselben Endpreis", { timeout: 240_000 }, async (t) => {
  const browser = await starteBrowser();
  if (!browser) {
    t.skip("kein Chromium verfügbar");
    return;
  }
  uhrHook.jetzt = () => um("17:00");
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
  const k = karteAusDaten(karte());
  setzeBestellkarte(SLUG, { katalog: k.katalog, produkte: empfehlungsProdukte(k, { nurBestaetigt: true }), version: "b1", quelle: "test" });

  const wirt = await starte(handler);
  let seite = null;
  try {
    // Die Kundenseite wird EINMAL gebaut – vor jeder Aktion.
    const bau = { lead: LEAD, kueche: "italienisch", optionen: { kundenfassung: true, fontCss: "", ausdruck: "gesellig", menu: karte(), medien: MEDIEN, apiUrl: wirt.url } };
    schreibeSite(bau, { zielDir: ZIEL, slug: "kunde" });
    // Das Markup (Body ohne Skripte) verspricht keinen Rabatt – Preise stehen regulär drin.
    const markup = () => readFileSync(path.join(ZIEL, "kunde", "speisekarte", "index.html"), "utf-8").replace(/^[\s\S]*?<body/, "<body").replace(/<script>[\s\S]*?<\/script>/g, "");
    const gebaut = markup();
    assert.ok(!/statt|Aktion „|preis--aktion/.test(gebaut), "kein Rabatt im statischen HTML");
    assert.match(gebaut, /<span class="preis" data-preis-fuer="lasagne">12,00 €<\/span>/);
    seite = await starte(statisch(ZIEL));

    const kontext = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 }, locale: "de-DE" });
    await kontext.clock.install({ time: um("17:00") });
    await kontext.clock.pauseAt(um("17:00"));
    const gast = await kontext.newPage();
    const fehler = [];
    gast.on("pageerror", (e) => fehler.push(e.message));
    await gast.goto(`${seite.url}/kunde/speisekarte/`, { waitUntil: "networkidle" });
    const lasagnePreis = gast.locator("#gericht-lasagne .karte-gericht-kopf .preis");
    assert.equal(await text(lasagnePreis), "12,00 €", "ohne Aktion: regulär");
    assert.equal(await gast.locator("#gericht-lasagne .karte-aktion").isVisible(), false);

    // 1. Wirt legt im Dashboard zwei Aktionen an (Gericht −2 € und allgemein 10 %).
    const dash = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const wt = await dash.newPage();
    await wt.goto(`${wirt.url}/`, { waitUntil: "load" });
    await wt.getByRole("button", { name: "Rabattaktionen", exact: true }).click();
    await wt.locator("#ra-name").waitFor();
    assert.match(await wt.locator("#ra-regel").textContent(), /zahlt der Gast den günstigeren Endpreis/);
    await wt.locator("#ra-name").fill("Lasagne der Woche");
    await wt.locator('input[name="ra-art"][value="gericht"]').check();
    await wt.locator('[data-ra-gericht][value="lasagne"]').check();
    await wt.locator("#ra-typ").selectOption("betrag");
    await wt.locator("#ra-wert").fill("2,00");
    await wt.locator("#ra-ende").fill("2026-09-27T23:59");
    await wt.locator("#ra-vorschau table").waitFor();
    assert.match(await text(wt.locator("#ra-vorschau")), /Lasagne 12,00 € 10,00 € 10,00 €/, "Vorschau alt/neu");
    await wt.locator("#ra-form button[type=submit]").click();
    await wt.locator("#toast.sichtbar").filter({ hasText: "Lasagne der Woche" }).waitFor();

    await wt.locator("#ra-name").fill("Abholwoche");
    await wt.locator('input[name="ra-art"][value="abholung"]').check();
    await wt.locator('[data-ra-kategorie][value="Getränke"]').uncheck();
    await wt.locator("#ra-wert").fill("10");
    await wt.locator("#ra-vorschau table").waitFor();
    // Offen benannt: bei der Lasagne gilt der günstigere Einzelrabatt.
    assert.match(await text(wt.locator("#ra-vorschau")), /Lasagne Hier gilt die günstigere Aktion „Lasagne der Woche“ \(−2,00 €\)\. 12,00 € 10,80 € 10,00 €/);
    await wt.locator("#ra-form button[type=submit]").click();
    await wt.locator("#toast.sichtbar").filter({ hasText: "Abholwoche" }).waitFor();
    await wt.locator('.ra-karte:has-text("Abholwoche")').waitFor();
    assert.match(await text(wt.locator('#ra-liste .ra-karte:has-text("Abholwoche")')), /gilt jetzt .*Allgemeiner Abholrabatt · −10 %.*außer „Getränke“/);

    // 2. Dieselbe gebaute Seite, nur neu geladen: gültige Aktionspreise.
    await gast.reload({ waitUntil: "networkidle" });
    await gast.locator("#gericht-lasagne .preis--aktion").waitFor();
    assert.equal(await text(lasagnePreis), "10,00 € statt 12,00 €");
    assert.equal(await text(gast.locator("#gericht-lasagne .karte-aktion")), "Aktion „Lasagne der Woche“ −2,00 € · bis So. 27.09.2026, 23:59 Uhr");
    assert.equal(await text(gast.locator("#gericht-diavola .karte-gericht-kopf .preis")), "10,71 € statt 11,90 €");
    assert.equal(await text(gast.locator("#gericht-chinotto .preis")), "3,90 €", "Getränke ausgenommen");
    assert.equal(await text(gast.locator('[data-preis-fuer="margherita--26-cm"]')), "7,65 € statt 8,50 €", "Varianten");
    assert.equal(markup(), gebaut, "HTML unverändert – nichts neu gebaut");

    // 3. Warenkorb: derselbe Preis wie auf der Karte, je Position nachvollziehbar.
    await gast.locator('main [data-add="lasagne"]').click();
    await gast.locator('main [data-add="lasagne"]').click();
    await gast.locator('main [data-add="chinotto"]').click();
    await gast.locator("#cart-fab").click();
    await gast.locator("#drawer.open").waitFor();
    const zeilen = await gast.locator(".cart-line").evaluateAll((els) => els.map((e) => e.querySelector(".cart-line-body").innerText.replace(/\s+/g, " ").trim()));
    assert.deepEqual(zeilen, [
      "Lasagne 2 × 10,00 € statt 12,00 € Aktion „Lasagne der Woche“ −2,00 € · bis So. 27.09.2026, 23:59 Uhr",
      "Chinotto 1 × 3,90 €",
    ]);
    assert.equal(await text(gast.locator("#cart-aufstellung")), "Zwischensumme (regulär) 27,90 € Ersparnis durch Aktionen −4,00 €");
    assert.equal(await text(gast.locator("#cart-total")), "23,90 €");
    assert.equal(await text(gast.locator("#fab-total")), "23,90 €");

    // 4. Absenden: Der Server bestätigt genau diesen Endpreis.
    await gast.waitForFunction(() => document.querySelectorAll("#ord-abholzeit option").length > 2);
    await gast.locator("#ord-abholzeit").selectOption({ index: 2 });
    await gast.locator("#ord-name").fill("Gast Rabatt");
    await gast.locator("#ord-telefon").fill("030 555 0808");
    await gast.locator("#order-submit").click();
    await gast.locator("#confirm-title").filter({ hasText: "Bestellung eingegangen" }).waitFor({ timeout: 4000 });
    assert.match(await text(gast.locator("#confirm-summary")), /Gesamt 23,90 € Ersparnis durch Aktionen −4,00 €/);
    let [b] = ladeBetrieb(SLUG).bestellungen;
    assert.equal(b.gesamt, 23.9);
    assert.equal(b.preisermittlung.endbetragCent, 2390);
    assert.deepEqual(b.positionen.map((p) => [p.name, p.preis, p.regulaerPreis ?? null]), [["Lasagne", 10, 12], ["Chinotto", 3.9, null]]);
    await gast.locator("#confirm-close").click();

    // 5. Rabatt ändert sich vor dem Checkout: Wirt pausiert die Gericht-Aktion.
    await gast.locator('main [data-add="lasagne"]').click();
    await gast.locator("#cart-fab").click();
    await gast.locator("#drawer.open").waitFor();
    assert.equal(await text(gast.locator("#cart-total")), "10,00 €");
    const aktion = ladeBetrieb(SLUG).rabattaktionen.find((a) => a.name === "Lasagne der Woche");
    await wt.reload();
    await wt.getByRole("button", { name: "Rabattaktionen", exact: true }).click();
    await wt.locator(`[data-ra-status="pausiert"][data-id="${aktion.id}"]`).click();
    await wt.locator("#toast.sichtbar").filter({ hasText: "pausiert" }).waitFor();
    await gast.locator("#ord-abholzeit").selectOption({ index: 2 });
    await gast.locator("#ord-name").fill("Gast Rabatt");
    await gast.locator("#ord-telefon").fill("030 555 0808");
    await gast.locator("#order-submit").click();
    await gast.locator("#confirm-title").filter({ hasText: "Das hat nicht geklappt" }).waitFor({ timeout: 4000 });
    assert.match(await text(gast.locator("#confirm-text")), /jetzt 10,80 € statt 10,00 €/);
    assert.equal(ladeBetrieb(SLUG).bestellungen.length, 1, "nicht still zu anderem Preis angenommen");
    await gast.locator("#confirm-close").click();
    assert.equal(await text(gast.locator("#cart-total")), "10,80 €", "Warenkorb zeigt den neuen Betrag");
    assert.match(await text(gast.locator(".cart-line-aktion")), /Abholwoche/);
    await gast.locator("#order-submit").click(); // bewusst erneut bestätigt
    await gast.locator("#confirm-title").filter({ hasText: "Bestellung eingegangen" }).waitFor({ timeout: 4000 });
    b = ladeBetrieb(SLUG).bestellungen[1];
    assert.equal(b.gesamt, 10.8);
    assert.equal(b.positionen[0].aktion.name, "Abholwoche");
    // Die Karte zeigt nach dem Neuladen wieder dasselbe wie der Warenkorb.
    await gast.reload({ waitUntil: "networkidle" });
    await gast.locator("#gericht-lasagne .preis--aktion").waitFor();
    assert.equal(await text(lasagnePreis), "10,80 € statt 12,00 €");
    assert.deepEqual(fehler, []);
    await kontext.close();

    // 6. Handy: Warenkorb mit Rabatt passt auf 360 px.
    const handy = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    const ht = await handy.newPage();
    await ht.goto(`${seite.url}/kunde/speisekarte/`, { waitUntil: "networkidle" });
    await ht.locator('main [data-add="lasagne"]').tap();
    await ht.locator("#bar-order").tap();
    await ht.locator("#cart-aufstellung").waitFor({ state: "visible" });
    await ht.waitForFunction(() => Math.abs(document.getElementById("drawer").getBoundingClientRect().right - window.innerWidth) < 1);
    assert.ok(await ht.evaluate(() => document.querySelector(".drawer-body").scrollWidth <= document.querySelector(".drawer-body").clientWidth), "kein seitlicher Überlauf");
    assert.ok(await ht.evaluate(() => document.documentElement.scrollWidth) <= 360);
    await handy.close();

    // 7. Server nicht erreichbar: dieselbe Seite mit totem Bestellserver zeigt nur reguläre Preise.
    schreibeSite({ ...bau, optionen: { ...bau.optionen, apiUrl: "http://127.0.0.1:9" } }, { zielDir: ZIEL, slug: "offline" });
    const off = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const ot = await off.newPage();
    const abgelehnt = ot.waitForEvent("requestfailed", (req) => req.url().endsWith("/oeffentlich/preise"));
    await ot.goto(`${seite.url}/offline/speisekarte/`, { waitUntil: "load" });
    await abgelehnt;
    await ot.locator('main [data-add="lasagne"]').click();
    await ot.locator("#cart-fab").click();
    await ot.locator("#drawer.open").waitFor();
    assert.equal(await text(ot.locator("#gericht-lasagne .karte-gericht-kopf .preis")), "12,00 €");
    assert.equal(await ot.locator(".preis--aktion, .cart-line-aktion").count(), 0, "kein unbestätigter Sonderpreis");
    assert.equal(await text(ot.locator("#cart-total")), "12,00 €");
    await off.close();

    // 8. Beispielseite ohne Betriebsserver: fragt keine Preise ab, zeigt keine Aktion.
    schreibeSite({ lead: LEAD, kueche: "italienisch", optionen: { fiktiv: true, veroeffentlicht: true, fontCss: "", ausdruck: "gesellig" } }, { zielDir: ZIEL, slug: "demo" });
    const demo = await browser.newContext({ reducedMotion: "reduce" });
    const dt = await demo.newPage();
    const anfragen = [];
    dt.on("request", (req) => { if (req.method() === "POST") anfragen.push(req.url()); });
    await dt.goto(`${seite.url}/demo/speisekarte/`, { waitUntil: "networkidle" });
    assert.deepEqual(anfragen, []);
    assert.equal(await dt.locator(".preis--aktion").count(), 0);
    await demo.close();
    await dash.close();
  } finally {
    await browser.close();
    wirt.server.close();
    seite?.server.close();
  }
});
