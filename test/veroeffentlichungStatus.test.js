import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { richteTestLeadsEin } from "./hilfen/testLead.js";
import { starteVeroeffentlichung, baueEntwurfHook, gitAufrufHook, abrufHook, pruefeOeffentlich, laeuftGerade } from "../src/veroeffentlichung.js";
import { demoEinstellungen, speichereDemoEinstellungen } from "../src/demoEinstellungen.js";
import { siteBaseUrl } from "../src/config.js";

// Veröffentlichen aus dem Dashboard: Der Status sagt nur "online", wenn die
// öffentliche URL nachweislich die neue Fassung (Build-ID) ausliefert.

const LEAD = { slug: "__test-status-0aaa111", placeId: "ChIJtestStatus01", name: "Trattoria Da Test", ort: "Altötting" };
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let umgebung;
before(() => { umgebung = richteTestLeadsEin([LEAD], "__test-status"); });
after(() => umgebung.aufraeumen());

const schnell = { taktMs: 1, grenzeMs: 50, warte: () => new Promise((r) => setTimeout(r, 1)) };

async function mit({ bau, git, abruf }, fn) {
  const alt = [baueEntwurfHook.aktuell, gitAufrufHook.aktuell, abrufHook.aktuell];
  baueEntwurfHook.aktuell = bau ?? (async (slug) => ({ slug, ordner: path.join(repoRoot, "docs", slug) }));
  gitAufrufHook.aktuell = git ?? (async (args) => ({ stdout: args[0] === "status" ? " M x\n" : "" }));
  abrufHook.aktuell = abruf ?? (async () => ({ status: 404, text: "" }));
  try { return await fn(); } finally { [baueEntwurfHook.aktuell, gitAufrufHook.aktuell, abrufHook.aktuell] = alt; }
}

test("Erfolg: baut → wird-veroeffentlicht → online erst, wenn die URL die neue Build-ID liefert", async () => {
  const gesehen = [];
  let abrufe = 0;
  await mit({
    abruf: async (url) => {
      abrufe += 1;
      gesehen.push(demoEinstellungen(LEAD.slug).status.zustand);
      const id = new URL(url).searchParams.get("pruefung");
      // Die ersten beiden Abrufe liefern noch die alte Fassung (Pages baut noch).
      return abrufe < 3 ? { status: 200, text: '<meta name="demo-build" content="alt">' } : { status: 200, text: `<meta name="demo-build" content="${id}">` };
    },
  }, async () => {
    const { buildId, fertig } = starteVeroeffentlichung(LEAD.slug, { pruefOptionen: { ...schnell, grenzeMs: 1000 } });
    assert.equal(laeuftGerade(LEAD.slug), true);
    const ende = await fertig;
    assert.equal(ende.zustand, "online");
    assert.equal(ende.online.buildId, buildId);
    assert.equal(ende.online.url, `${siteBaseUrl}/${LEAD.slug}/`);
  });
  assert.ok(gesehen.every((z) => z === "wird-veroeffentlicht"), "vor dem Nachweis nie 'online'");
  assert.equal(demoEinstellungen(LEAD.slug).status.zustand, "online");
  assert.equal(laeuftGerade(LEAD.slug), false);
});

test("Push gelungen, aber Seite kommt nicht an: Fehler statt Erfolgsmeldung; die zuletzt nachgewiesene Fassung bleibt vermerkt", async () => {
  const vorher = demoEinstellungen(LEAD.slug).status.online;
  await mit({}, async () => {
    const ende = await starteVeroeffentlichung(LEAD.slug, { pruefOptionen: schnell }).fertig;
    assert.equal(ende.zustand, "fehler");
    assert.match(ende.fehler, /liefert .* die neue Fassung noch nicht aus/);
    assert.deepEqual(ende.online, vorher);
  });
});

test("Baufehler: Fehler mit Ursache, kein Git-Befehl, Wiederholen möglich", async () => {
  const git = [];
  await mit({ bau: async () => { throw new Error("Nicht veröffentlicht: Der Name ist noch nicht bestätigt."); }, git: async (a) => { git.push(a); return { stdout: "" }; } }, async () => {
    const ende = await starteVeroeffentlichung(LEAD.slug, { pruefOptionen: schnell }).fertig;
    assert.equal(ende.zustand, "fehler");
    assert.equal(ende.schritt, "bauen");
    assert.match(ende.fehler, /Name ist noch nicht bestätigt/);
  });
  assert.equal(git.length, 0);
  assert.equal(laeuftGerade(LEAD.slug), false, "danach kann erneut gestartet werden");
});

test("je Demo nur ein Vorgang gleichzeitig; Speichern während des Baus überschreibt den Zustand nicht", async () => {
  let freigeben;
  const halt = new Promise((r) => { freigeben = r; });
  await mit({ bau: async (slug) => { await halt; return { slug, ordner: path.join(repoRoot, "docs", slug) }; } }, async () => {
    const lauf = starteVeroeffentlichung(LEAD.slug, { pruefOptionen: schnell });
    assert.throws(() => starteVeroeffentlichung(LEAD.slug), /läuft bereits/);
    const d = speichereDemoEinstellungen(LEAD.slug, { slogan: "Neu während des Baus" });
    assert.equal(d.status.zustand, "baut");
    assert.equal(d.status.geaendertWaehrendVorgang, true);
    freigeben();
    await lauf.fertig;
  });
});

test("pruefeOeffentlich: nur die exakte Build-ID zählt, Netzfehler werden überbrückt", async () => {
  let n = 0;
  await mit({ abruf: async () => { n += 1; if (n === 1) throw new Error("ECONNRESET"); return { status: 200, text: '<meta name="demo-build" content="b-42">' }; } }, async () => {
    assert.equal(await pruefeOeffentlich("https://x/y/", "b-42", schnell), true);
    assert.equal(await pruefeOeffentlich("https://x/y/", "b-4", schnell), false);
  });
});
