import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, writeFileSync, mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Pilot im Browser: fiktiver Testkunde aus der italienischen Beispielseite,
// bearbeitet in der VORHANDENEN Bearbeiten-Ansicht (bearbeiten.html?kunde=…).
// Danach: Neuladen, lokal bauen, Vorschau Desktop/Mobile, Bestellung über den
// Wirt-Server mit dem neuen Preis. Vorher-/Nachher-Screenshots landen in
// KUNDEN_SCREENSHOTS (falls gesetzt), sonst in einem temporären Ordner.
// Ohne Chromium wird übersprungen.

const BETRIEB = "__test-kundeneditor";
process.env.BETRIEB = BETRIEB;
delete process.env.DASHBOARD_TOKEN;
delete process.env.DASHBOARD_PASSWORT_HASH;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..");
const { handler: dashboard } = await import("../src/dashboardServer.js");
const { handler: wirt } = await import("../src/wirtServer.js");
const store = await import("../src/betriebStore.js");
const kp = await import("../src/kundenProjekt.js");
const { projektAusBeispiel } = await import("../v2/integration/kundenDashboard.js");
const { KUNDEN_AUSGABE } = await import("../v2/integration/kundenBau.js");
const { starteBrowser } = await import("../v2/build/browser.js");
const { png } = await import("./hilfen/bilder.js");

const TMP = mkdtempSync(path.join(tmpdir(), "kundeneditor-"));
const BILDER = process.env.KUNDEN_SCREENSHOTS || path.join(TMP, "screenshots");
mkdirSync(BILDER, { recursive: true });
let projektId = "";
let andererId = "";

after(() => {
  for (const id of [projektId, andererId].filter(Boolean)) {
    rmSync(path.join(kp.KUNDEN_DIR, id), { recursive: true, force: true });
    rmSync(path.join(KUNDEN_AUSGABE, id), { recursive: true, force: true });
  }
  rmSync(path.join(REPO, "data", "betrieb", `${BETRIEB}.json`), { force: true });
  rmSync(TMP, { recursive: true, force: true });
});

function starte(h) {
  const s = createServer(h);
  return new Promise((f) => s.listen(0, "127.0.0.1", () => f({ s, url: `http://127.0.0.1:${s.address().port}` })));
}

function datei(name, inhalt) {
  const p = path.join(TMP, name);
  writeFileSync(p, inhalt);
  return p;
}

const um = (hhmm) => new Date(`2026-09-24T${hhmm}:00+02:00`);

