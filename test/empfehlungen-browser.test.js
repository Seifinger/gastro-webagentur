import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, mkdtempSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// „Passt gut dazu“ im echten Browser (Chromium; ohne wird übersprungen):
// Speisekarte → Hinzufügen → Warenkorb mit höchstens zwei Ergänzungen →
// Variante per Tastatur wählen und hinzufügen → Summe → Absenden an den
// Betriebsserver (Markierung „empfohlen“, Preis geprüft) → Wirt schaltet ab →
// Handy mit 360 px → Beispielseite ohne Versand → Wirt-Dashboard.

const SLUG = "__test-empfehlungen-browser";
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
const ZIEL = mkdtempSync(path.join(tmpdir(), "passt-dazu-browser-"));

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

/** Italienische Karte mit Wein in zwei Größen (Variante wählbar). */
function karte() {
  const menu = italienischeBetriebskarte();
  const wein = menu.kategorien.find((k) => k.name === "Getränke").gruppen.find((g) => g.name === "Wein");
  wein.gerichte = [{ name: "Montepulciano", beschreibung: "Rotwein aus den Abruzzen", varianten: [{ name: "0,2 l", preis: 6.9 }, { name: "0,5 l", preis: 14.9 }] }];
  // Wie in einer freigegebenen Kundenfassung: alle Gerichte vom Kunden bestätigt.
  for (const kat of menu.kategorien) for (const g of [...(kat.gerichte ?? []), ...(kat.gruppen ?? []).flatMap((x) => x.gerichte)]) g.bestaetigt = true;
  return menu;
}

const KUNDEN_MEDIEN = { hero: { src: "medien/hero.jpg", herkunft: "eigen" }, haus: { src: "medien/haus.jpg", herkunft: "eigen" }, team: null, gericht: () => null };

const LEAD = { ...DEMO_LEADS.find((l) => l.kueche === "italienisch"), placeId: "passt-dazu-browser" };
const um = (hhmm) => new Date(`2026-09-24T${hhmm}:00+02:00`);
const sichtbareNamen = (tab) => tab.locator("#passt-dazu [data-passt-slot]:visible [data-passt=name]").allTextContents();
const post = (url, daten) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten) }).then((a) => a.json());

