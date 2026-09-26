import { ladeEigeneMedien } from "../v2/assets-pipeline/mediaGenerator.js";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { richteTestLeadsEin } from "./hilfen/testLead.js";

// Ende-zu-Ende im echten Dashboard-Server mit Browser: Lead → Farbschema →
// Slogan → Speichern → Neuladen → „Konzept-Demo lokal bauen“ → Vorschau
// Desktop/Handy → Medienstatus → Präsentation im WLAN (QR) → beenden.
// Nichts landet in docs/, kein Git-Befehl läuft.

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEAD = { slug: "testdemo-panel-0ppp111", placeId: "ChIJtestPanel01", name: "Wirtshaus Zum Test", adresse: "Marktplatz 1, 84453 Mühldorf am Inn, Deutschland", telefon: "08631 4711", ort: "Mühldorf am Inn", rating: 4.2, anzahlBewertungen: 99 };
const VORSCHAU = path.join(REPO, "v2", "output", "leads", LEAD.slug);
const DOCS = path.join(REPO, "docs", LEAD.slug);

let umgebung;
before(() => {
  delete process.env.DASHBOARD_TOKEN;
  delete process.env.DASHBOARD_PASSWORT_HASH;
  process.env.PRAESENTATION_HOST = "127.0.0.1";
  process.env.PRAESENTATION_PORT = "0";
  umgebung = richteTestLeadsEin([LEAD], "__test-panel");
});
after(() => {
  umgebung.aufraeumen();
  rmSync(VORSCHAU, { recursive: true, force: true });
});