test("Pilot: Testkunde in der vorhandenen Bearbeiten-Ansicht personalisieren, bauen, prüfen, bestellen", { timeout: 300_000 }, async (t) => {
  const browser = await starteBrowser();
  if (!browser) {
    t.skip("kein Chromium verfügbar");
    return;
  }
  store.uhrHook.jetzt = () => um("17:00");
  store.speichereBetrieb(BETRIEB, { tische: [], reservierungen: [], bestellungen: [] });
  store.legeTischAn(BETRIEB, { name: "T1", plaetze: 6 });
  const dash = await starte(dashboard);
  const wirtServer = await starte(wirt);
  const projekt = projektAusBeispiel("italienisch");
  projektId = projekt.id;
  const anderer = projektAusBeispiel("bayerisch");
  andererId = anderer.id;
  const andererVorher = readFileSync(path.join(kp.KUNDEN_DIR, andererId, "projekt.json"), "utf-8");
  const beispielVorher = readFileSync(path.join(REPO, "docs", "beispiel-italienisch", "index.html"), "utf-8");

  try {
    // Ein kurzes echtes WebM aus dem Browser (MediaRecorder) für das Hero-Video.
    const werkzeug = await browser.newPage();
    const webm = Buffer.from(await werkzeug.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 360;
      const x = c.getContext("2d");
      const r = new MediaRecorder(c.captureStream(10), { mimeType: "video/webm" });
      const teile = [];
      r.ondataavailable = (e) => teile.push(e.data);
      r.start();
      let i = 0;
      const takt = setInterval(() => { x.fillStyle = `hsl(${(i += 30)},60%,45%)`; x.fillRect(0, 0, 640, 360); }, 100);
      await new Promise((f) => setTimeout(f, 1200));
      await new Promise((f) => { r.onstop = f; r.stop(); });
      clearInterval(takt);
      return Array.from(new Uint8Array(await new Blob(teile).arrayBuffer()));
    }));
    await werkzeug.close();

    const kontext = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE" });
    const ed = await kontext.newPage();
    ed.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Frau Rossi" : undefined));
    const fehler = [];
    ed.on("pageerror", (e) => fehler.push(e.message));
    await ed.goto(`${dash.url}/bearbeiten.html?kunde=${projektId}`);
    await ed.locator("#kp-marke").waitFor({ timeout: 10_000 });
    assert.equal(await ed.locator("header h1").textContent(), "Kundenwebsite bearbeiten");
    assert.equal(await ed.locator(".modus .aktiv").textContent(), "Kundenwebsite");
    assert.equal(await ed.locator("#raster").isVisible(), false, "Lead-Bilderraster ist im Kundenmodus weg");
    assert.match(await ed.locator("#kp-gesperrt").textContent(), /Galerie:.*keine Galerie-Sektion/s);

    const meldung = (schluessel, muster) => ed.locator(`[data-rolle="${schluessel}"] .kp-ok, #${schluessel} .kp-ok`).filter({ hasText: muster }).first().waitFor({ timeout: 15_000 });
    async function speichereFeld(feld, wert) {
      const el = ed.locator(`[data-feld="${feld}"]`);
      await el.fill(wert);
      await ed.locator(`[data-speichern="${feld}"]`).click();
      await ed.locator(`#feld-${feld.replace(/\./g, "-")} .kp-ok`).waitFor({ timeout: 10_000 });
    }
    async function lade(rolle, pfad, uebernehmen = true) {
      await ed.locator(`input[data-upload="${rolle}"]`).setInputFiles(pfad);
      const karte = ed.locator(`[data-rolle="${rolle}"], [data-gericht="${rolle.slice(8)}"]`).first();
      await karte.locator(".kp-ok", { hasText: "Hochgeladen" }).waitFor({ timeout: 15_000 });
      if (uebernehmen) {
        await ed.locator(`button[data-medium="${rolle}"][data-was="uebernehmen"]`).click();
        await ed.locator(`[data-rolle="${rolle}"] .kp-ok, [data-gericht] .kp-ok`).filter({ hasText: "Übernommen" }).first().waitFor({ timeout: 10_000 });
      }
    }

    // Verknüpfung zum Wirt-Betrieb (für Warenkorb/Server) und erster Bau = „vorher“
    await speichereFeld("betriebSlug", BETRIEB);
    await speichereFeld("apiUrl", wirtServer.url);
    await ed.locator("#kp-bauen").click();
    await ed.locator(".kp-stufe", { hasText: "2 · Lokal gebaute Vorschau" }).filter({ hasNotText: "noch nicht" }).waitFor({ timeout: 60_000 });
    const vorher = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE", reducedMotion: "reduce" });
    const vp = await vorher.newPage();
    await vp.goto(`${dash.url}/intern/kunde/${projektId}/vorschau/`);
    await vp.screenshot({ path: path.join(BILDER, "vorher-desktop.png") });
    await vorher.close();
    const vorherMobil = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "de-DE", reducedMotion: "reduce" });
    const vm = await vorherMobil.newPage();
    await vm.goto(`${dash.url}/intern/kunde/${projektId}/vorschau/`);
    await vm.screenshot({ path: path.join(BILDER, "vorher-mobil.png") });
    await vorherMobil.close();
    const strukturVorher = readFileSync(path.join(KUNDEN_AUSGABE, projektId, "index.html"), "utf-8");

    // 1. Logo hinzufügen und austauschen
    await lade("logo", datei("logo1.png", png(480, 160, [30, 30, 30])));
    await lade("logo", datei("logo2.png", png(480, 160, [120, 20, 20])));
    assert.ok(await ed.locator('button[data-medium="logo"][data-was="zuruecksetzen"]').isVisible(), "altes Logo bleibt bis zur Freigabe");
    // Ein defektes Bild wird schon im Browser abgefangen
    await ed.locator('input[data-upload="haus"]').setInputFiles(datei("kaputt.png", Buffer.from("kein bild")));
    await ed.locator('[data-rolle="haus"] .kp-fehler').waitFor({ timeout: 10_000 });

    // 2. Slogan
    await speichereFeld("slogan", "Pasta wie bei Nonna Rosa");
    // 3. Hero: Desktop-Video und Mobile-Poster (dazu Desktop-Poster)
    await lade("hero", datei("hero.png", png(1600, 900, [40, 90, 60])));
    await lade("heroVideo", datei("hero.webm", webm));
    await lade("heroMobil", datei("hero-mobil.png", png(800, 1200, [90, 60, 40])));
    // 4. Weiteres Restaurantbild ersetzen (Haus-Band) – zweimal
    await lade("haus", datei("haus1.png", png(1400, 900, [200, 180, 150])));
    await lade("haus", datei("haus2.png", png(1400, 900, [150, 120, 90])));
    // 5. Gerichtbild ergänzen, Name und Preis ändern
    const gericht = kp.ladeProjekt(projektId).speisekarte.kategorien[0].gerichte[0];
    await lade(`gericht:${gericht.id}`, datei("gericht.png", png(900, 675, [220, 120, 60])));
    const zeile = ed.locator(`[data-gericht="${gericht.id}"]`);
    await zeile.locator('[data-g="name"]').fill("Pizza Nonna Rosa");
    await zeile.locator('[data-g="preis"]').fill("14,20");
    await zeile.locator('[data-g="allergene"]').fill("A, G");
    await ed.locator(`[data-gericht-speichern="${gericht.id}"]`).click();
    await ed.locator(`[data-gericht="${gericht.id}"] .kp-ok`, { hasText: "Gericht gespeichert" }).waitFor({ timeout: 10_000 });
    // 6. Öffnungszeiten
    await ed.locator("#kp-zeiten").fill("Mo–So | 11:30–14:00 & 17:00–22:30");
    await ed.locator("#kp-ausnahmen").fill("24.12. | geschlossen");
    await ed.locator("#kp-zeiten-speichern").click();
    await ed.locator("#feld-oeffnungszeiten .kp-ok").waitFor({ timeout: 10_000 });

    // 7. Neu laden – alles ist noch da
    await ed.reload();
    await ed.locator("#kp-marke").waitFor({ timeout: 10_000 });
    assert.equal(await ed.locator('[data-feld="slogan"]').inputValue(), "Pasta wie bei Nonna Rosa");
    assert.equal(await ed.locator(`[data-gericht="${gericht.id}"] [data-g="name"]`).inputValue(), "Pizza Nonna Rosa");
    assert.equal(await ed.locator(`[data-gericht="${gericht.id}"] [data-g="preis"]`).inputValue(), "14,20");
    assert.match(await ed.locator("#kp-zeiten").inputValue(), /Mo–So \| 11:30–14:00 & 17:00–22:30/);
    assert.ok(await ed.locator('[data-rolle="logo"] img').isVisible());

    // 8. Nur diese Kundenwebsite lokal bauen
    await ed.locator("#kp-bauen").click();
    await ed.locator("#kp-marke").waitFor();
    await ed.locator(".kp-ok", { hasText: "Lokal gebaut" }).waitFor({ timeout: 60_000 });
    assert.equal(await ed.locator("#kp-vorschau iframe").count(), 2, "Desktop- und Mobile-Vorschau");
    await ed.screenshot({ path: path.join(BILDER, "editor.png"), fullPage: false });
    assert.deepEqual(fehler, [], "keine Skriptfehler im Editor");

    // 9. Vorschau Desktop und Mobile: Start- und Speisekarten-Seite mit denselben Daten
    for (const [name, optionen] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["mobil", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
      const k = await browser.newContext({ ...optionen, locale: "de-DE", reducedMotion: "reduce", timezoneId: "Europe/Berlin" });
      await k.clock.install({ time: um("17:00") });
      await k.clock.pauseAt(um("17:00"));
      const s = await k.newPage();
      await s.goto(`${dash.url}/intern/kunde/${projektId}/vorschau/`);
      assert.equal(await s.locator(".kopf-logo").getAttribute("src"), "medien/logo.png", name);
      assert.match(await s.locator(".buehne-slogan, .titelblatt-slogan").first().textContent(), /Pasta wie bei Nonna Rosa/);
      const startHtml = await s.content();
      assert.match(startHtml, /medien\/hero\.png/);
      assert.match(startHtml, /medien\/heroVideo\.webm|medien\/heroVideo/);
      assert.match(startHtml, /medien\/haus\.png/);
      assert.match(startHtml, /17:00–22:30/);
      assert.match(startHtml, /24\.12\./);
      assert.doesNotMatch(startHtml, /data-feld=|kunden-panel|\/intern\/kunde\/[^"]*\/aktion|contenteditable/);
      await s.screenshot({ path: path.join(BILDER, `nachher-${name}.png`) });
      await s.goto(`${dash.url}/intern/kunde/${projektId}/vorschau/speisekarte/`);
      const karteHtml = await s.content();
      assert.match(karteHtml, /Pizza Nonna Rosa/);
      assert.match(karteHtml, /14,20/);
      assert.match(karteHtml, /Allergene\/Zusatzstoffe:<\/span> A, G/);
      assert.match(karteHtml, /\.\.\/medien\/logo\.png/);
      if (name === "desktop") {
        // Warenkorb: dasselbe Gericht, derselbe Preis – bis zum Server
        await s.locator(`#gericht-${gericht.id} [data-add]`).first().click();
        await s.locator("#drawer.open, .cart-status").first().waitFor({ timeout: 5000 });
        if (!(await s.locator("#drawer.open").count())) await s.locator("#cart-fab").click();
        await s.locator("#drawer.open").waitFor({ timeout: 5000 });
        assert.match(await s.locator("#cart-lines").textContent(), /Pizza Nonna Rosa[\s\S]*14,20/);
        await s.waitForFunction(() => document.querySelectorAll("#ord-abholzeit option").length > 2);
        await s.locator("#ord-abholzeit").selectOption({ label: "18:30 Uhr" });
        await s.locator("#ord-name").fill("Pilot Gast");
        await s.locator("#ord-telefon").fill("0170 1234567");
        await s.locator("#order-submit").click();
        await s.locator("#confirm.open").waitFor({ timeout: 8000 });
        assert.equal(await s.locator("#confirm-title").textContent(), "Bestellung eingegangen", await s.locator("#confirm-text").textContent());
        const best = store.ladeBetrieb(BETRIEB).bestellungen.at(-1);
        assert.equal(best.gesamt, 14.2);
        assert.deepEqual(best.positionen, [{ id: gericht.id, name: "Pizza Nonna Rosa", menge: 1, preis: 14.2 }]);
      }
      await k.close();
    }

    // 10. Layout strukturell unverändert, andere Kunden und Beispielseite unberührt
    // Sektionen (Tag, erste Klasse, id) in Reihenfolge. „Auf dem Tisch“ (#highlights)
    // zeigt die Vorlage erst, wenn ein Gericht ein Bild hat – ihre eigene Regel.
    const skelett = (h) =>
      [...h.matchAll(/<(section|header|footer|main)\b([^>]*)>/g)]
        .map((m) => `${m[1]}.${(/class="([^" ]+)/.exec(m[2]) ?? [])[1] ?? ""}#${(/\sid="([^"]+)"/.exec(m[2]) ?? [])[1] ?? ""}`)
        .filter((x) => !/^section\.sektion#highlights$|^header\.tisch-kopf#$/.test(x));
    const nachher = readFileSync(path.join(KUNDEN_AUSGABE, projektId, "index.html"), "utf-8");
    assert.deepEqual(skelett(nachher), skelett(strukturVorher), "gleiche Sektionen in gleicher Reihenfolge");
    assert.match(nachher, /id="highlights"/, "mit Gerichtbild erscheint der vorgesehene Tisch-Abschnitt");
    assert.equal(readFileSync(path.join(kp.KUNDEN_DIR, andererId, "projekt.json"), "utf-8"), andererVorher);
    assert.equal(readFileSync(path.join(REPO, "docs", "beispiel-italienisch", "index.html"), "utf-8"), beispielVorher);
    await kontext.close();
  } finally {
    dash.s.close();
    wirtServer.s.close();
    await browser.close();
  }
});