test("„Passt gut dazu“ im Browser: Vorschläge, Tastatur, Summe, Server, Abschalten, Handy, Demo, Dashboard", { timeout: 240_000 }, async (t) => {
  const browser = await starteBrowser();
  if (!browser) {
    t.skip("kein Chromium verfügbar");
    return;
  }
  speichereBetrieb(SLUG, { tische: [], reservierungen: [], bestellungen: [], pushSubscriptions: [] });
  // Wie beim Bau einer Kundenfassung: Katalog und Produkte an den Betrieb.
  const k = karteAusDaten(karte());
  setzeBestellkarte(SLUG, { katalog: k.katalog, produkte: empfehlungsProdukte(k), version: "b1", quelle: "test" });

  let wirtAufrufe = 0;
  const wirt = await starte((req, res) => {
    wirtAufrufe += 1;
    return handler(req, res);
  });
  let seite = null;
  try {
    // Der Wirt bevorzugt den Wein.
    assert.equal((await post(`${wirt.url}/intern/empfehlungen`, { priorisiert: ["montepulciano"] })).ok, true);
    schreibeSite({ lead: LEAD, kueche: "italienisch", optionen: { kundenfassung: true, fontCss: "", ausdruck: "gesellig", menu: karte(), medien: KUNDEN_MEDIEN, apiUrl: wirt.url } }, { zielDir: ZIEL, slug: "live" });
    seite = await starte(statisch(ZIEL));
    uhrHook.jetzt = () => um("17:00");

    const kontext = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 }, locale: "de-DE" });
    await kontext.clock.install({ time: um("17:00") });
    await kontext.clock.pauseAt(um("17:00"));
    const tab = await kontext.newPage();
    const fehler = [];
    tab.on("pageerror", (e) => fehler.push(e.message));
    await tab.goto(`${seite.url}/live/speisekarte/`, { waitUntil: "load" });

    // 1. Leerer Warenkorb: kein Modul, keine leere Box.
    await tab.locator("#cart-fab").evaluate((b) => b.click());
    assert.equal(await tab.locator("#passt-dazu").isVisible(), false);
    await tab.locator("#drawer-close").click();

    // 2. Pizza in den Warenkorb → höchstens zwei Ergänzungen, keine zweite Pizza.
    await tab.locator('main [data-add="margherita--26-cm"]').click();
    await tab.locator("#cart-fab").click();
    await tab.locator("#passt-dazu").waitFor({ state: "visible", timeout: 4000 });
    assert.deepEqual(await sichtbareNamen(tab), ["Montepulciano", "Bruschetta"], "bevorzugt vor Standard");
    assert.equal(await tab.locator("#passt-dazu [data-passt-slot]:visible").count(), 2);
    // Das Modul steht nach den Positionen und vor dem Formular – ohne etwas zu blockieren.
    const lage = await tab.evaluate(() => {
      const top = (id) => document.getElementById(id).getBoundingClientRect().top;
      return { zeilen: top("cart-lines"), modul: top("passt-dazu"), formular: top("order-form") };
    });
    assert.ok(lage.zeilen < lage.modul && lage.modul < lage.formular, JSON.stringify(lage));
    assert.equal(await tab.locator("#order-submit").isEnabled(), true, "Bestellen geht ohne jede Interaktion");
    assert.equal(await tab.locator("#fab-count").textContent(), "1", "nichts automatisch hinzugefügt");
    assert.equal(await tab.locator("#passt-dazu [data-passt=muster]").count(), 0, "echte Kundenseite: keine Muster-Marke");

    // 3. Tastatur: Variante wählen, dann Hinzufügen.
    const weinPlatz = tab.locator("#passt-dazu [data-passt-slot]").first();
    const wahl = weinPlatz.locator("select");
    assert.deepEqual(await wahl.locator("option").allTextContents(), ["0,2 l – 6,90 €", "0,5 l – 14,90 €"]);
    await wahl.focus();
    await tab.keyboard.press("ArrowDown");
    assert.equal(await wahl.inputValue(), "montepulciano--0-5-l");
    assert.equal(await weinPlatz.locator("[data-passt=preis]").textContent(), "14,90 €");
    await tab.keyboard.press("Tab");
    assert.equal(await tab.evaluate(() => document.activeElement.textContent), "Hinzufügen");
    assert.match(await tab.evaluate(() => document.activeElement.getAttribute("aria-label")), /Montepulciano \(0,5 l\), 14,90 €/);
    await tab.keyboard.press("Enter");
    await tab.waitForFunction(() => document.getElementById("fab-count").textContent === "2");
    assert.equal(await tab.locator("#cart-total").textContent(), "23,40 €", "8,50 € + 14,90 €");
    assert.match(await tab.locator(".cart-line-name").allTextContents().then((x) => x.join("|")), /Montepulciano \(0,5 l\)/);
    assert.equal(await tab.locator("#passt-dazu-status").textContent(), "Montepulciano (0,5 l) liegt jetzt im Warenkorb.");
    assert.equal(await tab.evaluate(() => document.activeElement.id), "passt-dazu-status", "Fokus geht nicht verloren");
    // Getränk erledigt → Vorspeise und Dessert; die Empfehlung bleibt nicht als Aufgabe stehen.
    assert.deepEqual(await sichtbareNamen(tab), ["Bruschetta", "Tiramisù"]);

    // 4. Maus: Dessert hinzufügen.
    await tab.locator("#passt-dazu [data-passt-slot]").nth(1).getByRole("button", { name: /Tiramisù/ }).click();
    await tab.waitForFunction(() => document.getElementById("fab-count").textContent === "3");
    assert.equal(await tab.locator("#cart-total").textContent(), "30,90 €");
    assert.deepEqual(await sichtbareNamen(tab), ["Bruschetta"]);

    // 5. Absenden wie bisher: Abholzeit, Name, Telefon.
    await tab.waitForFunction(() => document.querySelectorAll("#ord-abholzeit option").length > 2);
    await tab.locator("#ord-abholzeit").selectOption({ index: 2 });
    await tab.locator("#ord-name").fill("Gast Empfehlung");
    await tab.locator("#ord-telefon").fill("030 555 0606");
    await tab.locator("#order-submit").click();
    await tab.locator("#confirm-title").filter({ hasText: "Bestellung eingegangen" }).waitFor({ timeout: 4000 });
    const [b] = ladeBetrieb(SLUG).bestellungen;
    assert.deepEqual(b.positionen, [
      { id: "margherita--26-cm", name: "Margherita (Ø 26 cm)", menge: 1, preis: 8.5 },
      { id: "montepulciano--0-5-l", name: "Montepulciano (0,5 l)", menge: 1, preis: 14.9, empfohlen: true, empfohlenMenge: 1 },
      { id: "tiramisu", name: "Tiramisù", menge: 1, preis: 7.5, empfohlen: true, empfohlenMenge: 1 },
    ]);
    assert.equal(b.gesamt, 30.9);
    const wirkung = (await (await fetch(`${wirt.url}/api/empfehlungen`)).json()).statistik.gesamt;
    assert.equal(wirkung.mitEmpfehlung, 1);
    assert.equal(wirkung.wert, 22.4);
    // Nach der Bestellung: Warenkorb und Markierungen leer.
    assert.equal(await tab.evaluate(() => Object.keys(sessionStorage).filter((s) => s.startsWith("passt-dazu:")).map((s) => sessionStorage.getItem(s)).join()), "{}");
    await tab.locator("#confirm-close").click();

    // 6. Ohne Empfehlung bestellen: unverändert.
    await tab.locator('main [data-add="diavola"]').click();
    await tab.locator("#cart-fab").click();
    await tab.locator("#passt-dazu").waitFor({ state: "visible" });
    await tab.locator("#ord-abholzeit").selectOption({ index: 2 });
    await tab.locator("#ord-name").fill("Gast Ohne");
    await tab.locator("#ord-telefon").fill("030 555 0707");
    await tab.locator("#order-submit").click();
    await tab.locator("#confirm-title").filter({ hasText: "Bestellung eingegangen" }).waitFor({ timeout: 4000 });
    assert.deepEqual(ladeBetrieb(SLUG).bestellungen[1].positionen, [{ id: "diavola", name: "Diavola", menge: 1, preis: 11.9 }]);
    assert.deepEqual(fehler, []);
    await kontext.close();

    // 7. Wirt schaltet ab → kein Modul sichtbar (nach neuem Laden der Seite).
    await post(`${wirt.url}/intern/empfehlungen`, { aktiv: false });
    const aus = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const at = await aus.newPage();
    const geladen = at.waitForResponse((r) => r.url().endsWith("/oeffentlich/empfehlungen"));
    await at.goto(`${seite.url}/live/speisekarte/`, { waitUntil: "load" });
    await geladen;
    await at.locator('main [data-add="diavola"]').click();
    await at.locator("#cart-fab").click();
    await at.locator("#drawer.open").waitFor();
    assert.equal(await at.locator("#passt-dazu").isVisible(), false);
    assert.equal(await at.locator("#passt-dazu").evaluate((el) => el.getBoundingClientRect().height), 0, "keine leere Box");
    await aus.close();
    await post(`${wirt.url}/intern/empfehlungen`, { aktiv: true, priorisiert: ["montepulciano"] });

    // 8. Handy, 360 px: kompakt, kein seitliches Scrollen, große Tippflächen.
    const handy = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    const ht = await handy.newPage();
    await ht.goto(`${seite.url}/live/speisekarte/`, { waitUntil: "load" });
    await ht.locator('main [data-add="tagliatelle-al-ragu"]').tap();
    await ht.locator("#bar-order").tap();
    await ht.locator("#passt-dazu").waitFor({ state: "visible", timeout: 4000 });
    assert.deepEqual(await sichtbareNamen(ht), ["Montepulciano", "Bruschetta"], "Pasta: keine zweite Pasta");
    // Der Drawer gleitet herein – gemessen wird, wenn er steht.
    await ht.waitForFunction(() => Math.abs(document.getElementById("drawer").getBoundingClientRect().right - window.innerWidth) < 1);
    const mass = await ht.evaluate(() => {
      const body = document.querySelector(".drawer-body");
      const knoepfe = [...document.querySelectorAll("#passt-dazu [data-passt-slot]:not([hidden]) .passt-dazu-add")].map((k) => k.getBoundingClientRect());
      const box = document.getElementById("passt-dazu").getBoundingClientRect();
      return { ueberlauf: body.scrollWidth - body.clientWidth, rechts: box.right, hoehe: Math.min(...knoepfe.map((r) => r.height)), breite: Math.min(...knoepfe.map((r) => r.width)) };
    });
    assert.ok(mass.ueberlauf <= 0, `seitlicher Überlauf im Warenkorb: ${mass.ueberlauf}px`);
    assert.ok(mass.rechts <= 360, `Modul ragt rechts hinaus: ${mass.rechts}`);
    assert.ok(mass.hoehe >= 40 && mass.breite >= 44, `Tippfläche ${mass.breite}×${mass.hoehe}px`);
    await ht.locator("#passt-dazu [data-passt-slot]").nth(1).getByRole("button", { name: /Bruschetta/ }).tap();
    await ht.waitForFunction(() => document.getElementById("cart-total").textContent === "21,40 €");
    await ht.screenshot({ path: path.join(ZIEL, "handy-warenkorb.png") });
    await handy.close();

    // 9. Beispielseite ohne Betriebsserver: Muster gekennzeichnet, nichts wird verschickt.
    schreibeSite({ lead: LEAD, kueche: "italienisch", optionen: { fiktiv: true, veroeffentlicht: true, fontCss: "", ausdruck: "gesellig" } }, { zielDir: ZIEL, slug: "demo" });
    const vorher = { aufrufe: wirtAufrufe, bestellungen: ladeBetrieb(SLUG).bestellungen.length };
    const demo = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const dt = await demo.newPage();
    const anfragen = [];
    dt.on("request", (r) => { if (r.method() === "POST") anfragen.push(r.url()); });
    await dt.goto(`${seite.url}/demo/speisekarte/`, { waitUntil: "load" });
    // Nur eine Vorspeise im Korb (und keine Getränke auf der Musterkarte) ergäbe zu Recht nichts.
    await dt.locator('main [data-add="bruschetta-classica"]').click();
    await dt.locator("#cart-fab").click();
    await dt.locator("#drawer.open").waitFor();
    assert.equal(await dt.locator("#passt-dazu").isVisible(), false);
    await dt.locator("#drawer-close").click();
    await dt.locator('main [data-add="margherita"]').click();
    await dt.locator("#cart-fab").click();
    await dt.locator("#passt-dazu").waitFor({ state: "visible", timeout: 4000 });
    assert.ok((await dt.locator("#passt-dazu [data-passt-slot]:visible [data-passt=muster]").count()) >= 1, "Musterprodukte gekennzeichnet");
    assert.match(await dt.locator(".passt-dazu-muster").textContent(), /Beispielgerichten/);
    await dt.locator("#passt-dazu [data-passt-slot]:visible .passt-dazu-add").first().click();
    await dt.waitForFunction(() => document.getElementById("fab-count").textContent === "3");
    await dt.locator("#ord-abholzeit").selectOption({ index: 1 }).catch(() => {});
    await dt.locator("#ord-name").fill("Demo");
    await dt.locator("#ord-telefon").fill("030 1");
    if (await dt.locator("#ord-abholzeit").inputValue()) {
      await dt.locator("#order-submit").click();
      await dt.locator("#confirm-title").filter({ hasText: "Vorschau – nichts bestellt" }).waitFor({ timeout: 4000 });
    }
    assert.deepEqual(anfragen, [], "keine Anfrage an irgendeinen Server");
    assert.equal(wirtAufrufe, vorher.aufrufe);
    assert.equal(ladeBetrieb(SLUG).bestellungen.length, vorher.bestellungen);
    await demo.close();

    // 10. Wirt-Dashboard: Reiter „Empfehlungen“, Vorschau, ausschließen, speichern.
    const dash = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const wt = await dash.newPage();
    await wt.goto(`${wirt.url}/`, { waitUntil: "load" });
    await wt.getByRole("button", { name: "Empfehlungen", exact: true }).click();
    await wt.locator('[data-em-status="tiramisu"]').waitFor();
    await wt.locator("#em-test-wahl").selectOption("diavola");
    await wt.locator("#em-test-dazu").click();
    await wt.locator("#em-test-ergebnis .em-vorschlag").first().waitFor();
    assert.match(await wt.locator("#em-test-ergebnis").textContent(), /Montepulciano[\s\S]*Bevorzugt[\s\S]*Bruschetta[\s\S]*Standardregel/);
    await wt.locator('[data-em-status="montepulciano"]').selectOption("normal");
    // Per Tastatur: „Nie empfehlen“ ist die letzte Wahl.
    await wt.locator('[data-em-status="bruschetta"]').focus();
    await wt.keyboard.press("End");
    await wt.waitForFunction(() => /Tiramisù/.test(document.getElementById("em-test-ergebnis").textContent) && !/Bruschetta/.test(document.getElementById("em-test-ergebnis").textContent));
    assert.equal(await wt.evaluate(() => document.activeElement.getAttribute("data-em-status")), "bruschetta", "Fokus bleibt nach dem Neuzeichnen");
    await wt.locator("#em-speichern").click();
    await wt.locator("#toast.sichtbar").filter({ hasText: "Empfehlungen gespeichert" }).waitFor();
    assert.deepEqual(ladeBetrieb(SLUG).empfehlungen.ausgeschlossen, ["bruschetta"]);
    assert.deepEqual(ladeBetrieb(SLUG).empfehlungen.priorisiert, []);
    assert.match(await wt.locator("#em-wirkung").textContent(), /22,40 €/);
    await dash.close();
  } finally {
    await browser.close();
    wirt.server.close();
    seite?.server.close();
  }
});