test("Demo-Panel: speichern übersteht Reload, lokaler Bau mit Vorschau Desktop/Handy, Medienstatus, Präsentation im WLAN – nichts öffentlich", { timeout: 240_000 }, async (t) => {
  const { starteBrowser } = await import("../v2/build/browser.js");
  const browser = await starteBrowser();
  if (!browser) return t.skip("kein Chromium verfügbar");
  const { handler } = await import("../src/dashboardServer.js");
  const v = await import("../src/veroeffentlichung.js");
  const { beendePraesentation } = await import("../src/praesentation.js");
  const git = [];
  const alt = v.gitAufrufHook.aktuell;
  v.gitAufrufHook.aktuell = async (args) => { git.push(args.join(" ")); return { stdout: "" }; };
  const server = createServer(handler);
  await new Promise((f) => server.listen(0, "127.0.0.1", f));
  const basis = `http://127.0.0.1:${server.address().port}`;
  const kontext = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await kontext.addInitScript(() => localStorage.setItem("dashboardToken", ""));
  const tab = await kontext.newPage();
  try {
    await tab.goto(`${basis}/bearbeiten.html?lead=${LEAD.slug}`);
    await tab.locator("#demo-form").waitFor({ timeout: 15_000 });
    assert.match(await tab.locator(".demo-panel h2").textContent(), /Wirtshaus Zum Test/);
    assert.equal(await tab.locator(".demo-schema").count(), 3, "genau drei Farbschemata");
    assert.match(await tab.locator("#demo-vorlage option:checked").textContent(), /Standard der Küche: Gesellig/);
    assert.equal(await tab.locator("#demo-veroeffentlichen").count(), 0, "kein Veröffentlichen-Knopf mehr");
    assert.match(await tab.locator("#demo-alt").textContent(), /Nie öffentlich/);
    assert.equal(await tab.locator("#demo-praes-start").isDisabled(), true, "Präsentation erst nach lokalem Bau");

    // Slogan + Farbschema speichern, Seite neu laden: bleibt erhalten.
    await tab.locator("#demo-slogan").fill("Wo man sich trifft");
    await tab.locator('.demo-schema:has(input[value="kellerstube"])').click();
    await tab.locator("#demo-speichern").click();
    await tab.locator("#demo-meldung").filter({ hasText: "Gespeichert." }).waitFor();
    await tab.reload();
    await tab.locator("#demo-form").waitFor();
    assert.equal(await tab.locator("#demo-slogan").inputValue(), "Wo man sich trifft");
    assert.equal(await tab.locator('input[name="farbschema"]:checked').getAttribute("value"), "kellerstube");

    // Lokal bauen: gewählte Vorlage, Schema, Slogan – keine Google-Note.
    await tab.locator("#demo-vorschau-bauen").click();
    await tab.locator("#demo-meldung").filter({ hasText: "Konzept-Demo lokal gebaut." }).waitFor({ timeout: 120_000 });
    const vorschau = readFileSync(path.join(VORSCHAU, "index.html"), "utf-8");
    assert.match(vorschau, /bayerisch--kellerstube/);
    assert.match(vorschau, /Wo man sich trifft/);
    assert.match(vorschau, /<meta name="demo-art" content="konzept">/);
    assert.doesNotMatch(vorschau, /(?<!\d)4,2(?!\d)|99 Bewertungen|auf Google/);
    assert.equal(await tab.locator("iframe.demo-rahmen").count(), 2, "Vorschau Desktop und Handy");
    await tab.frameLocator(".demo-rahmen").first().locator(".buehne-slogan").waitFor();
    await tab.frameLocator(".demo-rahmen--mobil").locator(".buehne-slogan").waitFor();

    // Medienstatus: alles aus dem Konzeptmaterial der Küche. Video Mobil genau
    // dann, wenn die Küche eines geliefert hat – sonst mit Hinweis.
    const medien = await tab.locator("#demo-medien").textContent();
    assert.match(medien, /Video Desktop \(quer\)vorhanden \(einmal\)Konzeptmaterial/);
    assert.match(medien, /Poster hochvorhanden/);
    // Der Test-Lead ist bayerisch (siehe Designsystem oben).
    if (ladeEigeneMedien()["beispiel-bayerisch"]?.heroVideoMobil) {
      assert.match(medien, /Video Mobil \(hoch\)vorhanden \(einmal\)Konzeptmaterial/);
      assert.doesNotMatch(await tab.locator(".demo-vorschau").textContent(), /Video Mobil fehlt/);
    } else {
      assert.match(medien, /Video Mobil \(hoch\)fehlt/);
      assert.match(await tab.locator(".demo-vorschau").textContent(), /Video Mobil fehlt – auf dem Handy steht das Hochformat-Poster/);
    }

    // Präsentation im WLAN: QR auf die Präsentationsadresse, erreichbar vom "Handy".
    await tab.locator("#demo-praes-start").click();
    await tab.locator("#demo-praes-stop").waitFor({ timeout: 15_000 });
    const url = await tab.locator("#demo-praes a").getAttribute("href");
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/[A-Za-z0-9_-]{16}\/$/);
    const qr = await fetch(`${basis}/api/qr?url=${encodeURIComponent(url)}`);
    assert.equal(qr.status, 200);
    assert.match(await qr.text(), /<svg/);
    assert.equal((await fetch(`${basis}/api/qr?url=${encodeURIComponent(`${basis}/v2/leads/${LEAD.slug}/`)}`)).status, 400, "kein QR auf localhost/Dashboard");
    const handy = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const ht = await handy.newPage();
    await ht.goto(url);
    assert.equal(await ht.locator(".buehne-slogan").textContent(), "Wo man sich trifft");
    assert.match(await ht.locator(".entwurf-hinweis").first().textContent(), /Konzept-Demo/);
    assert.equal((await fetch(`${url}bericht.json`)).status, 404, "interne Berichte werden nicht ausgeliefert");
    assert.equal((await fetch(url.replace(/\/[^/]+\/$/, "/beispiel-bayerisch/"))).status, 404, "nur diese eine Demo");

    // Beenden: Link tot.
    await tab.locator("#demo-praes-stop").click();
    await tab.locator("#demo-praes-start").waitFor();
    await handy.close();
    const nachher = await fetch(url).catch(() => ({ status: 0 }));
    assert.notEqual(nachher.status, 200);

    // Nichts öffentlich: kein docs/<slug>, kein Git, Veröffentlichen-Route 410.
    assert.equal(existsSync(DOCS), false);
    assert.deepEqual(git, []);
    const antwort = await fetch(`${basis}/intern/v2/demo/${LEAD.slug}/veroeffentlichen`, { method: "POST", headers: { "Content-Type": "application/json", Origin: basis }, body: "{}" });
    assert.equal(antwort.status, 410);
  } finally {
    await beendePraesentation();
    await browser.close();
    await new Promise((f) => server.close(f));
    v.gitAufrufHook.aktuell = alt;
  }
});
