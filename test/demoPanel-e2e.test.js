import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { rmSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { richteTestLeadsEin } from "./hilfen/testLead.js";

// Ende-zu-Ende im echten Dashboard-Server mit Browser: Lead → Küche →
// Farbschema → Slogan → Speichern → Neuladen → Vorschau → Veröffentlichen →
// Status "online" erst nach nachgewiesener Auslieferung. Git und GitHub Pages
// sind simuliert (Hooks); gebaut wird echt.

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEAD = { slug: "testdemo-panel-0ppp111", placeId: "ChIJtestPanel01", name: "Wirtshaus Zum Test", adresse: "Marktplatz 1, 84453 Mühldorf am Inn, Deutschland", telefon: "08631 4711", ort: "Mühldorf am Inn", rating: 4.2, anzahlBewertungen: 99 };
const VORSCHAU = path.join(REPO, "v2", "output", "leads", LEAD.slug);
const DOCS = path.join(REPO, "docs", LEAD.slug);

let umgebung;
before(() => {
  delete process.env.DASHBOARD_TOKEN;
  delete process.env.DASHBOARD_PASSWORT_HASH;
  umgebung = richteTestLeadsEin([LEAD], "__test-panel");
});
after(() => {
  umgebung.aufraeumen();
  rmSync(VORSCHAU, { recursive: true, force: true });
  rmSync(DOCS, { recursive: true, force: true });
});

test("Demo-Panel: speichern übersteht Reload, Vorschau zeigt Wahl, Veröffentlichen meldet erst nach Nachweis 'online'", { timeout: 240_000 }, async (t) => {
  const { starteBrowser } = await import("../v2/build/browser.js");
  const browser = await starteBrowser();
  if (!browser) return t.skip("kein Chromium verfügbar");
  const { handler } = await import("../src/dashboardServer.js");
  const v = await import("../src/veroeffentlichung.js");
  const git = [];
  const alt = [v.gitAufrufHook.aktuell, v.abrufHook.aktuell];
  v.gitAufrufHook.aktuell = async (args) => { git.push(args.join(" ")); return { stdout: args[0] === "status" ? " M docs\n" : "" }; };
  // "GitHub Pages": liefert genau das aus, was gerade in docs/<slug> liegt.
  v.abrufHook.aktuell = async () => ({ status: 200, text: existsSync(path.join(DOCS, "index.html")) ? readFileSync(path.join(DOCS, "index.html"), "utf-8") : "" });
  const server = createServer(handler);
  await new Promise((f) => server.listen(0, "127.0.0.1", f));
  const basis = `http://127.0.0.1:${server.address().port}`;
  const kontext = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await kontext.addInitScript(() => localStorage.setItem("dashboardToken", ""));
  const tab = await kontext.newPage();
  tab.on("dialog", (d) => d.accept());
  try {
    await tab.goto(`${basis}/bearbeiten.html?lead=${LEAD.slug}`);
    await tab.locator("#demo-form").waitFor({ timeout: 15_000 });
    assert.match(await tab.locator(".demo-panel h2").textContent(), /Wirtshaus Zum Test/);
    assert.equal(await tab.locator(".demo-schema").count(), 3, "genau drei Farbschemata");
    assert.match(await tab.locator("#demo-vorlage option:checked").textContent(), /Standard der Küche: Gesellig/);

    // Slogan + Farbschema speichern, Seite neu laden: bleibt erhalten.
    await tab.locator("#demo-slogan").fill("Wo man sich trifft");
    await tab.locator('.demo-schema:has(input[value="kellerstube"])').click();
    await tab.locator("#demo-speichern").click();
    await tab.locator("#demo-meldung").filter({ hasText: "Gespeichert." }).waitFor();
    await tab.reload();
    await tab.locator("#demo-form").waitFor();
    assert.equal(await tab.locator("#demo-slogan").inputValue(), "Wo man sich trifft");
    assert.equal(await tab.locator('input[name="farbschema"]:checked').getAttribute("value"), "kellerstube");

    // Ohne bestätigten Namen: Veröffentlichen gesperrt, mit Begründung.
    assert.equal(await tab.locator("#demo-veroeffentlichen").isDisabled(), true);
    assert.match(await tab.locator(".demo-hindernis").textContent(), /Name ist noch nicht bestätigt/);
    const nameZeile = tab.locator('.demo-angabe[data-feld="name"]');
    await nameZeile.locator("[data-notiz]").fill("Impressum der Facebook-Seite");
    await nameZeile.locator("[data-bestaetigen]").click();
    await tab.locator('.demo-angabe.bestaetigt[data-feld="name"]').waitFor();
    assert.equal(await tab.locator("#demo-veroeffentlichen").isDisabled(), false);

    // Vorschau: gewählte Vorlage, Schema, Slogan – keine Google-Note.
    await tab.locator("#demo-vorschau-bauen").click();
    await tab.locator("#demo-meldung").filter({ hasText: "Vorschau gebaut." }).waitFor({ timeout: 120_000 });
    const vorschau = readFileSync(path.join(VORSCHAU, "index.html"), "utf-8");
    assert.match(vorschau, /bayerisch--kellerstube/);
    assert.match(vorschau, /Wo man sich trifft/);
    assert.doesNotMatch(vorschau, /(?<!\d)4,2(?!\d)|99 Bewertungen/);
    await tab.frameLocator(".demo-rahmen").locator(".buehne-slogan").waitFor();

    // Veröffentlichen: Status läuft, dann online mit URL – erst nach Nachweis.
    await tab.locator("#demo-veroeffentlichen").click();
    await tab.locator("#demo-status.ok").waitFor({ timeout: 120_000 });
    const status = await tab.locator("#demo-status").textContent();
    assert.match(status, /Online/);
    assert.match(status, new RegExp(`${LEAD.slug}/`));
    assert.ok(git.some((g) => g.startsWith("commit")) && git.includes("push"), "commit und push liefen");
    assert.match(readFileSync(path.join(DOCS, "index.html"), "utf-8"), /Wo man sich trifft/);

    // "Öffentliche URL" (statischer Server auf docs/) im Browser: erste Fassung.
    const oeffentlich = createServer((req, res) => {
      const datei = path.join(REPO, "docs", decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
      if (!datei.startsWith(path.join(REPO, "docs")) || !existsSync(datei)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": datei.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream" });
      res.end(readFileSync(datei));
    });
    await new Promise((f) => oeffentlich.listen(0, "127.0.0.1", f));
    const demoUrl = `http://127.0.0.1:${oeffentlich.address().port}/${LEAD.slug}/`;
    const gast = await kontext.newPage();
    await gast.goto(demoUrl);
    assert.equal(await gast.locator(".buehne-slogan").textContent(), "Wo man sich trifft");

    // Slogan und Farbschema nach Veröffentlichung ändern → neu veröffentlichen → öffentliche Fassung neu.
    await tab.locator('.demo-schema:has(input[value="biergarten"])').click();
    await tab.locator("#demo-slogan").fill("Neuer Slogan nach dem Livegang");
    await tab.locator("#demo-veroeffentlichen").click();
    await tab.locator("#demo-status.laeuft, #demo-status.ok").first().waitFor();
    await tab.waitForFunction(() => /Online/.test(document.getElementById("demo-status")?.textContent ?? "") && !document.getElementById("demo-veroeffentlichen").disabled, null, { timeout: 120_000 });
    assert.match(readFileSync(path.join(DOCS, "index.html"), "utf-8"), /Neuer Slogan nach dem Livegang/);
    await gast.reload();
    assert.equal(await gast.locator(".buehne-slogan").textContent(), "Neuer Slogan nach dem Livegang");
    assert.equal(await gast.locator('meta[name="v2-designsystem"]').getAttribute("content"), "bayerisch--biergarten");
    assert.match(await gast.locator(".entwurf-hinweis").first().textContent(), /Konzept-Demo/);
    await new Promise((f) => oeffentlich.close(f));
  } finally {
    await browser.close();
    await new Promise((f) => server.close(f));
    [v.gitAufrufHook.aktuell, v.abrufHook.aktuell] = alt;
  }
});
